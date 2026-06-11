# HOWTO — brancher `ai-core` sur un projet

> Tu gères **`.ai/contexts/`** (tes règles) + ta **zone libre** dans `CLAUDE.md`/`GEMINI.md`. ai-core ne
> réécrit qu'un **bloc balisé** ; le cœur vit dans `node_modules` (npm).
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
  }
}
```

> Un shop **Claude-only** met `"tools": ["claude"]` → pas de `GEMINI.md` ni `.github/` qui polluent.
> Optionnel — auto-rafraîchir le bloc à chaque install : `"scripts": { "postinstall": "ai-core-sync" }`.

### Souplesse — zone managée vs zone libre

Les adapters (`CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`) sont **committés** (pas
gitignorés). Le sync ne réécrit **que** le bloc balisé :

```markdown
# CLAUDE.md
Tes instructions PROJET, à la main.            ← zone LIBRE : le sync n'y touche JAMAIS

<!-- ai-core:start — zone GÉNÉRÉE -->
… méthode + conventions + stacks + contexts …  ← seule zone réécrite
<!-- ai-core:end -->
```

Tu places le bloc où tu veux ; tes ajouts au-dessus/au-dessous sont **préservés** à chaque re-sync.
*(Instructions Copilot manuelles : ajoute TON propre `.github/instructions/<x>.instructions.md` — le sync
ne touche que les fichiers qu'il génère.)*

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
| mettre à jour le cœur | `npm update @samirzebbouche/ai-core` → `npx ai-core-sync` |
| proposer une règle au cœur | PR sur le repo `ai-core` → ratification → bump |

## Ce qui vit où (footprint minimal)

| | Où | Dans ton git ? |
|---|----|----|
| **ton** travail | `.ai/contexts/*.md` | ✅ committé |
| sélection de stacks | `package.json` `"ai-core".stacks` | ✅ |
| le cœur partagé | `node_modules/@samirzebbouche/ai-core/` | ❌ (npm, épinglé) |
| adapters | `CLAUDE.md` · `GEMINI.md` · `.github/*` | ✅ committés (**bloc managé** + ta zone libre) |

→ Tu gères `.ai/contexts/` + ta zone libre. Les adapters au root sont **imposés par les outils** (ils les
cherchent là) — mais ai-core n'en possède qu'un **bloc balisé**, jamais ta prose. Zéro écrasement.
