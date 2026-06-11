# ROADMAP — ai-core

> État vivant des **trous dans la raquette** et des évolutions. Capturé pour ne plus avoir à tout tenir
> en tête. Coché = fait ; le reste = à arbitrer. Priorités : 🔜 court terme · 🟠 cœur (contenu, par PR)
> · 💡 gros morceaux · 🔒 limites connues.

## ✅ Acquis (rappel d'orientation)

- **Hexagonal** : cœur neutre `conventions/` + `commands/` → adapters **générés** (Claude / Copilot / Gemini).
- **Sélection additive** : `models` · `stacks` · `commands` ; **défaut sain** (détecté, jamais « tous »).
- **Souplesse** : bloc managé (zone libre préservée) ; orphelins **proposés** ; garde-fous (marqueurs, options inconnues, collisions).
- **Détection** récursive profonde + **justifiée** (cite le fichier-preuve).
- **CLI transparence** : `--list` · `--detect-config` · `--config` (écrit, additif) · `--conventions` · `--consolidate` (rassemble les commandes natives) · `--help`.
- **Conventions auto-suffisantes** (plus de lien-fichier mort).
- **Commandes multi-techno additives** (project-local) ; la **délibération** est un *skill de base* (`method.md`), pas une commande.
- **CI** multi-Node + **couverture gatée** (~84 % branches) + **deliver** sur tag. 38 tests.

## 🔜 Court terme

- [ ] **Tag `v0.2.2`** (fix liens morts + `--import-commands`).
- [ ] **Resserrer l'auto-suffisance** : *stacks / contexts = **zéro renvoi*** (ils partent SEULS chez Copilot, scopés) ; self-contain `global.md`. La taxonomy est encore molle là-dessus.
- [ ] **`--conventions` trop étroit** : il rate `SETUP-AI`, `USER-JOURNEYS`, `ROADMAP`… → lister tous les `docs/*.md` ? rendre la regex configurable ?

## 🟠 Cœur — contenu (gouverné par PR)

- [ ] **Stack `react`** (`conventions/stacks/react.md`) — aujourd'hui `react` est sélectionnable mais ne « fait » rien (pas de convention cœur).
- [ ] **Remonter la stack .NET riche** de cvGenerator (procédure rich-vs-anemic, DI) dans `stacks/dotnet.md`.
- [ ] **Skills généralistes du cœur** : aucun pour l'instant (la délibération est un *skill de base* dans `method.md`, pas une commande). En ajouter si vraiment project-agnostiques.

## 💡 Gros morceaux (plus tard)

- [ ] **Paramétrisation des skills** : commande généraliste + « **projet en entrée** » rempli depuis `package.json`, au lieu de chemins en dur (ex. `/watch` générique vs `dotnet watch src/cv-generator-back`). C'est le vrai rôle visé de l'option `commands`.
- [ ] **`--config` préserve le formatage** de `package.json` (insert chirurgical au lieu de `JSON.stringify` qui reflow les tableaux).
- [ ] **npm publish** au deliver (si un registry est voulu ; aujourd'hui : GitHub Release seule).

## 🔒 Limites connues (pas actionnables côté ai-core)

- **Duplication des commandes par modèle** : aucun outil ne lit-à-travers une référence → **recopies forcées** (mais d'**UNE source** → sans drift). Symlinks non viables (Windows/git/assemblage multi-fichiers). On est « condamné » au moins-pire propre.
- **Valeur de `.ai/commands/` (et de `--consolidate`) conditionnelle** : utile en **multi-LLM** (une source → N copies sans drift) **ou** pour l'**additif** (fragments = dossier obligatoire). En **mono-LLM + commande simple** → indirection pure ; autant garder `.claude/commands/` à la main. ai-core ne force pas. *(Le « réemploi » est à la génération, pas à la lecture.)*
- **Additif par techno (fragments `<stack>.md`) — DEUX usages distincts** :
  1. **organisation modulaire** d'une commande **multi-techno** (chaque partie stack-spécifique a sa spécificité — ex. `/check` = `dotnet.md` avec le fix `BaseOutputPath` + `react.md` avec vitest). **Vaut AUSSI en project-local** (pas que le cœur). C'est un **découpage délibéré** que l'auteur fait.
  2. **adaptation** d'une commande **généraliste** à des projets à stacks variées (concern du cœur).
  → C'est **distinct de `--consolidate`** (qui importe **flat + opaque**, sans décomposer). Le moteur `{{stacks}}` **n'est pas dormant** : `/check` l'utilise. *(Correction d'une capture YAGNI trop hâtive.)*
- **Pas d'oracle de design** : la méthode (délibération) est *injectée*, pas *garantie* — seul l'humain rate les décisions. L'oracle (tests/build) ne couvre que l'implémentation.
- **Pointeur non uniforme** : la structure diffère selon le LLM (Claude tout en un / Copilot scopé) → un renvoi valide chez l'un est mort chez l'autre. Réponse : **auto-suffisance** (voir 🔜).

## 🎯 Adoption cvGenerator (le terrain réel)

- [ ] `git checkout main -- .claude/commands` → `npx ai-core-sync --consolidate` (flat) → **puis décomposer** `/check` & `/watch` en fragments `dotnet.md` / `react.md` (chacun sa spécificité).
- [ ] Context-pointeurs : `.ai/contexts/lexique.md` (→ `docs/LEXIQUE.md`), `.ai/contexts/adr.md` (→ `docs/adr/`).
- [ ] Règles projet (couplage back/front, design-system, testing) → `.ai/contexts/`.

## ➕ Tes ajouts (cités au fil)

- [ ] **`--help <command>`** : afficher le rôle/description d'une commande (lit son `command.md`). *(DX)*
- [ ] **`--config` en une étape** : qu'il **consolide** aussi les commandes natives et **active** celles
  compatibles avec les **stacks détectées** (setup complet, pas juste `models` + `stacks`).
- [ ] **`--consolidate` = bouger + redistribuer** (commandes custom) : *déplace* la native dans
  `.ai/commands/` (source) **puis régénère sur TOUS les systèmes LLM** (selon `models`). **Content-opaque**
  (on ne parse/décompose rien — le contenu est un bloc). *Auj. : il **copie** (pas move) et **ne
  redistribue pas** (sync séparé)* → à faire : **move** (retirer l'original natif) + **enchaîner la régénération**.
- [ ] **Consolider les *stacks*** : étendre `--consolidate` aux **conventions de stack/context natives**
  (`.github/instructions/*.instructions.md`) → source `.ai/contexts/`. C'est aussi le canal pour
  *remonter la stack .NET riche* de cvGenerator. Aujourd'hui `--consolidate` ne prend que les commandes.
- [x] ~~`/deliberate` = *skill de base* (method.md), pas une commande~~ — **fait**.
