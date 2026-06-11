#!/usr/bin/env node
// tools/sync-ai.mjs — génère adapters (conventions) + commandes depuis le cœur (+ project-local .ai/).
// Zéro dépendance. Idempotent. Le sync ne SUPPRIME jamais : il propose (orphelins), avertit, ignore.
//
// SOUPLESSE — zone managée : CLAUDE.md / GEMINI.md / copilot-instructions.md ne voient réécrire QUE le
// bloc entre <!-- ai-core:start --> et <!-- ai-core:end -->. Le reste (ta prose) est préservé.
//
// SÉLECTION (la "finesse", additive) :
//   models   : --models  > package.json "ai-core".models   > tous (anthropic, gemini, copilot)
//   stacks   : --stacks   > package.json "ai-core".stacks    > toutes
//   commands : --commands > package.json "ai-core".commands  > toutes
//
// COMMANDES (multi-techno, additives) : commands/<nom>/command.md (squelette + {{stacks}}) +
//   commands/<nom>/<stack>.md (fragments inclus selon les stacks sélectionnées). Cœur OU .ai/commands/.
//
// Usage : npx ai-core-sync [--out DIR] [--models a,b] [--stacks a,b] [--commands a,b] [--list]

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(scriptDir, '..', 'conventions');
const coreCommandsDir = resolve(scriptDir, '..', 'commands');

const args = process.argv.slice(2);
const argVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const projectDir = process.cwd();
const outDir = argVal('--out') ? resolve(projectDir, argVal('--out')) : projectDir;
const contextsDir = join(projectDir, '.ai', 'contexts');
const localCommandsDir = join(projectDir, '.ai', 'commands');

const MARK_START = '<!-- ai-core:start';
const START_LINE = '<!-- ai-core:start — zone GÉNÉRÉE, ne pas éditer (édite conventions/ puis relance le sync) -->';
const MARK_END = '<!-- ai-core:end -->';
const HEADER = "<!-- GÉNÉRÉ par ai-core/tools/sync-ai — n'édite PAS, édite le cœur (conventions/, commands/) -->\n";
const MODELS = ['anthropic', 'gemini', 'copilot'];
const ALIAS = { claude: 'anthropic', anthropic: 'anthropic', gemini: 'gemini', copilot: 'copilot', github: 'copilot' };

