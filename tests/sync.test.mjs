// tests/sync.test.mjs — tests du générateur, runner INTÉGRÉ de Node (zéro dépendance).
// Lancer :  npm test     (ou directement :  node --test)
// Chaque test lance le vrai CLI dans un dossier temporaire et vérifie fichiers + avertissements.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SYNC = resolve(here, '..', 'tools', 'sync-ai.mjs');

function sync(extraArgs, cwd) {
  const dir = cwd || mkdtempSync(join(tmpdir(), 'aicore-'));
  const r = spawnSync(process.execPath, [SYNC, ...extraArgs], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `sync a échoué (code ${r.status}) :\n${r.stderr}`);
  return { dir, out: r.stdout || '', err: r.stderr || '' };
}
const clean = (d) => rmSync(d, { recursive: true, force: true });
function withCheckCommand(dir) {
  mkdirSync(join(dir, '.ai', 'commands', 'check'), { recursive: true });
  writeFileSync(join(dir, '.ai', 'commands', 'check', 'command.md'), '---\ndescription: check\n---\nVérifs :\n\n{{stacks}}\n\n## Fin\nrésume.\n');
  writeFileSync(join(dir, '.ai', 'commands', 'check', 'dotnet.md'), '## Back\n- dotnet test (BaseOutputPath isolé)\n');
  writeFileSync(join(dir, '.ai', 'commands', 'check', 'react.md'), '## Front\n- vitest --run\n');
}

test('modèles : --models copilot ne génère QUE .github (ni CLAUDE ni GEMINI)', () => {
  const { dir } = sync(['--models', 'copilot']);
  assert.ok(existsSync(join(dir, '.github', 'copilot-instructions.md')), 'copilot-instructions manquant');
  assert.ok(!existsSync(join(dir, 'CLAUDE.md')), 'CLAUDE.md ne devrait pas exister');
  assert.ok(!existsSync(join(dir, 'GEMINI.md')), 'GEMINI.md ne devrait pas exister');
  clean(dir);
});

test('alias : --models claude est accepté comme anthropic (génère CLAUDE.md)', () => {
  const { dir } = sync(['--models', 'claude']);
  assert.ok(existsSync(join(dir, 'CLAUDE.md')), 'l\'alias claude→anthropic doit générer CLAUDE.md');
  clean(dir);
});

test('stacks : --stacks dotnet produit dotnet.instructions.md avec applyTo en ligne 1', () => {
  const { dir } = sync(['--models', 'copilot', '--stacks', 'dotnet']);
  const f = join(dir, '.github', 'instructions', 'dotnet.instructions.md');
  assert.ok(existsSync(f), 'dotnet.instructions.md manquant');
  assert.match(readFileSync(f, 'utf8'), /^---\r?\napplyTo:/, 'le frontmatter applyTo doit rester en tête');
  clean(dir);
});

test('zone managée : un re-sync préserve la zone libre et ne duplique pas le bloc', () => {
  const { dir } = sync(['--models', 'anthropic']);
  const claude = join(dir, 'CLAUDE.md');
  writeFileSync(claude, 'MANUEL-HAUT\n\n' + readFileSync(claude, 'utf8') + '\nMANUEL-BAS\n');
  sync(['--models', 'anthropic'], dir);
  const after = readFileSync(claude, 'utf8');
  assert.match(after, /MANUEL-HAUT/, 'zone libre du haut perdue');
  assert.match(after, /MANUEL-BAS/, 'zone libre du bas perdue');
  assert.equal((after.match(/ai-core:start/g) || []).length, 1, 'le bloc managé a été dupliqué');
  clean(dir);
});

test('garde anti-collision : un stack et un context de même nom → avertissement', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  mkdirSync(join(dir, '.ai', 'contexts'), { recursive: true });
  writeFileSync(join(dir, '.ai', 'contexts', 'dotnet.md'), '---\ncontext: dotnet\n---\n# dup\n- règle.\n');
  const { err } = sync(['--stacks', 'dotnet', '--models', 'copilot'], dir);
  assert.match(err, /collision/i, 'la collision stack/context doit être signalée');
  clean(dir);
});

test('orphelins : un modèle dé-sélectionné est PROPOSÉ à la suppression, pas supprimé', () => {
  const { dir } = sync(['--models', 'anthropic,gemini']);
  assert.ok(existsSync(join(dir, 'GEMINI.md')));
  const { err } = sync(['--models', 'anthropic'], dir);
  assert.match(err, /[Oo]rphelin/, 'GEMINI.md devrait être signalé orphelin');
  assert.ok(existsSync(join(dir, 'GEMINI.md')), 'le sync ne doit JAMAIS supprimer tout seul');
  clean(dir);
});

test('intégrité des marqueurs : un bloc malformé est ignoré (pas de duplication)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  writeFileSync(join(dir, 'CLAUDE.md'), '# CLAUDE.md\n\n<!-- ai-core:start -->\nbloc sans fin\n');
  const { err } = sync(['--models', 'anthropic'], dir);
  assert.match(err, /malform/i, 'les marqueurs malformés doivent être signalés');
  const after = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.equal((after.match(/ai-core:start/g) || []).length, 1, 'ne doit pas ajouter un 2e bloc');
  clean(dir);
});

