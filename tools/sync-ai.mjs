#!/usr/bin/env node
// tools/sync-ai.mjs — génère les adapters IA depuis le cœur conventions/ (+ contexts project-local).
// Zéro dépendance. Idempotent. Adapters auto-suffisants (inline).
//
// Usage :
//   npx ai-core-sync                         # depuis la racine d'un projet
//   node .../tools/sync-ai.mjs --out DIR      # sortie custom (self-test)
//   ... --stacks dotnet,react                 # sélection des stacks (la "finesse", additive)
//
// Sélection des stacks : --stacks  >  package.json {"ai-core":{"stacks":[...]}}  >  toutes.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(scriptDir, '..', 'conventions');

const args = process.argv.slice(2);
const argVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const projectDir = process.cwd();
const outDir = argVal('--out') ? resolve(projectDir, argVal('--out')) : projectDir;
const contextsDir = join(projectDir, 'conventions', 'contexts');

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

// --- sélection des stacks (la "finesse" additive) ---
function pickStacks(allStacks) {
  let names = null;
  const flag = argVal('--stacks');
  if (flag) names = flag.split(',').map((s) => s.trim()).filter(Boolean);
  if (!names) {
    const pkg = join(projectDir, 'package.json');
    if (existsSync(pkg)) { try { const c = JSON.parse(read(pkg))['ai-core']; if (Array.isArray(c?.stacks)) names = c.stacks; } catch { /* pas de config */ } }
  }
  if (!names) { console.log('  (stacks : TOUTES — précise via --stacks ou package.json "ai-core".stacks)'); return allStacks; }
  const want = new Set(names);
  const missing = names.filter((n) => !allStacks.some((f) => basename(f, '.md') === n));
  if (missing.length) console.warn('  ⚠️ stacks introuvables dans le cœur :', missing.join(', '));
  return allStacks.filter((f) => want.has(basename(f, '.md')));
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

console.log(`ai-core sync → ${posix(relative(projectDir, outDir)) || '.'}`);
console.log(`  stacks : ${core.stacks.map((f) => basename(f, '.md')).join(', ') || '—'}  ·  contexts : ${contexts.length}  ·  meta : ${core.meta.length}`);

// --- adapters inline (auto-suffisants : robustes au clone, indépendants du chemin du cœur) ---
const inline = (files) => files.map((f) => stripFrontmatter(read(f)).trim()).join('\n\n---\n\n');
const body = inline([core.method, core.global, ...core.meta, ...core.stacks, ...contexts]);
write(join(outDir, 'CLAUDE.md'), HEADER + '# CLAUDE.md\n\n' + body + '\n');
write(join(outDir, 'GEMINI.md'), HEADER + '# GEMINI.md\n\n' + body + '\n');

// --- Copilot : main inline + instructions scopées (frontmatter applyTo conservé) ---
write(join(outDir, '.github', 'copilot-instructions.md'), HEADER + '# Copilot Instructions\n\n' + inline([core.global, core.method, ...core.meta]) + '\n');
for (const f of [...core.stacks, ...contexts]) {
  write(join(outDir, '.github', 'instructions', `${basename(f, '.md')}.instructions.md`), headerAfterFrontmatter(read(f)));
}

console.log('OK.');