// --- helpers ---
const read = (p) => readFileSync(p, 'utf8');
const rel = (p) => posix(relative(outDir, p)) || basename(p);
const posix = (p) => p.split('\\').join('/');
const mdFiles = (dir) => existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').sort() : [];
const subdirs = (dir) => existsSync(dir) ? readdirSync(dir).filter((f) => { try { return statSync(join(dir, f)).isDirectory(); } catch { return false; } }).sort() : [];
const stripFrontmatter = (s) => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
const frontmatter = (s) => { const m = s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/); return m ? m[1] : ''; };
const fmField = (s, k) => { const m = frontmatter(s).match(new RegExp('^' + k + ':\\s*(.+)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
const fmList = (s, k) => { const v = fmField(s, k); return v ? v.replace(/^\[|\]$/g, '').split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : []; };
const ensureDir = (p) => { if (!existsSync(p)) mkdirSync(p, { recursive: true }); };
const WRITTEN = new Set();
const write = (p, content) => { ensureDir(dirname(p)); writeFileSync(p, content); WRITTEN.add(resolve(p)); console.log('  →', rel(p)); };
const headerAfterFrontmatter = (content) => { const m = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/); return m ? m[1] + HEADER + content.slice(m[1].length) : HEADER + content; };
const aiSigned = (p) => { try { const s = read(p); return s.includes('ai-core:start') || s.includes('par ai-core'); } catch { return false; } };

function writeManaged(path, bodyText, title) {
  const block = `${START_LINE}\n${bodyText}\n${MARK_END}`;
  if (!existsSync(path)) { write(path, `# ${title}\n\n<!-- Zone LIBRE : tes instructions PROJET ici. ai-core ne gère QUE le bloc ci-dessous. -->\n\n${block}\n`); return; }
  const existing = read(path);
  const nStart = (existing.match(/<!-- ai-core:start/g) || []).length;
  const nEnd = (existing.match(/<!-- ai-core:end -->/g) || []).length;
  if (nStart === 0 && nEnd === 0) { write(path, existing + (existing.endsWith('\n') ? '\n' : '\n\n') + block + '\n'); return; }
  if (nStart !== 1 || nEnd !== 1) { console.warn(`  ⚠️ ${rel(path)} : marqueurs malformés (${nStart} start / ${nEnd} end) — IGNORÉ.`); return; }
  const s = existing.indexOf(MARK_START), e = existing.indexOf(MARK_END);
  if (e < s) { console.warn(`  ⚠️ ${rel(path)} : 'end' avant 'start' — IGNORÉ.`); return; }
  write(path, existing.slice(0, s) + block + existing.slice(e + MARK_END.length));
}

// --- config projet (lue une fois) ---
let _cfg;
const projectCfg = () => { if (_cfg !== undefined) return _cfg; _cfg = {}; const pkg = join(projectDir, 'package.json'); if (existsSync(pkg)) { try { _cfg = JSON.parse(read(pkg))['ai-core'] || {}; } catch { /* */ } } return _cfg; };

// Détection best-effort des stacks du projet (défaut sain ET --config). JAMAIS "toutes" : détecté, sinon rien.
function detectStacks() {
  const hasF = (dir, t) => { try { return readdirSync(dir).some(t); } catch { return false; } };
  const found = [];
  if ([projectDir, join(projectDir, 'src')].some((d) => hasF(d, (f) => f.endsWith('.csproj') || f.endsWith('.sln')))) found.push('dotnet');
  try { const pj = JSON.parse(read(join(projectDir, 'package.json'))); if ({ ...pj.dependencies, ...pj.devDependencies }.react) found.push('react'); } catch { /* pas de package.json */ }
  if (hasF(projectDir, (f) => f === 'pyproject.toml' || f === 'requirements.txt')) found.push('python');
  if (hasF(projectDir, (f) => f === 'go.mod')) found.push('go');
  return found;
}

// sélection générique : --flag > package.json > tout. `norm` normalise (alias).
function pick(label, flag, cfgKey, available, norm = (x) => x) {
  let names = null;
  const f = argVal(flag);
  if (f) names = f.split(',').map((s) => s.trim()).filter(Boolean);
  if (!names && Array.isArray(projectCfg()[cfgKey])) names = projectCfg()[cfgKey];
  if (!names) return available.slice();
  const want = new Set(names.map(norm));
  const missing = names.map(norm).filter((n) => !available.includes(n));
  if (missing.length) console.warn(`  ⚠️ ${label} inconnu(s) : ${missing.join(', ')}`);
  return available.filter((a) => want.has(a));
}

// --- aide (--help) ---
if (args.includes('--help') || args.includes('-h')) {
  console.log(`ai-core-sync — génère les adapters IA (conventions + commandes) depuis le cœur ai-core.

Usage : npx ai-core-sync [options]

Options
  --models a,b     modèles cibles : anthropic, gemini, copilot   (défaut : tous ; alias claude=anthropic)
  --stacks a,b     stacks à inclure                              (défaut : auto-détectées, sinon aucune)
  --commands a,b   commandes à générer                           (défaut : toutes)
  --out DIR        dossier de sortie                             (défaut : racine du projet)
  --list           catalogue : modèles / stacks / commandes disponibles
  --config         suggère le bloc "ai-core" pour package.json (stacks auto-détectées)
  --help           cette aide

Config (package.json)
  "ai-core": { "models": ["anthropic"], "stacks": ["dotnet","react"] }

Project-local (sous .ai/)
  .ai/contexts/<ctx>.md             bounded contexts (règles locales)
  .ai/commands/<cmd>/command.md     commande projet (+ <stack>.md = fragments ADDITIFS)

Génère (selon --models) : CLAUDE.md · GEMINI.md · .github/* · .claude/commands/* · .gemini/commands/*
Seul le bloc <!-- ai-core:start … end --> est réécrit ; ta zone libre est préservée. Doc : HOWTO.md`);
  process.exit(0);
}

// --- config suggérée (--config) : stacks auto-détectées, bloc prêt à coller ---
if (args.includes('--config')) {
  const detected = detectStacks();
  console.log('Config ai-core — colle ce bloc dans package.json :\n');
  console.log('  "ai-core": {');
  console.log(`    "models": ${JSON.stringify(MODELS)},`);
  console.log(`    "stacks": ${JSON.stringify(detected)}`);
  console.log('  }\n');
  console.log(`Stacks ${detected.length ? 'auto-détectées : ' + detected.join(', ') : 'aucune détectée — ajoute les tiennes (npx ai-core-sync --list)'}.`);
  console.log('Modèles : anthropic, gemini, copilot — retire ceux que tu n\'utilises pas (alias claude=anthropic).');
  console.log('Optionnel : "scripts": { "postinstall": "ai-core-sync" }   ·   Aide : npx ai-core-sync --help');
  process.exit(0);
}

// --- catalogue (--list) ---
if (args.includes('--list')) {
  const coreStacks = mdFiles(join(coreDir, 'stacks')).map((f) => basename(f, '.md'));
  console.log('Catalogue ai-core');
  console.log('  modèles            :', MODELS.join(', '));
  console.log('  stacks (cœur)      :', coreStacks.join(', ') || '—');
  console.log('  commandes (cœur)   :', subdirs(coreCommandsDir).join(', ') || '—');
  console.log('  commandes (projet) :', subdirs(localCommandsDir).join(', ') || '—');
  console.log('  contexts (projet)  :', mdFiles(contextsDir).map((f) => basename(f, '.md')).join(', ') || '—');
  process.exit(0);
}

// --- collecte ---
if (!existsSync(coreDir)) { console.error('ERREUR : cœur introuvable :', coreDir); process.exit(1); }
const allStacks = mdFiles(join(coreDir, 'stacks')).map((f) => join(coreDir, 'stacks', f));
// stacks DEMANDÉES (brutes) : une stack peut n'exister que comme fragment de commande (ex. react sans convention cœur).
const requestedStacks = (() => {
  const f = argVal('--stacks');
  if (f) return f.split(',').map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(projectCfg().stacks)) return projectCfg().stacks;
  return detectStacks(); // défaut SAIN : détectées, sinon AUCUNE (jamais "toutes")
})();
const core = {
  method: join(coreDir, 'method.md'),
  global: join(coreDir, 'global.md'),
  meta: mdFiles(join(coreDir, 'meta')).map((f) => join(coreDir, 'meta', f)),
  stacks: allStacks.filter((f) => requestedStacks.includes(basename(f, '.md'))),
};
const contexts = mdFiles(contextsDir).map((f) => join(contextsDir, f));
const models = pick('modèle', '--models', 'models', MODELS, (x) => ALIAS[x.toLowerCase()] || x.toLowerCase());

const collide = core.stacks.map((f) => basename(f, '.md')).filter((n) => contexts.some((f) => basename(f, '.md') === n));
if (collide.length) console.warn('  ⚠️ collision stack/context (même nom → même .instructions.md ; le context gagne) :', collide.join(', '));

console.log(`ai-core sync → ${posix(relative(projectDir, outDir)) || '.'}`);
console.log(`  modèles : ${models.join(', ') || '—'}  ·  stacks : ${requestedStacks.join(', ') || '—'}  ·  contexts : ${contexts.length}`);

// --- conventions inline + lisibilité (sommaire navigable + provenance) ---
const firstH1 = (s) => { const m = s.match(/^#\s+(.+)$/m); return m ? m[1].trim() : ''; };
const slugify = (h) => h.trim().toLowerCase().replace(/\s+/g, '-').replace(/[\[\]!\/'"#$%&()*+,.:;<=>?@\\^_{|}~`—·…]/g, '');
const assemble = (files) => {
  const parts = files.map((f) => { const c = stripFrontmatter(read(f)).trim(); return { name: basename(f), title: firstH1(c) || basename(f), c }; });
  const toc = parts.map((p) => `- [${p.title}](#${slugify(p.title)})`).join('\n');
  const sections = parts.map((p) => `<!-- ───── ${p.name} ───── -->\n${p.c}`).join('\n\n');
  return `## Sommaire (généré — ne pas éditer)\n${toc}\n\n${sections}`;
};
const convBody = assemble([core.method, core.global, ...core.meta, ...core.stacks, ...contexts]);

if (models.includes('anthropic')) writeManaged(join(outDir, 'CLAUDE.md'), convBody, 'CLAUDE.md');
if (models.includes('gemini')) writeManaged(join(outDir, 'GEMINI.md'), convBody, 'GEMINI.md');
if (models.includes('copilot')) {
  writeManaged(join(outDir, '.github', 'copilot-instructions.md'), assemble([core.global, core.method, ...core.meta]), 'Copilot Instructions');
  for (const f of [...core.stacks, ...contexts]) write(join(outDir, '.github', 'instructions', `${basename(f, '.md')}.instructions.md`), headerAfterFrontmatter(read(f)));
}

// --- commandes (multi-techno, additives) : cœur + .ai/commands ; assemble {{stacks}} ; génère par modèle ---
const cmdSources = [...subdirs(coreCommandsDir).map((n) => [n, join(coreCommandsDir, n)]), ...subdirs(localCommandsDir).map((n) => [n, join(localCommandsDir, n)])];
const byName = new Map();
for (const [n, d] of cmdSources) { if (byName.has(n)) console.warn(`  ⚠️ commande '${n}' définie 2× (la locale écrase le cœur)`); byName.set(n, d); } // local après cœur → écrase
const pickedCommands = pick('commande', '--commands', 'commands', [...byName.keys()]);

function assembleCommand(dir) {
  const cmdFile = join(dir, 'command.md');
  if (!existsSync(cmdFile)) { console.warn(`  ⚠️ commande sans command.md : ${rel(dir)} — ignorée`); return null; }
  const raw = read(cmdFile);
  const frags = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'command.md' && requestedStacks.includes(basename(f, '.md'))).sort()
    .map((f) => stripFrontmatter(read(join(dir, f))).trim());
  const fragText = frags.join('\n\n');
  const skeleton = stripFrontmatter(raw).trim();
  const body = skeleton.includes('{{stacks}}') ? skeleton.replace('{{stacks}}', fragText) : (fragText ? `${skeleton}\n\n${fragText}` : skeleton);
  return { description: fmField(raw, 'description'), models: fmList(raw, 'models'), body };
}
let cmdWritten = 0;
for (const name of pickedCommands) {
  const cmd = assembleCommand(byName.get(name));
  if (!cmd) continue;
  const targets = cmd.models.length ? models.filter((m) => cmd.models.map((x) => ALIAS[x.toLowerCase()] || x.toLowerCase()).includes(m)) : models;
  const fm = `---\ndescription: ${JSON.stringify(cmd.description)}\n---\n`;
  if (targets.includes('anthropic')) write(join(outDir, '.claude', 'commands', `${name}.md`), fm + HEADER + cmd.body + '\n');
  if (targets.includes('copilot')) write(join(outDir, '.github', 'prompts', `${name}.prompt.md`), fm + HEADER + cmd.body + '\n');
  if (targets.includes('gemini')) write(join(outDir, '.gemini', 'commands', `${name}.toml`), `# GÉNÉRÉ par ai-core — édite commands/${name}/\ndescription = ${JSON.stringify(cmd.description)}\nprompt = '''\n${cmd.body}\n'''\n`);
  if (targets.length) cmdWritten++;
}

// --- orphelins : signés ai-core, plus écrits ce run → PROPOSER (jamais supprimer) ---
const orphans = [];
const scanDirs = [[join(outDir, '.github', 'instructions'), '.instructions.md'], [join(outDir, '.claude', 'commands'), '.md'], [join(outDir, '.github', 'prompts'), '.prompt.md'], [join(outDir, '.gemini', 'commands'), '.toml']];
for (const [dir, suf] of scanDirs) if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.endsWith(suf))) { const p = join(dir, f); if (!WRITTEN.has(resolve(p)) && aiSigned(p)) orphans.push(p); }
const ADAPTERS = { anthropic: 'CLAUDE.md', gemini: 'GEMINI.md', copilot: join('.github', 'copilot-instructions.md') };
for (const [m, relp] of Object.entries(ADAPTERS)) { if (models.includes(m)) continue; const p = join(outDir, relp); if (existsSync(p) && aiSigned(p)) orphans.push(p); }
if (orphans.length) {
  console.warn('  🧹 Orphelins (ancien sync, plus de source/modèle) — à SUPPRIMER toi-même si voulu :');
  for (const p of orphans) console.warn('     - ' + rel(p));
  console.warn('     (ai-core ne supprime jamais seul ; vérifie ta zone libre avant.)');
}

console.log('OK.');
if (cmdWritten) console.log(`💡 ${cmdWritten} commande(s) (re)générée(s) — redémarre ton IDE / assistant pour qu'il recharge ses slash-commands.`);