test('lisibilité : sommaire navigable + provenance, uniformément (Claude + Copilot)', () => {
  const { dir } = sync([]);
  const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /## Sommaire/, 'sommaire absent de CLAUDE.md');
  assert.match(claude, /- \[.+\]\(#.+\)/, 'le sommaire doit être navigable (liens vers ancres)');
  assert.match(claude, /─────/, 'marqueurs de provenance absents de CLAUDE.md');
  const copilot = readFileSync(join(dir, '.github', 'copilot-instructions.md'), 'utf8');
  assert.match(copilot, /## Sommaire/, 'sommaire absent de copilot-instructions (interop cassée)');
  clean(dir);
});

test('commande cœur : /deliberate est générée pour Claude', () => {
  const { dir } = sync(['--models', 'anthropic']);
  const f = join(dir, '.claude', 'commands', 'deliberate.md');
  assert.ok(existsSync(f), '.claude/commands/deliberate.md manquant');
  assert.match(readFileSync(f, 'utf8'), /réfuteur/i, 'le corps de /deliberate semble vide');
  clean(dir);
});

test('commande additive : /check assemble les fragments des stacks sélectionnées', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  withCheckCommand(dir);
  sync(['--models', 'anthropic', '--stacks', 'dotnet,react'], dir);
  let check = readFileSync(join(dir, '.claude', 'commands', 'check.md'), 'utf8');
  assert.match(check, /Back/, 'fragment dotnet manquant');
  assert.match(check, /Front/, 'fragment react manquant (additif cassé)');
  sync(['--models', 'anthropic', '--stacks', 'dotnet'], dir);
  check = readFileSync(join(dir, '.claude', 'commands', 'check.md'), 'utf8');
  assert.match(check, /Back/, 'fragment dotnet manquant');
  assert.doesNotMatch(check, /Front/, 'react ne doit PAS être inclus si non sélectionné (additif)');
  clean(dir);
});

test('composition de techno : fragments composés selon les stacks (présence, ordre, sélectivité, position)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  const cmd = join(dir, '.ai', 'commands', 'build');
  mkdirSync(cmd, { recursive: true });
  writeFileSync(join(cmd, 'command.md'), '---\ndescription: build\n---\nPRE-MARKER\n\n{{stacks}}\n\nPOST-MARKER\n');
  writeFileSync(join(cmd, 'dotnet.md'), 'FRAG-DOTNET\n');
  writeFileSync(join(cmd, 'react.md'), 'FRAG-REACT\n');
  writeFileSync(join(cmd, 'python.md'), 'FRAG-PYTHON\n');
  const out = join(dir, '.claude', 'commands', 'build.md');

  // 3 technos → composition complète
  sync(['--models', 'anthropic', '--stacks', 'dotnet,react,python'], dir);
  let s = readFileSync(out, 'utf8');
  for (const f of ['FRAG-DOTNET', 'FRAG-REACT', 'FRAG-PYTHON']) assert.match(s, new RegExp(f), `${f} manquant`);
  // ordre = tri des fragments (dotnet < python < react)
  assert.ok(s.indexOf('FRAG-DOTNET') < s.indexOf('FRAG-PYTHON') && s.indexOf('FRAG-PYTHON') < s.indexOf('FRAG-REACT'), 'ordre des fragments incorrect');
  // position : injectés à la place de {{stacks}}, entre PRE et POST
  assert.ok(s.indexOf('PRE-MARKER') < s.indexOf('FRAG-DOTNET') && s.indexOf('FRAG-REACT') < s.indexOf('POST-MARKER'), 'fragments mal positionnés');

  // sous-ensemble → seules les stacks choisies se composent
  sync(['--models', 'anthropic', '--stacks', 'dotnet,python'], dir);
  s = readFileSync(out, 'utf8');
  assert.match(s, /FRAG-DOTNET/); assert.match(s, /FRAG-PYTHON/);
  assert.doesNotMatch(s, /FRAG-REACT/, 'react ne doit pas être composé si non sélectionné');
  clean(dir);
});

test('catalogue : --list imprime les modèles et les commandes cœur', () => {
  const { dir, out } = sync(['--list']);
  assert.match(out, /anthropic/, 'modèles absents du catalogue');
  assert.match(out, /deliberate/, 'commandes cœur absentes du catalogue');
  clean(dir);
});

test('aide : --help imprime l\'usage ; --config suggère le bloc package.json', () => {
  const a = sync(['--help']);
  assert.match(a.out, /Usage/, '--help doit imprimer l\'usage');
  const b = sync(['--config']);
  assert.match(b.out, /"ai-core"/, '--config doit suggérer le bloc ai-core');
  assert.match(b.out, /"stacks"/, '--config doit proposer des stacks');
  clean(a.dir); clean(b.dir);
});

test('défaut sain : sans config ni techno détectée → AUCUNE stack (pas "toutes")', () => {
  const { dir } = sync(['--models', 'copilot']); // dossier temp vide → rien à détecter
  assert.ok(!existsSync(join(dir, '.github', 'instructions', 'dotnet.instructions.md')), 'aucune stack ne doit être injectée sans config ni détection');
  clean(dir);
});

test('défaut sain : un .csproj présent → stack dotnet auto-détectée', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  writeFileSync(join(dir, 'app.csproj'), '<Project></Project>\n');
  sync(['--models', 'copilot'], dir);
  assert.ok(existsSync(join(dir, '.github', 'instructions', 'dotnet.instructions.md')), 'dotnet aurait dû être auto-détectée via .csproj');
  clean(dir);
});
