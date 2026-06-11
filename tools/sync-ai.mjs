#!/usr/bin/env node
// tools/sync-ai.mjs — génère les adapters IA depuis le cœur conventions/ (+ contexts project-local).
// Zéro dépendance. Idempotent.
//
// SOUPLESSE — zone managée : dans CLAUDE.md / GEMINI.md / copilot-instructions.md, le sync ne réécrit
// QUE le bloc entre <!-- ai-core:start --> et <!-- ai-core:end -->. Tout le reste (tes instructions
// PROJET, à la main) est PRÉSERVÉ. Ces fichiers sont donc committés, pas gitignorés.
//
// Usage :
//   npx ai-core-sync                          # racine d'un projet
//   ... --out DIR                              # sortie custom (self-test)
//   ... --stacks dotnet,react                  # quelles stacks inclure (additif)
//   ... --tools claude,copilot                 # quels assistants générer (sinon : tous)
//
// Sélection (la "finesse") :
//   stacks : --stacks  >  package.json "ai-core".stacks  >  toutes
//   outils : --tools   >  package.json "ai-core".tools   >  tous (claude, gemini, copilot)

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(scriptDir, '..', 'conventions');

const args = process.argv.slice(2);
const argVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const projectDir = process.cwd();
const outDir = argVal('--out') ? resolve(projectDir, argVal('--out')) : projectDir;
const contextsDir = join(projectDir, '.ai', 'contexts'); // project-local : un seul dossier caché .ai/

// Marqueurs de zone managée. Le reste du fichier = zone LIBRE (jamais touchée).
const MARK_START = '<!-- ai-core:start';
const START_LINE = '<!-- ai-core:start — zone GÉNÉRÉE, ne pas éditer (édite conventions/ puis relance le sync) -->';
const MARK_END = '<!-- ai-core:end -->';
const HEADER = "<!-- GÉNÉRÉ par ai-core/tools/sync-ai — n'édite PAS ce fichier, édite conventions/ -->\n";

// --- helpers ---
const read = (p) => readFileSync(p, 'utf8');
const mdFiles = (dir) => existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').sort()
  : [];
const stripFrontmatter = (s) => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const posix = (p) => p.split('\\').join('/');
const ensureDir = (p) => { if (!existsSync(p)) mkdirSync(p, { recursive: true }); };
const write = (p, content) => { ensureDir(dirname(p)); writeFileSync(p, content); console.log('  →', posix(relative(outDir, p)) || basename(p)); };
const headerAfterFrontmatter = (content) => {
  const m = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  return m ? m[1] + HEADER + content.slice(m[1].length) : HEADER + content;
};

// Écrit/rafraîchit UNIQUEMENT le bloc managé ; préserve la zone libre de l'utilisateur.
function writeManaged(path, bodyText, title) {
  const block = `${START_LINE}\n${bodyText}\n${MARK_END}`;
  if (!existsSync(path)) {
    const scaffold = `# ${title}\n\n<!-- Zone LIBRE : tes instructions PROJET ici (au-dessus / au-dessous du bloc). ai-core ne gère QUE le bloc ci-dessous. -->\n\n`;
    write(path, scaffold + block + '\n');
    return;
  }
  const existing = read(path);
  const s = existing.indexOf(MARK_START);
  const e = existing.indexOf(MARK_END);
  if (s >= 0 && e > s) { write(path, existing.slice(0, s) + block + existing.slice(e + MARK_END.length)); return; }
  const sep = existing.endsWith('\n') ? '\n' : '\n\n'; // pas de marqueurs : on AJOUTE (manuel préservé)
  write(path, existing + sep + block + '\n');
}

// --- config projet (lue une fois) : package.json "ai-core": { stacks, tools } ---
let _cfg;
const projectCfg = () => {
  if (_cfg !== undefined) return _cfg;
  _cfg = {};
  const pkg = join(projectDir, 'package.json');
  if (existsSync(pkg)) { try { _cfg = JSON.parse(read(pkg))['ai-core'] || {}; } catch { /* config absente/invalide */ } }
  return _cfg;
};

// --- sélection des stacks (sur fichiers ; additive) ---
function pickStacks(allStacks) {
  let names = null;
  const flag = argVal('--stacks');
  if (flag) names = flag.split(',').map((s) => s.trim()).filter(Boolean);
  if (!names && Array.isArray(projectCfg().stacks)) names = projectCfg().stacks;
  if (!names) { console.log('  (stacks : TOUTES — --stacks ou package.json "ai-core".stacks)'); return allStacks; }
  const want = new Set(names);
  const missing = names.filter((n) => !allStacks.some((f) => basename(f, '.md') === n));
  if (missing.length) console.warn('  ⚠️ stacks introuvables dans le cœur :', missing.join(', '));
  return allStacks.filter((f) => want.has(basename(f, '.md')));
}

// --- sélection des outils cibles (LLM) ---
function pickTools() {
  const all = ['claude', 'gemini', 'copilot'];
  let names = null;
  const flag = argVal('--tools');
  if (flag) names = flag.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!names && Array.isArray(projectCfg().tools)) names = projectCfg().tools.map((s) => String(s).toLowerCase());
  if (!names) { console.log('  (outils : TOUS — --tools ou package.json "ai-core".tools)'); return all; }
  const missing = names.filter((n) => !all.includes(n));
  if (missing.length) console.warn('  ⚠️ outils inconnus :', missing.join(', '), '— connus : claude, gemini, copilot');
  return all.filter((t) => names.includes(t));
}

// --- collecte ---
if (!existsSync(coreDir)) { console.error('ERREUR : cœur introuvable :', coreDir); process.exit(1); }
const core = {
  method: join(coreDir, 'method.md'),
  global: join(coreDir, 'global.md'),
  meta: mdFiles(join(coreDir, 'meta')).map((f) => join(coreDir, 'meta', f)),
  stacks: pickStacks(mdFiles(join(coreDir, 'stacks')).map((f) => join(coreDir, 'stacks', f))),
};
const contexts = mdFiles(contextsDir).map((f) => join(contextsDir, f));
const tools = pickTools();

console.log(`ai-core sync → ${posix(relative(projectDir, outDir)) || '.'}`);
console.log(`  outils : ${tools.join(', ') || '—'}  ·  stacks : ${core.stacks.map((f) => basename(f, '.md')).join(', ') || '—'}  ·  contexts : ${contexts.length}`);

// --- corps inline (auto-suffisant : robuste au clone, indépendant du chemin du cœur) ---
const inline = (files) => files.map((f) => stripFrontmatter(read(f)).trim()).join('\n\n---\n\n');
const body = inline([core.method, core.global, ...core.meta, ...core.stacks, ...contexts]);

// Fichiers "manuel + managé" : on ne réécrit que le bloc balisé.
if (tools.includes('claude')) writeManaged(join(outDir, 'CLAUDE.md'), body, 'CLAUDE.md');
if (tools.includes('gemini')) writeManaged(join(outDir, 'GEMINI.md'), body, 'GEMINI.md');
if (tools.includes('copilot')) {
  writeManaged(join(outDir, '.github', 'copilot-instructions.md'), inline([core.global, core.method, ...core.meta]), 'Copilot Instructions');
  // Instructions scopées : 1:1 avec un fichier du cœur → entièrement générées (manuel = ajoute TON propre *.instructions.md).
  for (const f of [...core.stacks, ...contexts]) {
    write(join(outDir, '.github', 'instructions', `${basename(f, '.md')}.instructions.md`), headerAfterFrontmatter(read(f)));
  }
}

console.log('OK.');
