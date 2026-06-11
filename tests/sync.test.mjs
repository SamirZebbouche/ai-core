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

test('--conventions : liste les conventions injectées (cœur) ET repère les docs de convention', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  writeFileSync(join(dir, 'LEXIQUE.md'), '# Lexique\n');
  const { out } = sync(['--conventions'], dir);
  assert.match(out, /Méthode de travail IA/, 'doit citer la convention method.md (cœur)');
  assert.match(out, /Principes d'architecture/, 'doit citer architecture-principles');
  assert.match(out, /LEXIQUE\.md/, 'doit repérer le doc de convention LEXIQUE.md');
  clean(dir);
});

test('garde-fou : une option inconnue échoue (ne lance PAS le sync) et suggère', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  const r = spawnSync(process.execPath, [SYNC, '--convention'], { cwd: dir, encoding: 'utf8' }); // typo
  assert.notEqual(r.status, 0, 'une option inconnue doit faire échouer');
  assert.match(r.stderr, /inconnue/i, 'doit signaler l\'option inconnue');
  assert.match(r.stderr, /--conventions/, 'doit suggérer --conventions');
  assert.ok(!existsSync(join(dir, 'CLAUDE.md')), 'le sync ne doit PAS avoir écrit de fichier');
  clean(dir);
});

test('auto-suffisance : aucune convention ne référence un fichier-source du cœur (lien mort une fois inliné/scopé)', () => {
  const { dir } = sync(['--models', 'anthropic,copilot', '--stacks', 'dotnet']);
  const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  const dotnet = readFileSync(join(dir, '.github', 'instructions', 'dotnet.instructions.md'), 'utf8');
  for (const [name, content] of [['CLAUDE.md', claude], ['dotnet.instructions.md', dotnet]]) {
    assert.doesNotMatch(content, /\]\((method\.md|global\.md|meta\/|stacks\/)/, `${name} : lien-fichier vers le cœur (mort chez le consommateur)`);
    assert.doesNotMatch(content, /cf\.\s*`?meta\//, `${name} : référence meta/ par chemin (morte)`);
  }
  clean(dir);
});

test('--import-commands : aspire les commandes natives vers .ai/commands/ (skip les générées)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  mkdirSync(join(dir, '.claude', 'commands'), { recursive: true });
  writeFileSync(join(dir, '.claude', 'commands', 'check.md'), '---\ndescription: ma check\n---\nLance les tests.\n');
  writeFileSync(join(dir, '.claude', 'commands', 'deliberate.md'), '<!-- GÉNÉRÉ par ai-core/tools/sync-ai -->\nblabla\n');
  sync(['--import-commands'], dir);
  assert.ok(existsSync(join(dir, '.ai', 'commands', 'check', 'command.md')), 'check doit être importé');
  assert.match(readFileSync(join(dir, '.ai', 'commands', 'check', 'command.md'), 'utf8'), /Lance les tests/);
  assert.ok(!existsSync(join(dir, '.ai', 'commands', 'deliberate')), 'une commande générée ne doit pas être importée');
  // non destructif : 2e run n'écrase pas
  const r2 = sync(['--import-commands'], dir);
  assert.match(r2.out, /Déjà présentes|Aucune/, 'non destructif au 2e passage');
  clean(dir);
});

test('aide : --help imprime l\'usage ; --detect-config affiche le bloc package.json', () => {
  const a = sync(['--help']);
  assert.match(a.out, /Usage/, '--help doit imprimer l\'usage');
  const b = sync(['--detect-config']);
  assert.match(b.out, /"ai-core"/, '--detect-config doit afficher le bloc ai-core');
  assert.match(b.out, /"stacks"/, '--detect-config doit proposer des stacks');
  clean(a.dir); clean(b.dir);
});

test('--config crée le bloc, puis AJOUTE additivement les stacks détectées en préservant models', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo' }, null, 2) + '\n');
  writeFileSync(join(dir, 'app.csproj'), '');
  // 1) création
  sync(['--config'], dir);
  let pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.deepEqual(pkg['ai-core'].stacks, ['dotnet']);
  // l'utilisateur restreint ses models
  pkg['ai-core'].models = ['anthropic'];
  writeFileSync(join(dir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  // 2) un front react apparaît → --config AJOUTE react, PRÉSERVE models
  mkdirSync(join(dir, 'src', 'front'), { recursive: true });
  writeFileSync(join(dir, 'src', 'front', 'package.json'), JSON.stringify({ dependencies: { react: '^18' } }));
  sync(['--config'], dir);
  pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  assert.deepEqual(pkg['ai-core'].stacks, ['dotnet', 'react'], 'react ajouté additivement');
  assert.deepEqual(pkg['ai-core'].models, ['anthropic'], 'models de l\'utilisateur préservés');
  // 3) rien de neuf → no-op
  const r3 = sync(['--config'], dir);
  assert.match(r3.out, /jour|rien/i, 'rien à ajouter si déjà à jour');
  clean(dir);
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

test('détection : variantes .NET en profondeur (.fsproj enfoui) → dotnet', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  mkdirSync(join(dir, 'a', 'b', 'c'), { recursive: true });
  writeFileSync(join(dir, 'a', 'b', 'c', 'lib.fsproj'), '');
  const { out } = sync(['--detect-config'], dir);
  assert.match(out, /dotnet/, '.fsproj (même profond) doit compter comme dotnet');
  clean(dir);
});

test('détection HONNÊTE + JUSTIFIÉE : poc/requirements.txt → python, avec sa preuve (l\'humain nettoie)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  mkdirSync(join(dir, 'poc'), { recursive: true });
  writeFileSync(join(dir, 'poc', 'requirements.txt'), 'flask\n');
  const { out } = sync(['--detect-config'], dir);
  assert.match(out, /python/, 'python doit être détecté (honnêteté — on ne masque pas)');
  assert.match(out, /poc\/requirements\.txt/, 'la détection doit CITER son fichier-preuve');
  clean(dir);
});

test('détection non-dogmatique : react détecté hors src/ (nom de dossier arbitraire)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  mkdirSync(join(dir, 'mon-webapp'), { recursive: true });
  writeFileSync(join(dir, 'mon-webapp', 'package.json'), JSON.stringify({ dependencies: { react: '^18' } }));
  const { out } = sync(['--detect-config'], dir);
  assert.match(out, /react/, 'react doit être détecté dans un dossier arbitraire (pas seulement src/)');
  clean(dir);
});

test('détection monorepo : react dans src/<front>/package.json est détecté (back .sln à la racine)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  writeFileSync(join(dir, 'app.sln'), '');
  mkdirSync(join(dir, 'src', 'app-front'), { recursive: true });
  writeFileSync(join(dir, 'src', 'app-front', 'package.json'), JSON.stringify({ dependencies: { react: '^18' } }));
  const { out } = sync(['--detect-config'], dir);
  assert.match(out, /dotnet/, 'dotnet attendu (via .sln racine)');
  assert.match(out, /react/, 'react attendu (via src/app-front/package.json)');
  clean(dir);
});
