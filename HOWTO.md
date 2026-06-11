# HOWTO — brancher `ai-core` sur un projet

> Tu ne gères qu'**UN dossier** : `.ai/`. Le reste est **généré** (gitignoré) ou **géré par npm**.
> *(Le « pourquoi » est dans [README.md](README.md) ; ici, juste les gestes.)*

## 1. Installer (une fois)

```bash
npm i -D github:SamirZebbouche/ai-core#v0.1.0
```

Dans **`package.json`** — choisis tes **outils** + **stacks**, et auto-régénère à l'install :

```jsonc
{
  "ai-core": {
    "tools":  ["claude", "copilot"],   // quels assistants générer (sinon : tous)
    "stacks": ["dotnet", "react"]       // quelles stacks inclure — additive (sinon : toutes)
  },
  "scripts": { "postinstall": "ai-core-sync" }   // régénère les adapters à chaque npm install
}
```

> Un shop **Claude-only** met `"tools": ["claude"]` → pas de `GEMINI.md` ni `.github/` qui polluent.

Dans **`.gitignore`** — les adapters générés ne polluent pas le repo :

```gitignore
# ai-core — adapters générés (régénérés par `npx ai-core-sync` / postinstall)
/CLAUDE.md
/GEMINI.md
/.github/copilot-instructions.md
/.github/instructions/
```

## 2. Écrire tes bounded contexts (le seul vrai travail)

Un fichier par contexte dans **`.ai/contexts/`** :

```markdown
---
context: billing
applyTo: "src/**/Billing/**"
---
# Billing
- Pattern : Event-Sourcing (l'historique EST la valeur). Value Objects riches ici.
```

```markdown
---
context: catalog
applyTo: "src/**/Catalog/**"
---
# Catalog
- CRUD assumé. ❌ Pas de Value Object dans les ViewModels.
```

## 3. Générer

```bash
npx ai-core-sync     # → CLAUDE.md, GEMINI.md, .github/* (au root, pour que les outils les trouvent)
```

C'est tout. Claude / Copilot / Gemini lisent désormais **la même méthode** + **tes règles locales**.

## Au quotidien

| Tu veux… | Tu fais |
|----------|---------|
| changer un contexte | édite `.ai/contexts/*.md` → `npx ai-core-sync` |
| changer de stacks | édite `package.json` `"ai-core".stacks` → `npx ai-core-sync` |
| changer d'assistants | édite `package.json` `"ai-core".tools` → `npx ai-core-sync` |
| mettre à jour le cœur | `npm update @samirzebbouche/ai-core` (le `postinstall` régénère) |
| proposer une règle au cœur | PR sur le repo `ai-core` → ratification → bump |

## Ce qui vit où (footprint minimal)

| | Où | Dans ton git ? |
|---|----|----|
| **ton** travail | `.ai/contexts/*.md` | ✅ committé |
| sélection de stacks | `package.json` `"ai-core".stacks` | ✅ |
| le cœur partagé | `node_modules/@samirzebbouche/ai-core/` | ❌ (npm, épinglé) |
| adapters | `CLAUDE.md` · `GEMINI.md` · `.github/*` | ❌ gitignorés (générés) |

→ Dans ton repo, tu ne vois que **`.ai/`** + quelques lignes de `package.json`. Pollution minimale.
