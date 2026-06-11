# HOWTO — brancher `ai-core` sur un projet

> Tu gères **`.ai/contexts/`** (tes règles) + ta **zone libre** dans `CLAUDE.md`/`GEMINI.md`. ai-core ne
> réécrit qu'un **bloc balisé** ; le cœur vit dans `node_modules` (npm).
> *(Le « pourquoi » est dans [README.md](README.md) ; ici, juste les gestes.)*

## 1. Installer (une fois)

```bash
npm i -D github:SamirZebbouche/ai-core#v0.1.0
```

Dans **`package.json`** — choisis tes **modèles** + **stacks** (ou `npx ai-core-sync --config` te suggère le bloc) :

```jsonc
{
  "ai-core": {
    "models": ["anthropic", "copilot"],   // assistants : anthropic, gemini, copilot (sinon : tous)
    "stacks": ["dotnet", "react"]          // additive (sinon : auto-détectées, sinon aucune)
  }
}
```

> Un shop **Claude-only** met `"models": ["anthropic"]` → pas de `GEMINI.md` ni `.github/` qui polluent.
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

> **Où ranger une règle ?** (cœur / stack / context / référence-pointeur) → la convention de placement est
> dans [`conventions/meta/taxonomy.md`](conventions/meta/taxonomy.md) — *le rangement EST une convention*.

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

## 2bis. Commandes projet — multi-techno, additives (optionnel)

Une commande vit dans `.ai/commands/<nom>/` : un `command.md` (squelette) + des fragments `<stack>.md`
**assemblés selon tes stacks**. Ex. `/check` = back .NET **+** front React :

```
.ai/commands/check/
  command.md   # description + intro + {{stacks}} + comportement attendu
  dotnet.md    # inclus SI stack dotnet  (le fix Windows BaseOutputPath vit ici)
  react.md     # inclus SI stack react
```

→ génère `.claude/commands/check.md` (+ `.github/prompts/`, `.gemini/commands/` selon `models`).
**Une source → tous les formats, drift impossible.** (La **délibération** n'est pas une commande : c'est un *skill de base*, toujours actif, dans `conventions/method.md`.)

## 3. Générer

```bash
npx ai-core-sync     # → CLAUDE.md, GEMINI.md, .github/*, .claude/commands/* (au root, pour les outils)
```

C'est tout. Claude / Copilot / Gemini lisent désormais **la même méthode** + **tes règles locales**.

## Au quotidien

| Tu veux… | Tu fais |
|----------|---------|
| changer un contexte | édite `.ai/contexts/*.md` → `npx ai-core-sync` |
| changer de stacks | édite `package.json` `"ai-core".stacks` → `npx ai-core-sync` |
| changer de modèles | édite `package.json` `"ai-core".models` → `npx ai-core-sync` |
| ajouter une commande | crée `.ai/commands/<nom>/command.md` (+ `<stack>.md`) → `npx ai-core-sync` |
| voir / configurer | `npx ai-core-sync --list` · `--config` · `--help` |
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
