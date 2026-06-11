// tests/sync.test.mjs — tests du générateur, runner INTÉGRÉ de Node (zéro dépendance).
// Lancer :  npm test     (ou directement :  node --test)
//
// Chaque test lance le vrai CLI dans un dossier temporaire et vérifie fichiers + avertissements.
// (Ces tests ne sont PAS publiés : "files" du package.json n'inclut pas tests/.)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SYNC = resolve(here, '..', 'tools', 'sync-ai.mjs');

// Lance le sync dans un projet temporaire (cwd) ; la sortie y atterrit. Renvoie { dir, out, err }.
function sync(extraArgs, cwd) {
  const dir = cwd || mkdtempSync(join(tmpdir(), 'aicore-'));
  const r = spawnSync(process.execPath, [SYNC, ...extraArgs], { cwd: dir, encoding: 'utf8' });
  assert.equal(r.status, 0, `sync a échoué (code ${r.status}) :\n${r.stderr}`);
  return { dir, out: r.stdout || '', err: r.stderr || '' };
}
const clean = (d) => rmSync(d, { recursive: true, force: true });

test('outils : --tools copilot ne génère QUE .github (ni CLAUDE ni GEMINI)', () => {
  const { dir } = sync(['--tools', 'copilot']);
  assert.ok(existsSync(join(dir, '.github', 'copilot-instructions.md')), 'copilot-instructions manquant');
  assert.ok(!existsSync(join(dir, 'CLAUDE.md')), 'CLAUDE.md ne devrait pas exister');
  assert.ok(!existsSync(join(dir, 'GEMINI.md')), 'GEMINI.md ne devrait pas exister');
  clean(dir);
});

test('stacks : --stacks dotnet produit dotnet.instructions.md avec applyTo en ligne 1', () => {
  const { dir } = sync(['--tools', 'copilot', '--stacks', 'dotnet']);
  const f = join(dir, '.github', 'instructions', 'dotnet.instructions.md');
  assert.ok(existsSync(f), 'dotnet.instructions.md manquant');
  assert.match(readFileSync(f, 'utf8'), /^---\r?\napplyTo:/, 'le frontmatter applyTo doit rester en tête');
  clean(dir);
});

test('stack inconnue : --stacks nexistepas ne crée aucun fichier (et ne plante pas)', () => {
  const { dir } = sync(['--tools', 'copilot', '--stacks', 'nexistepas']);
  assert.ok(!existsSync(join(dir, '.github', 'instructions', 'nexistepas.instructions.md')));
  clean(dir);
});

test('zone managée : un re-sync préserve la zone libre et ne duplique pas le bloc', () => {
  const { dir } = sync(['--tools', 'claude']);
  const claude = join(dir, 'CLAUDE.md');
  writeFileSync(claude, 'MANUEL-HAUT\n\n' + readFileSync(claude, 'utf8') + '\nMANUEL-BAS\n');
  sync(['--tools', 'claude'], dir); // re-sync dans le MÊME dossier
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
  const { err } = sync(['--stacks', 'dotnet', '--tools', 'copilot'], dir);
  assert.match(err, /collision/i, 'la collision stack/context doit être signalée');
  clean(dir);
});

test('orphelins : un outil dé-sélectionné est PROPOSÉ à la suppression, pas supprimé', () => {
  const { dir } = sync(['--tools', 'claude,gemini']); // crée CLAUDE.md + GEMINI.md
  assert.ok(existsSync(join(dir, 'GEMINI.md')));
  const { err } = sync(['--tools', 'claude'], dir); // gemini dé-sélectionné
  assert.match(err, /[Oo]rphelin/, 'GEMINI.md devrait être signalé orphelin');
  assert.ok(existsSync(join(dir, 'GEMINI.md')), 'le sync ne doit JAMAIS supprimer tout seul');
  clean(dir);
});

test('intégrité des marqueurs : un bloc malformé est ignoré (pas de duplication)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'aicore-'));
  writeFileSync(join(dir, 'CLAUDE.md'), '# CLAUDE.md\n\n<!-- ai-core:start -->\nbloc sans fin\n'); // start sans end
  const { err } = sync(['--tools', 'claude'], dir);
  assert.match(err, /malform/i, 'les marqueurs malformés doivent être signalés');
  const after = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.equal((after.match(/ai-core:start/g) || []).length, 1, 'ne doit pas ajouter un 2e bloc');
  clean(dir);
});

test('lisibilité : sommaire + provenance présents, uniformément (Claude + Copilot)', () => {
  const { dir } = sync([]); // tous outils, toutes stacks
  const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /## Sommaire/, 'sommaire absent de CLAUDE.md');
  assert.match(claude, /- \[.+\]\(#.+\)/, 'le sommaire doit être navigable (liens vers ancres)');
  assert.match(claude, /─────/, 'marqueurs de provenance absents de CLAUDE.md');
  const copilot = readFileSync(join(dir, '.github', 'copilot-instructions.md'), 'utf8');
  assert.match(copilot, /## Sommaire/, 'sommaire absent de copilot-instructions (interop cassée)');
  clean(dir);
});
