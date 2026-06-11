#!/usr/bin/env node
// scripts/coverage-report.mjs — transforme la sortie de `node --test --experimental-test-coverage`
// en tableau Markdown. Écrit dans $GITHUB_STEP_SUMMARY si défini, sinon sur stdout.
// CI-only : ce dossier scripts/ n'est PAS dans le champ "files" du package (non publié).
//
// Usage : node scripts/coverage-report.mjs [cov.txt]

import { readFileSync, appendFileSync } from 'node:fs';

const src = process.argv[2] || 'cov.txt';
const txt = readFileSync(src, 'utf8').replace(/ℹ/g, ' '); // retire le marqueur ℹ
const lines = txt.split(/\r?\n/);
const s = lines.findIndex((l) => /start of coverage report/.test(l));
const e = lines.findIndex((l) => /end of coverage report/.test(l));
const rows = (s >= 0 && e > s ? lines.slice(s + 1, e) : lines)
  .filter((l) => l.includes('|'))
  .map((l) => l.split('|').map((c) => c.trim()));

let out = '## 📊 Rapport de couverture (Node built-in, zéro dépendance)\n\n';
out += '| Fichier | Lignes | Branches | Fonctions |\n|---|--:|--:|--:|\n';
for (const [file, line, branch, funcs] of rows) {
  if (!file || !/^[\d.]+$/.test(line)) continue; // saute l'en-tête et les séparateurs
  const label = /all files/i.test(file) ? `**${file}**` : file;
  out += `| ${label} | ${line}% | ${branch}% | ${funcs}% |\n`;
}

const dest = process.env.GITHUB_STEP_SUMMARY;
if (dest) appendFileSync(dest, out + '\n');
else process.stdout.write(out + '\n');
