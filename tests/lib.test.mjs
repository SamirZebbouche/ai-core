// tests/lib.test.mjs — tests UNITAIRES du cœur pur (tools/lib/), in-process. Couvre les branches
// difficiles à atteindre en boîte noire (marqueurs malformés, sélection, alias…).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripFrontmatter, fmField, fmList, firstH1, slugify } from '../tools/lib/text.mjs';
import { managedBlock, MARK_START, MARK_END } from '../tools/lib/managed.mjs';
import { assembleConventions, assembleCommandBody } from '../tools/lib/assemble.mjs';
import { MODELS, normModel, pick } from '../tools/lib/select.mjs';

// --- text ---
test('text: stripFrontmatter retire le bloc ---…---', () => {
  assert.equal(stripFrontmatter('---\na: 1\n---\ncorps'), 'corps');
  assert.equal(stripFrontmatter('pas de fm'), 'pas de fm');
});
test('text: fmField / fmList extraient description et listes', () => {
  const s = '---\ndescription: "Hello"\nmodels: [anthropic, copilot]\n---\nx';
  assert.equal(fmField(s, 'description'), 'Hello');
  assert.deepEqual(fmList(s, 'models'), ['anthropic', 'copilot']);
  assert.deepEqual(fmList(s, 'absent'), []);
});
test('text: firstH1 prend le premier titre de niveau 1', () => {
  assert.equal(firstH1('## sous\n# Le Titre\n# autre'), 'Le Titre');
  assert.equal(firstH1('pas de titre'), '');
});
test('text: slugify façon VSCode (accents gardés, em-dash → double tiret, ponctuation retirée)', () => {
  assert.equal(slugify('Méthode de travail IA — protocole'), 'méthode-de-travail-ia--protocole');
  assert.equal(slugify('Stack — .NET / C#'), 'stack--net--c');
});

// --- managed (toutes les branches) ---
test('managed: fichier neuf → scaffold zone libre + bloc unique', () => {
  const { content, warning } = managedBlock(null, 'BODY', 'CLAUDE.md');
  assert.equal(warning, undefined);
  assert.match(content, /# CLAUDE\.md/);
  assert.match(content, /Zone LIBRE/);
  assert.match(content, /BODY/);
  assert.equal((content.match(/ai-core:start/g) || []).length, 1);
});
test('managed: sans marqueurs → AJOUTE (préserve le manuel)', () => {
  const { content } = managedBlock('MON MANUEL\n', 'BODY', 'X');
  assert.match(content, /MON MANUEL/);
  assert.match(content, /BODY/);
  assert.equal((content.match(/ai-core:start/g) || []).length, 1);
});
test('managed: un bloc présent → remplace EN PLACE, zone libre intacte', () => {
  const first = managedBlock(null, 'OLD', 'X').content;
  const edited = 'HAUT\n' + first + 'BAS\n';
  const { content } = managedBlock(edited, 'NEW', 'X');
  assert.match(content, /HAUT/);
  assert.match(content, /BAS/);
  assert.match(content, /NEW/);
  assert.doesNotMatch(content, /OLD/);
  assert.equal((content.match(/ai-core:start/g) || []).length, 1);
});
test('managed: marqueurs malformés (start sans end) → content null + warning', () => {
  const r = managedBlock('# X\n<!-- ai-core:start -->\nsans fin\n', 'B', 'X');
  assert.equal(r.content, null);
  assert.match(r.warning, /malform/i);
});
test('managed: end avant start → content null + warning', () => {
  const r = managedBlock(`${MARK_END}\nmilieu\n${MARK_START} -->`, 'B', 'X');
  assert.equal(r.content, null);
  assert.match(r.warning, /end.*start/i);
});

// --- assemble ---
test('assemble: conventions → sommaire navigable + provenance, frontmatter retiré', () => {
  const body = assembleConventions([
    { name: 'method.md', content: '# Méthode\n- a' },
    { name: 'dotnet.md', content: '---\napplyTo: x\n---\n# Stack .NET\n- b' },
  ]);
  assert.match(body, /## Sommaire/);
  assert.match(body, /- \[Méthode\]\(#méthode\)/);
  assert.match(body, /<!-- ───── method\.md ───── -->/);
  assert.match(body, /<!-- ───── dotnet\.md ───── -->/);
  assert.doesNotMatch(body, /applyTo/);
});
test('assemble: commande injecte les fragments à {{stacks}} (ordre conservé)', () => {
  const body = assembleCommandBody('---\nd: x\n---\nPRE\n{{stacks}}\nPOST', ['# A\n- 1', '# B\n- 2']);
  assert.ok(body.indexOf('PRE') < body.indexOf('# A'));
  assert.ok(body.indexOf('# A') < body.indexOf('# B'));
  assert.ok(body.indexOf('# B') < body.indexOf('POST'));
  assert.doesNotMatch(body, /\{\{stacks\}\}/);
});
test('assemble: commande sans {{stacks}} → fragments ajoutés à la fin (ou rien si aucun)', () => {
  assert.match(assembleCommandBody('SKEL', ['FRAG']), /SKEL[\s\S]*FRAG/);
  assert.equal(assembleCommandBody('SKEL', []), 'SKEL');
});

// --- select ---
test('select: normModel résout l\'alias claude → anthropic', () => {
  assert.equal(normModel('claude'), 'anthropic');
  assert.equal(normModel('CoPilot'), 'copilot');
  assert.equal(normModel('inconnu'), 'inconnu');
});
test('select: pick — flag > cfg > tout, et remonte les inconnus', () => {
  assert.deepEqual(pick('anthropic,copilot', null, MODELS, normModel).selected, ['anthropic', 'copilot']);
  assert.deepEqual(pick('claude', null, MODELS, normModel).selected, ['anthropic']);
  assert.deepEqual(pick(null, ['gemini'], MODELS, normModel).selected, ['gemini']);
  assert.deepEqual(pick(null, null, MODELS, normModel).selected, MODELS);
  assert.deepEqual(pick('zzz', null, MODELS, normModel).missing, ['zzz']);
});
