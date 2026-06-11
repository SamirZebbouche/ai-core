#!/usr/bin/env node
// tools/sync-ai.mjs — ORCHESTRATEUR (adaptateur IO + CLI). La logique PURE vit dans tools/lib/.
// Zéro dépendance. Idempotent. Le sync ne SUPPRIME jamais : il propose (orphelins), avertit, ignore.
//
// SÉLECTION (la "finesse", additive) :
//   models   : --models  > package.json "ai-core".models   > tous (anthropic, gemini, copilot)
//   stacks   : --stacks   > package.json "ai-core".stacks    > auto-détectées, sinon aucune
//   commands : --commands > package.json "ai-core".commands  > toutes
//
// Usage : npx ai-core-sync [--out DIR] [--models a,b] [--stacks a,b] [--commands a,b] [--list|--help|--config]

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fmField, fmList, firstH1, stripFrontmatter } from './lib/text.mjs';
import { managedBlock } from './lib/managed.mjs';
import { assembleConventions, assembleCommandBody } from './lib/assemble.mjs';
import { MODELS, normModel, pick } from './lib/select.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const coreDir = resolve(scriptDir, '..', 'conventions');
const coreCommandsDir = resolve(scriptDir, '..', 'commands');

const args = process.argv.slice(2);
const argVal = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const projectDir = process.cwd();
const outDir = argVal('--out') ? resolve(projectDir, argVal('--out')) : projectDir;
const contextsDir = join(projectDir, '.ai', 'contexts');
const localCommandsDir = join(projectDir, '.ai', 'commands');

// Garde-fou : une option inconnue (flag mal orthographié) NE DOIT PAS tomber en silence dans le sync
// (qui écrit des fichiers). On échoue, avec une suggestion.
const VALUE_FLAGS = new Set(['--out', '--models', '--stacks', '--commands']);
const KNOWN_FLAGS = new Set([...VALUE_FLAGS, '--help', '-h', '--list', '--conventions', '--consolidate', '--import-commands', '--detect-config', '--detectConfig', '--detect', '--config']);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!a.startsWith('-')) continue; // valeur d'un flag, ou positionnel : ignoré
  if (!KNOWN_FLAGS.has(a)) {
    const bare = a.replace(/^-+/, '');
    const sugg = [...KNOWN_FLAGS].find((k) => { const kb = k.replace(/^-+/, ''); return bare && (kb.startsWith(bare) || bare.startsWith(kb)); });
    console.error(`Option inconnue : ${a}${sugg ? `  → voulais-tu dire ${sugg} ?` : ''}`);
    console.error('Aide : npx ai-core-sync --help');
    process.exit(1);
  }
  if (VALUE_FLAGS.has(a)) i++; // saute la valeur
}

const HEADER = "<!-- GÉNÉRÉ par ai-core/tools/sync-ai — n'édite PAS, édite le cœur (conventions/, commands/) -->\n";

// --- IO helpers ---
const read = (p) => readFileSync(p, 'utf8');
const posix = (p) => p.split('\\').join('/');
const rel = (p) => posix(relative(outDir, p)) || basename(p);
const mdFiles = (dir) => existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').sort() : [];
const subdirs = (dir) => existsSync(dir) ? readdirSync(dir).filter((f) => { try { return statSync(join(dir, f)).isDirectory(); } catch { return false; } }).sort() : [];
const ensureDir = (p) => { if (!existsSync(p)) mkdirSync(p, { recursive: true }); };
const WRITTEN = new Set();
const write = (p, content) => { ensureDir(dirname(p)); writeFileSync(p, content); WRITTEN.add(resolve(p)); console.log('  →', rel(p)); };
const headerAfterFrontmatter = (content) => { const m = content.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/); return m ? m[1] + HEADER + content.slice(m[1].length) : HEADER + content; };
const aiSigned = (p) => { try { const s = read(p); return s.includes('ai-core:start') || s.includes('par ai-core'); } catch { return false; } };
const partsOf = (files) => files.map((f) => ({ name: basename(f), content: read(f) }));

