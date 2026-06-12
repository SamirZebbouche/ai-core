# ROADMAP — ai-core

> État vivant des **trous dans la raquette** et des évolutions. Capturé pour ne plus avoir à tout tenir
> en tête. Coché = fait ; le reste = à arbitrer. Priorités : 🔜 court terme · 🟠 cœur (contenu, par PR)
> · 💡 gros morceaux · 🔒 limites connues.

## 📖 Glossaire (vocabulaire verrouillé — pour ne plus s'emmêler)

> 📖 **Source canonique : [`doc/lexique.md`](doc/lexique.md)** (hors cœur, non embarqué). Rappel rapide ci-dessous ; **en cas de conflit, le lexique fait foi.**

| Terme | C'est… | Où |
|---|---|---|
| **ai-core** *(l'outil)* | l'**application** (sync + matière embarquée) — **≠ « cœur »** | le paquet npm |
| **Cœur** | la source **embarquée & ratifiée** | `conventions/` + `commands/` |
| **Socle** *(agnostique)* | la part du cœur **sans langage** | `method` / `global` / `meta` |
| **Pack** | **namespace** de commandes (opt-in ; résout la collision par construction) | `commands/<pack>/` |
| **Skill de base** | comportement **toujours actif** (la méthode), non invocable | `conventions/method.md` (inliné) |
| **Convention** | règle **déclarative** (*quoi* respecter) | `conventions/` (cœur) + `.ai/contexts/` (projet) |
| **Skill craft** | commande **généraliste invocable**, paramétrée par le projet | `commands/` (**cœur**) |
| **Fragment** `<stack>.md` | partie **stack-spécifique** d'un skill craft multi-techno (additif) | dans un skill cœur |
| **Commande project-local** | commande **bespoke**, **OPAQUE** (ai-core n'y touche pas) | `.ai/commands/` |
| **`--consolidate`** | déplace les commandes natives → `.ai/commands/` + redistribue **verbatim** | CLI |

## ✅ Acquis (rappel d'orientation)

- **Hexagonal** : cœur neutre `conventions/` + `commands/` → adapters **générés** (Claude / Copilot / Gemini).
- **Sélection additive** : `models` · `stacks` · `commands` ; **défaut sain** (détecté, jamais « tous »).
- **Souplesse** : bloc managé (zone libre préservée) ; orphelins **proposés** ; garde-fous (marqueurs, options inconnues, collisions).
- **Détection** récursive profonde + **justifiée** (cite le fichier-preuve).
- **CLI transparence** : `--list` · `--detect-config` · `--config` (écrit, additif) · `--conventions` · `--consolidate` (rassemble les commandes natives) · `--help`.
- **Conventions auto-suffisantes** (plus de lien-fichier mort).
- **Commandes multi-techno additives** (project-local) ; la **délibération** est un *skill de base* (`method.md`), pas une commande.
- **CI** multi-Node + **couverture gatée** (~84 % branches) + **deliver** sur tag. 38 tests.

## 🧭 Modèle stabilisé — commandes · stacks · extensibilité *(session 12/06)*

> Vocabulaire canonique : **[`doc/lexique.md`](doc/lexique.md)** (hors cœur, **non embarqué**). Ci-dessous, les décisions.

**Commandes : packs = namespaces (la collision, résolue *par construction*)**
- Un **pack** = namespace de commandes par domaine, **opt-in** (`commands`), **agnostique par construction**.
- **Collision résolue par construction** : `commands/git/commit/` vs `commands/craft/commit/` → `/git:commit` vs `/craft:commit` (chemins de sortie distincts). Claude/Gemini = sous-dossiers natifs ; **Copilot dégrade** (préfixe plat `git-commit`). *Vraie* collision = **même pack + même nom** → le sync **échoue**. Local vs cœur = override volontaire (le local gagne, warn — déjà le cas).
- Packs candidats : **git** (create-pr, clean-orphan-branches) · **craft** (codify-rule = method §6, audit-conventions = §9, ratify) · **analyse** (audit, investigate, hotspots) · **tests** · **develop** · **infra**. **git + craft** = path-agnostiques → cœur **immédiat**.

**Chemins : complétion guidée (1ʳᵉ exéc.) — ⚡ remplace la « paramétrisation statique »**
- Plus de schéma de params en dur. Le **fragment** `<stack>.md` embarque une **méta-instruction** : au 1ᵉʳ run, l'IA **découvre** le concret (chemins de tests…), **demande confirmation**, puis **fige** en project-local. *Agnostique livré → concret au 1ᵉʳ run → déterministe ensuite.*
- Effet : **débloque** tests/develop/infra (plus « gatés par la paramétrisation ») et **dogfoode la méthode** (propose → gate humain → codifie).

**Stacks : détection *file-driven*, zéro table JS, zéro catalogue (B épurée)**
- **Une stack = un fichier `conventions/stacks/<x>.md`.** Sa détection vit dans son **frontmatter** : `detect: { files:[…] }` ou `detect: { dependency: … }`. Le moteur lit `stacks/*.md` → détection = **donnée**, plus du code (pas de table JS, **pas de fallback**, pas de catalogue).
- **Pas de fichier → pas d'avis → rien à détecter.** L'état « détecté mais non colorié » **n'existe pas** (artefact de l'ancien JS hardcodé). Projet vide → rien. ✅
- Stack manquante → **invitation à contribuer dans le README** (statique) : « PR sur `conventions/stacks/<x>.md` ». **Pas** de moteur runtime pour ça.
- **Conséquence assumée** : les détections JS java/go/python/rust **partent** ; un test change (`requirements.txt → python`). C'est une **simplification**.

**Stacks à embarquer : le moins possible, exprès (YAGNI)**
- Cœur public = **dotnet** (✓) **+ react/typescript** (dus). **Pas** de java/go/rust spéculatifs (= « pattern appliqué uniformément » que le réfuteur doit tuer).
- **Aspect** (testing, security, a11y) **≠ stack** (techno) : reste dans socle/stack tant qu'une friction ne l'émancipe pas.

**Extensibilité : deux horizons**
- **H1 (bientôt)** : packs = dossiers + frontmatter dans le cœur, sélection par config. Ajouter une stack/un pack = **des `.md`, zéro JS**.
- **H2 (plus tard)** : packs = **paquets npm tiers** (`@toi/ai-core-pack-git`) découverts par ai-core = modèle **plugin**. Réalise la vision « entreprise B reprend le cœur craft de A ». YAGNI tant qu'il n'y a qu'un cœur — mais le seam H1 le rend trivial.

**Références : cascade `@import › lien relatif › inline`** *(répond à la question parkée : oui, on matérialise dans `.ai/`)*
- Le sync **matérialise le cœur utile dans `.ai/`** (chemin stable, committé) ; `node_modules` = **source**, jamais cible. Adapters = **pointeurs minces** quand c'est possible.
- Par référence, le **meilleur mécanisme dispo** : ① `@import` (Claude/CLAUDE.md, **pas** les commandes) › ② lien relatif / méta-ordre (runtime) › ③ inline (filet garanti). *Diagramme : [`doc/lexique.md §F`](doc/lexique.md).*
- Sépare dans `.ai/` la **zone matérialisée** (regénérable) de la **zone authored** (`contexts/`, `commands/`).
- *(Implémentation future : ça **inverse** le sync actuel qui inline tout → chantier à part.)*

**Décidé cette session (ratifié)** : ✅ **pack** · ✅ **pas de fallback JS** (détection = donnée, une source) · ✅ **détection B-épurée** (stack = fichier) · ✅ **complétion guidée** > param statique · ✅ **cascade `@import›lien›inline` + matérialisation `.ai/`** · ✅ **lexique dans `doc/`** (hors cœur).

## 🔜 Court terme

- [ ] **Tag `v0.2.2`** (fix liens morts + `--import-commands`).
- [ ] **Resserrer l'auto-suffisance** : *stacks / contexts = **zéro renvoi*** (ils partent SEULS chez Copilot, scopés) ; self-contain `global.md`. La taxonomy est encore molle là-dessus.
- [ ] **`--conventions` trop étroit** : il rate `SETUP-AI`, `USER-JOURNEYS`, `ROADMAP`… → lister tous les `docs/*.md` ? rendre la regex configurable ?

## 🟠 Cœur — contenu (gouverné par PR)

- [ ] **Stack `react`** (`conventions/stacks/react.md`) — aujourd'hui `react` est sélectionnable mais ne « fait » rien (pas de convention cœur).
- [ ] **Remonter la stack .NET riche** de cvGenerator (procédure rich-vs-anemic, DI) dans `stacks/dotnet.md`.
- [ ] **Bibliothèque de skills *craft* au cœur** : aujourd'hui aucune commande cœur. **Candidats** = les commandes craft de cvGenerator (`/check`, `/watch`, `/create-pr`, `/clean-orphan-branches`) — **pas** project-spécifiques, seuls quelques **chemins** le sont. → les **migrer en skills cœur** (fragments par stack pour `check`/`watch`). Le projet les **sélectionne** (`commands`). **~~⚠️ Gaté par la paramétrisation~~ → débloqué par la *complétion guidée*** (cf. 🧭 Modèle stabilisé) : le fragment découvre/confirme/fige les chemins au 1ᵉʳ run. *(Les commandes vraiment bespoke restent project-local opaques.)*

## 💡 Gros morceaux (plus tard)

- [ ] **Paramétrisation des skills** → **réorientée en *complétion guidée*** (cf. 🧭 Modèle stabilisé) : plutôt qu'un schéma de params statique dans `package.json`, le fragment fait **découvrir + confirmer + figer** le concret (chemins) au 1ᵉʳ run. *(Reste à spécifier le format figé en project-local.)*
- [ ] **`--config` préserve le formatage** de `package.json` (insert chirurgical au lieu de `JSON.stringify` qui reflow les tableaux).
- [ ] **npm publish** au deliver (si un registry est voulu ; aujourd'hui : GitHub Release seule).

## 🔒 Limites connues (pas actionnables côté ai-core)

- **Duplication des commandes par modèle** : aucun outil ne lit-à-travers une référence **statique (`@import`, Claude seul)** → **recopies forcées** d'UNE source (sans drift). Symlinks non viables (Windows/git/assemblage multi-fichiers). **Nuance (12/06)** : un **méta-ordre runtime** (« lis tel fichier et exécute-le ») contourne ça sur **tous** les outils, pour le **volatil / conditionnel / la composition project-local** — au prix du **non-déterminisme** + **chemin valide au runtime** (donc **pas** vers le cœur en `node_modules`). → recopies forcées **seulement** quand la **garantie d'inline** est requise (stable, toujours-requis). Cf. `doc/lexique.md` §F.
- **Valeur de `.ai/commands/` (et de `--consolidate`) conditionnelle** : utile en **multi-LLM** (une source → N copies sans drift) **ou** pour l'**additif** (fragments = dossier obligatoire). En **mono-LLM + commande simple** → indirection pure ; autant garder `.claude/commands/` à la main. ai-core ne force pas. *(Le « réemploi » est à la génération, pas à la lecture.)*
- **Project-local = OPAQUE** : ai-core **n'interfère JAMAIS avec le contenu** d'une commande projet. `--consolidate` la **déplace + redistribue verbatim** (pas de parsing, pas de décomposition, on se moque du contenu).
- **Fragments `<stack>.md` (additif) = skills du CŒUR uniquement** : un skill **généraliste** (`commands/`) s'assemble depuis des fragments stack-spécifiques et **s'adapte aux stacks détectées** (ex. un `/check` *cœur* = `dotnet.md` + `react.md`). → Un `/check` fragmenté serait un **skill cœur** (futur, cf. paramétrisation « projet en entrée »), **jamais** du project-local.
- **Pas d'oracle de design** : la méthode (délibération) est *injectée*, pas *garantie* — seul l'humain rate les décisions. L'oracle (tests/build) ne couvre que l'implémentation.
- **Pointeur non uniforme** : la structure diffère selon le LLM (Claude tout en un / Copilot scopé) → un renvoi valide chez l'un est mort chez l'autre. Réponse : **auto-suffisance** (voir 🔜).

## 🎯 Adoption cvGenerator (le terrain réel)

- [ ] `git checkout main -- .claude/commands` → `npx ai-core-sync --consolidate` → commandes **opaques** (project-local, **zéro ingérence** : move + redistribue verbatim). *(Un `/check` fragmenté = futur skill cœur, pas ici.)*
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
- [ ] **Dogfooding** : ai-core **n'utilise pas ai-core** 😅 — pas de `CLAUDE.md` généré à sa racine. Lui
  donner sa propre config (`.ai/contexts/` si besoin + sync) pour que bosser *sur* ai-core applique sa
  méthode/conventions. *(Le « voyage » de ce projet mériterait que l'outil se mange lui-même.)*
- [x] ~~`/deliberate` = *skill de base* (method.md), pas une commande~~ — **fait**.
