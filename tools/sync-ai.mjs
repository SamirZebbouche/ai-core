#!/usr/bin/env node
// tools/sync-ai.mjs — génère les adapters IA depuis le cœur conventions/ (+ contexts project-local).
// Zéro dépendance. Idempotent.
//
// Usage :
//   node .ai-core/tools/sync-ai.mjs          # depuis la racine d'un projet (sortie = .)
//   node tools/sync-ai.mjs --out .sync-out   # self-test dans ai-core (sortie isolée)
//
// Défauts : cœur = ../conventions (relatif au script) ; contexts = <cwd>/conventions/contexts ; sortie = <cwd>.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(scriptDir, '..', 'conventions');

const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const projectDir = process.cwd();
const outDir = outArg >= 0 ? resolve(projectDir, args[outArg + 1]) : projectDir;
const contextsDir = join(projectDir, 'conventions', 'contexts');

const HEADER = "<!-- GÉNÉRÉ par ai-core/tools/sync-ai — n'édite PAS ce fichier, édite conventions/ -->\n";

// --- helpers ---
const read = (p) => readFileSync(p, 'utf8');
const mdFiles = (dir) => existsSync(dir)
  ? readdirSync(dir).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').sort()
  : [];
const stripFrontmatter = (s) => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const posix = (p) => p.split('\\').join('/');
const rel = (p) => posix(relative(outDir, p)) || basename(p);
const ensureDir = (p) => { if (!existsSync(p)) mkdirSync(p, { recursive: true }); };
const write = (p, content) => { ensureDir(dirname(p)); writeFileSync(p, content); console.log('  →', posix(relative(outDir, p)) || basename(p)); };
const headerAfterFrontmatter = (content) => {
  const m = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
  return m ? m[1] + HEADER + content.slice(m[1].length) : HEADER + content;
};

// --- collecte des sources ---
if (!existsSync(coreDir)) { console.error('ERREUR : cœur introuvable :', coreDir); process.exit(1); }
const core = {
  method: join(coreDir, 'method.md'),
  global: join(coreDir, 'global.md'),
  meta: mdFiles(join(coreDir, 'meta')).map((f) => join(coreDir, 'meta', f)),
  stacks: mdFiles(join(coreDir, 'stacks')).map((f) => join(coreDir, 'stacks', f)),
};
const contexts = mdFiles(contextsDir).map((f) => join(contextsDir, f));

console.log(`ai-core sync → sortie : ${posix(relative(projectDir, outDir)) || '.'}`);
console.log(`  cœur : ${posix(relative(projectDir, coreDir)) || coreDir}  ·  contexts : ${contexts.length}  ·  stacks : ${core.stacks.length}  ·  meta : ${core.meta.length}`);

// --- 1) CLAUDE.md (@import, résolu relativement à la sortie) ---
let claude = HEADER + '# CLAUDE.md\n\n## Méthode\n@' + rel(core.method) + '\n\n## Constitution & principes\n@' + rel(core.global) + '\n';
for (const m of core.meta) claude += '@' + rel(m) + '\n';
if (core.stacks.length) { claude += '\n## Stacks\n'; for (const s of core.stacks) claude += '@' + rel(s) + '\n'; }
if (contexts.length) { claude += '\n## Contexts (project-local)\n'; for (const c of contexts) claude += '@' + rel(c) + '\n'; }
write(join(outDir, 'CLAUDE.md'), claude);

// --- 2) GEMINI.md (inline) ---
const inline = (files) => files.map((f) => stripFrontmatter(read(f)).trim()).join('\n\n---\n\n');
const all = [core.method, core.global, ...core.meta, ...core.stacks, ...contexts];
write(join(outDir, 'GEMINI.md'), HEADER + '# GEMINI.md\n\n' + inline(all) + '\n');

// --- 3) Copilot : main (inline) + instructions scopées (frontmatter applyTo conservé) ---
write(join(outDir, '.github', 'copilot-instructions.md'), HEADER + '# Copilot Instructions\n\n' + inline([core.global, core.method, ...core.meta]) + '\n');
for (const f of [...core.stacks, ...contexts]) {
  write(join(outDir, '.github', 'instructions', `${basename(f, '.md')}.instructions.md`), headerAfterFrontmatter(read(f)));
}

console.log('OK.');