function writeManaged(path, body, title) {
  const { content, warning } = managedBlock(existsSync(path) ? read(path) : null, body, title);
  if (content == null) { console.warn(`  ⚠️ ${rel(path)} : ${warning}`); return; }
  write(path, content);
}

// --- config projet + détection ---
let _cfg;
const projectCfg = () => { if (_cfg !== undefined) return _cfg; _cfg = {}; const pkg = join(projectDir, 'package.json'); if (existsSync(pkg)) { try { _cfg = JSON.parse(read(pkg))['ai-core'] || {}; } catch { /* */ } } return _cfg; };

// Détection best-effort, HONNÊTE et JUSTIFIÉE : un passage RÉCURSIF PROFOND (coût négligeable, 1×),
// patterns par techno. On exclut SEULEMENT les artefacts (node_modules, build, dotdirs) — PAS le code
// de l'utilisateur (poc, examples…). On détecte tout, on cite la PREUVE, l'humain nettoie.
const NOISE = new Set(['node_modules', 'dist', 'build', 'bin', 'obj', 'out', 'coverage', 'target', 'vendor', '__pycache__', 'venv', '.venv']);
// → { stack: 'chemin/relatif/de/la/preuve' } : la 1re preuve rencontrée par stack (pour justifier).
function detectStacks() {
  const ev = {};
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) { if (!e.name.startsWith('.') && !NOISE.has(e.name)) walk(join(dir, e.name)); continue; }
      const f = e.name, hit = (s) => { if (!ev[s]) ev[s] = posix(relative(projectDir, join(dir, f))) || f; };
      if (/\.(csproj|vbproj|fsproj|sln)$/i.test(f)) hit('dotnet');
      else if (f === 'go.mod') hit('go');
      else if (f === 'Cargo.toml') hit('rust');
      else if (f === 'pom.xml' || f === 'build.gradle' || f === 'build.gradle.kts') hit('java');
      else if (f === 'pyproject.toml' || f === 'setup.py' || f === 'requirements.txt' || f === 'Pipfile') hit('python');
      else if (f === 'package.json') { try { const pj = JSON.parse(read(join(dir, f))); if ({ ...pj.dependencies, ...pj.devDependencies }.react) hit('react'); } catch { /* */ } }
    }
  };
  walk(projectDir);
  return ev;
}

// Repère (honnêtement, chemin cité) les docs de convention courants : lexique, glossaire, ADR,
// architecture, contributing… Pour que l'IA les considère : les pointer depuis un context (cf. taxonomy).
function findConventionDocs() {
  const RX = /^(lexique|glossaire|glossary|ubiquitous|architecture|contributing|conventions?)[\w. -]*\.md$/i;
  const out = [];
  const walk = (dir) => {
    let entries; try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) { if (!e.name.startsWith('.') && !NOISE.has(e.name)) walk(join(dir, e.name)); continue; }
      if (RX.test(e.name) || /adr[-_ ]?\d/i.test(e.name)) out.push(posix(relative(projectDir, join(dir, e.name))));
    }
  };
  walk(projectDir);
  return out.sort().slice(0, 25);
}

// --- CLI informatif (sortie immédiate) ---
if (args.includes('--help') || args.includes('-h')) {
  console.log(`ai-core-sync — génère les adapters IA (conventions + commandes) depuis le cœur ai-core.

Usage : npx ai-core-sync [options]

Options
  --models a,b     modèles cibles : anthropic, gemini, copilot   (défaut : tous ; alias claude=anthropic)
  --stacks a,b     stacks à inclure                              (défaut : auto-détectées, sinon aucune)
  --commands a,b   commandes à générer                           (défaut : toutes)
  --out DIR        dossier de sortie                             (défaut : racine du projet)
  --list           catalogue : modèles / stacks / commandes disponibles
  --detect-config  AFFICHE le bloc "ai-core" suggéré (lecture seule, stacks auto-détectées)
  --config         ÉCRIT/met à jour "ai-core" dans package.json (ADDITIF : ajoute les stacks détectées, garde tes models)
  --conventions    liste les conventions injectées (transparence) + repère tes docs de convention (lexique, ADR…)
  --consolidate    consolide tes commandes natives éparpillées (.claude/commands, .github/prompts) en UNE source .ai/commands/
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

if (args.includes('--detect-config') || args.includes('--detectConfig') || args.includes('--detect')) {
  const ev = detectStacks();
  const detected = Object.keys(ev);
  console.log('Config ai-core suggérée (lecture seule — `--config` pour l\'écrire dans package.json) :\n');
  console.log('  "ai-core": {');
  console.log(`    "models": ${JSON.stringify(MODELS)},`);
  console.log(`    "stacks": ${JSON.stringify(detected)}`);
  console.log('  }\n');
  if (detected.length) { console.log('Détections (vérifie — retire ce qui n\'est pas une vraie stack du projet) :'); for (const s of detected) console.log(`  - ${s}  ←  ${ev[s]}`); }
  else console.log('Aucune stack détectée — ajoute les tiennes (npx ai-core-sync --list).');
  console.log('Modèles : anthropic, gemini, copilot — retire ceux que tu n\'utilises pas (alias claude=anthropic).');
  process.exit(0);
}

if (args.includes('--config')) {
  const pkgPath = join(projectDir, 'package.json');
  if (!existsSync(pkgPath)) { console.error('Pas de package.json à la racine — `npm init` d\'abord (ou `--detect-config` pour juste afficher).'); process.exit(1); }
  let raw, pkg;
  try { raw = read(pkgPath); pkg = JSON.parse(raw); } catch { console.error('package.json illisible / JSON invalide.'); process.exit(1); }
  const ev = detectStacks();
  const detected = Object.keys(ev);
  const cfg = pkg['ai-core'];
  let msg;
  if (!cfg) {
    pkg['ai-core'] = { models: MODELS, stacks: detected };
    msg = `✅ Bloc "ai-core" créé — stacks: ${detected.join(', ') || '—'} · models: ${MODELS.join(', ')}.`;
  } else {
    // ADDITIF : ajoute les stacks détectées absentes ; PRÉSERVE models & co.
    const cur = Array.isArray(cfg.stacks) ? cfg.stacks : [];
    const added = detected.filter((s) => !cur.includes(s));
    if (!added.length) { console.log(`Bloc "ai-core" déjà à jour (stacks: ${cur.join(', ') || '—'}). Rien à ajouter.`); process.exit(0); }
    cfg.stacks = [...cur, ...added];
    msg = `✅ Stacks ajoutées : ${added.join(', ')} (total: ${cfg.stacks.join(', ')}). models inchangés.`;
  }
  const indent = (raw.match(/\n([ \t]+)"/) || [null, '  '])[1];
  writeFileSync(pkgPath, JSON.stringify(pkg, null, indent) + (raw.endsWith('\n') ? '\n' : ''));
  console.log(msg);
  if (detected.length) { console.log('Détections (vérifie/nettoie dans package.json) :'); for (const s of detected) console.log(`  - ${s}  ←  ${ev[s]}`); }
  console.log('Puis : npx ai-core-sync');
  process.exit(0);
}

if (args.includes('--list')) {
  console.log('Catalogue ai-core');
  console.log('  modèles            :', MODELS.join(', '));
  console.log('  stacks (cœur)      :', mdFiles(join(coreDir, 'stacks')).map((f) => basename(f, '.md')).join(', ') || '—');
  console.log('  commandes (cœur)   :', subdirs(coreCommandsDir).join(', ') || '—');
  console.log('  commandes (projet) :', subdirs(localCommandsDir).join(', ') || '—');
  console.log('  contexts (projet)  :', mdFiles(contextsDir).map((f) => basename(f, '.md')).join(', ') || '—');
  process.exit(0);
}

if (args.includes('--consolidate') || args.includes('--import-commands')) {
  // CONSOLIDE les commandes natives éparpillées par outil (NON générées par ai-core) en UNE source neutre
  // .ai/commands/ — rassemble + dédoublonne (ex. check.md de Claude + check.prompt.md de Copilot → 1 source).
  const sources = [[join(projectDir, '.claude', 'commands'), '.md'], [join(projectDir, '.github', 'prompts'), '.prompt.md']];
  const imported = [], skipped = [], seen = new Set();
  for (const [dir, suf] of sources) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(suf))) {
      const name = f.slice(0, -suf.length);
      const p = join(dir, f);
      if (aiSigned(p) || seen.has(name)) continue; // générée par ai-core, ou déjà importée d'un autre outil
      seen.add(name);
      if (existsSync(join(localCommandsDir, name))) { skipped.push(name); continue; } // non destructif
      write(join(localCommandsDir, name, 'command.md'), read(p));
      imported.push(`${name}  ←  ${rel(p)}`);
    }
  }
  console.log(imported.length ? 'Commandes consolidées dans .ai/commands/ :' : 'Aucune commande native à consolider (.claude/commands/, .github/prompts/).');
  for (const i of imported) console.log('  + ' + i);
  if (skipped.length) console.log('Déjà présentes (non écrasées) : ' + skipped.join(', '));
  if (imported.length) console.log('→ Décompose-les en fragments `<stack>.md` si multi-techno, puis : npx ai-core-sync');
  process.exit(0);
}

if (args.includes('--conventions')) {
  const titleOf = (p) => { try { return firstH1(stripFrontmatter(read(p))) || basename(p); } catch { return basename(p); } };
  const stacks = (() => { const f = argVal('--stacks'); if (f) return f.split(',').map((s) => s.trim()).filter(Boolean); if (Array.isArray(projectCfg().stacks)) return projectCfg().stacks; return Object.keys(detectStacks()); })();
  console.log('Conventions injectées dans tes adapters — ce que l\'IA suit RÉELLEMENT :\n');
  console.log('  Cœur (partagé, gouverné par ai-core) :');
  for (const p of [join(coreDir, 'method.md'), join(coreDir, 'global.md'), ...mdFiles(join(coreDir, 'meta')).map((f) => join(coreDir, 'meta', f))]) console.log(`    · ${titleOf(p)}`);
  console.log(`  Stacks (${stacks.join(', ') || 'aucune'}) :`);
  const stackFiles = mdFiles(join(coreDir, 'stacks')).filter((f) => stacks.includes(basename(f, '.md')));
  if (stackFiles.length) for (const f of stackFiles) console.log(`    · ${titleOf(join(coreDir, 'stacks', f))}`);
  else console.log('    · (aucune convention de stack du cœur pour ces stacks)');
  console.log('  Contexts projet (.ai/contexts/) :');
  const ctx = mdFiles(contextsDir);
  if (ctx.length) for (const f of ctx) console.log(`    · ${titleOf(join(contextsDir, f))}`);
  else console.log('    · (aucun — c\'est ici que tu mets tes règles locales)');
  const docs = findConventionDocs();
  if (docs.length) {
    console.log('\n  📎 Docs de convention repérés dans le projet — pour que l\'IA les considère, pointe-les depuis un context (cf. taxonomy.md) :');
    for (const d of docs) console.log(`    · ${d}`);
  } else {
    console.log('\n  💡 Conventions projet courantes à expliciter (cf. taxonomy.md) : Ubiquitous Language → .ai/contexts/lexique.md (pointe docs/lexique.md) · ADRs → un context pointant docs/adr/ · design system.');
  }
  process.exit(0);
}

// --- collecte ---
if (!existsSync(coreDir)) { console.error('ERREUR : cœur introuvable :', coreDir); process.exit(1); }
const allStacks = mdFiles(join(coreDir, 'stacks')).map((f) => join(coreDir, 'stacks', f));
// stacks DEMANDÉES (brutes) : une stack peut n'exister que comme fragment de commande (react sans convention cœur).
const requestedStacks = (() => {
  const f = argVal('--stacks');
  if (f) return f.split(',').map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(projectCfg().stacks)) return projectCfg().stacks;
  return Object.keys(detectStacks()); // défaut SAIN : détectées, sinon AUCUNE (jamais "toutes")
})();
const core = {
  method: join(coreDir, 'method.md'),
  global: join(coreDir, 'global.md'),
  meta: mdFiles(join(coreDir, 'meta')).map((f) => join(coreDir, 'meta', f)),
  stacks: allStacks.filter((f) => requestedStacks.includes(basename(f, '.md'))),
};
const contexts = mdFiles(contextsDir).map((f) => join(contextsDir, f));

const modelSel = pick(argVal('--models'), projectCfg().models, MODELS, normModel);
const models = modelSel.selected;
if (modelSel.missing.length) console.warn('  ⚠️ modèle(s) inconnu(s) :', modelSel.missing.join(', '));

const collide = core.stacks.map((f) => basename(f, '.md')).filter((n) => contexts.some((f) => basename(f, '.md') === n));
if (collide.length) console.warn('  ⚠️ collision stack/context (même nom → même .instructions.md ; le context gagne) :', collide.join(', '));

console.log(`ai-core sync → ${posix(relative(projectDir, outDir)) || '.'}`);
console.log(`  modèles : ${models.join(', ') || '—'}  ·  stacks : ${requestedStacks.join(', ') || '—'}  ·  contexts : ${contexts.length}`);

// --- conventions (bloc managé : zone libre préservée) ---
const convBody = assembleConventions(partsOf([core.method, core.global, ...core.meta, ...core.stacks, ...contexts]));
if (models.includes('anthropic')) writeManaged(join(outDir, 'CLAUDE.md'), convBody, 'CLAUDE.md');
if (models.includes('gemini')) writeManaged(join(outDir, 'GEMINI.md'), convBody, 'GEMINI.md');
if (models.includes('copilot')) {
  writeManaged(join(outDir, '.github', 'copilot-instructions.md'), assembleConventions(partsOf([core.global, core.method, ...core.meta])), 'Copilot Instructions');
  for (const f of [...core.stacks, ...contexts]) write(join(outDir, '.github', 'instructions', `${basename(f, '.md')}.instructions.md`), headerAfterFrontmatter(read(f)));
}

// --- commandes (multi-techno, additives) ---
const cmdSources = [...subdirs(coreCommandsDir).map((n) => [n, join(coreCommandsDir, n)]), ...subdirs(localCommandsDir).map((n) => [n, join(localCommandsDir, n)])];
const byName = new Map();
for (const [n, d] of cmdSources) { if (byName.has(n)) console.warn(`  ⚠️ commande '${n}' définie 2× (la locale écrase le cœur)`); byName.set(n, d); }
const cmdSel = pick(argVal('--commands'), projectCfg().commands, [...byName.keys()]);
if (cmdSel.missing.length) console.warn('  ⚠️ commande(s) inconnue(s) :', cmdSel.missing.join(', '));

function buildCommand(dir) {
  const cmdFile = join(dir, 'command.md');
  if (!existsSync(cmdFile)) { console.warn(`  ⚠️ commande sans command.md : ${rel(dir)} — ignorée`); return null; }
  const raw = read(cmdFile);
  const frags = readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'command.md' && requestedStacks.includes(basename(f, '.md'))).sort().map((f) => read(join(dir, f)));
  return { description: fmField(raw, 'description'), models: fmList(raw, 'models'), body: assembleCommandBody(raw, frags) };
}

let cmdWritten = 0;
for (const name of cmdSel.selected) {
  const cmd = buildCommand(byName.get(name));
  if (!cmd) continue;
  const targets = cmd.models.length ? models.filter((m) => cmd.models.map(normModel).includes(m)) : models;
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
