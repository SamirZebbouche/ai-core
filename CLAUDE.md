# CLAUDE.md

<!-- ───────────────────────── ZONE LIBRE (ai-core n'y touche jamais) ───────────────────────── -->

> **Ce dépôt EST le cœur `ai-core`** — et il se **dogfoode** : le bloc managé ci-dessous est généré
> *depuis ses propres `conventions/`* par `node tools/sync-ai.mjs`. Si l'outil n'arrivait pas à se
> configurer lui-même, on le verrait ici en premier. *(On mange notre propre nourriture.)*

## Travailler sur ce repo
- **N'édite jamais le bloc managé** ci-dessous → édite `conventions/`, puis relance `node tools/sync-ai.mjs`.
  La CI (job **`dogfood`**) échoue si `CLAUDE.md` dérive de `conventions/`.
- **Zéro dépendance, ESM pur, Node ≥ 18.** `npm test` (runner `node:test`). Couverture : lines 95 / funcs 90 / branches 80.
- **Hexagonal appliqué à l'outil** : la logique pure vit dans `tools/lib/*` (testable, sans IO) ;
  `tools/sync-ai.mjs` est l'**orchestrateur** (adaptateur IO + CLI). Garde `lib/` pur.
- **Contribuer une règle = éditer `conventions/` puis PR** (= la ratification). Jamais l'adapter.
- Démo de génération multi-modèle : `npm run sync` (→ `.sync-out/`, gitignoré).

<!-- ─────────────────────────────── FIN ZONE LIBRE ─────────────────────────────── -->

<!-- ai-core:start — zone GÉNÉRÉE, ne pas éditer (édite conventions/ puis relance le sync) -->
## Sommaire (généré — ne pas éditer)
- [Méthode de travail IA — protocole de délibération](#méthode-de-travail-ia--protocole-de-délibération)
- [Constitution globale — s'applique PARTOUT](#constitution-globale--sapplique-partout)
- [Principes d'architecture (méta) — le *pourquoi*](#principes-darchitecture-méta--le-pourquoi)
- [Taxonomie — où va quoi ? (le rangement EST une convention)](#taxonomie--où-va-quoi--le-rangement-est-une-convention)

<!-- ───── method.md ───── -->
# Méthode de travail IA — protocole de délibération

> *Comment* l'IA travaille (pas *quoi* respecter — ça, c'est `global.md`, `stacks/`, `contexts/`).
> S'applique à tous les outils ; chacun l'exécute à la mesure de ses capacités (cf. interop).

## 1. Le principe

> **L'IA délibère AVANT de proposer.** Elle ne va pas de « go » → code. Elle exécute une boucle
> **proposeur ↔ réfuteur (en arbre)**, où le **réfuteur est chargé des conventions** du projet,
> puis elle te présente une **approche passée au crible + l'arbre des branches tuées (et pourquoi)**.
> Tu restes la **gate** sur les décisions de design.

## 2. La distinction qui ne se ment pas : y a-t-il un oracle ?

| Type de tâche | Oracle objectif ? | La délibération produit… | Tier |
|---------------|:---:|------|:---:|
| **Implémenter** | ✅ tests / build / types / lint | du code **certifié** (~autonome) | 🟢 |
| **Décider / concevoir** | ❌ aucun juge de vérité | une **proposition passée au crible + le pourquoi** ; humain décide | 🟡/🔴 |

> Le réfuteur n'est **pas** un juge de *vérité* sur le design — c'est un juge de *jugement*.
> Il ne « certifie » jamais une archi ; il montre qu'elle a **survécu** à une critique rigoureuse.

## 3. La boucle

```
"GO sur cette remarque (feature / fix / refacto)"
        │
        ▼  [0] CLASSER LA PORTE  (cf. §4 : sizer la délibération au risque)
        ▼
   PROPOSEUR ── N approches concrètes
        │
        ▼
   RÉFUTEUR ── chargé de global.md + stacks/ + contexts/ + meta/
   (en ARBRE)   attaque chaque approche :
                • sur-applique-t-il un pattern ? (VO/ES partout)
                • casse-t-il / ignore-t-il un bounded context ?
                • crée-t-il une porte à sens unique inutile ?
                • est-ce le PLUS SIMPLE qui marche ? gagne-t-il son archi ?
                • viole-t-il TDD / SOLID / hexagonal / le langage métier ?
        │  backtrack sur violation prouvée · persiste sur le prometteur
        ▼
   PRÉSENTE À L'HUMAIN :
        • l'approche recommandée
        • les branches TUÉES + POURQUOI (contre quelle règle)
        │
        ▼  GATE HUMAINE (design) ──► IMPLÉMENTATION (boucle TDD, oracle réel) ──► /check
```

## 4. Règle d'or : délibération **proportionnelle à la porte**

⚠️ Ne pas sur-délibérer. À l'étape [0], l'IA classe la décision :

- **Porte à sens unique** (irréversible/risqué : frontière de bounded context, choix de persistance,
  contrat public, migration de données) → **délibère à fond** (arbre profond, agents en parallèle si dispo).
- **Porte à double sens / trivial** (rename, petit fix interne) → **fais-le, point.** Délibérer un typo = gaspillage.

> Dimensionner la délibération au **risque × irréversibilité**. C'est le méta-skill.

## 5. Ce que l'IA te livre (≠ « voilà le code »)

Pas « go → code », mais :
> *« Voici les 3 approches considérées. J'ai tué A (viole le bounded context `billing`) et B (sur-applique
> CQRS sur un domaine CRUD). Je recommande C. Voici pourquoi. »*

Tu pilotes au **niveau design**, avec **visibilité totale** sur le raisonnement. La trace de l'arbre
(branches mortes + motif) est l'artefact de collaboration — pas un détail.

## 6. Boucle d'apprentissage (alimente l'extensibilité)

Si le réfuteur tue **3× la même chose**, ou si tu **corriges 2× la même chose** → signal qu'une **règle
manque**. L'IA propose de la **codifier** (cf. `README.md` §4) — texte + fichier-cible + preuve. Tu ratifies.

## 7. Les tâches atomiques (où s'applique quel tier)

| Mode | Tâches | Qui mène |
|------|--------|----------|
| **🔵 Découverte** | comprendre · diagnostiquer · explorer · **décider/concevoir** | **humain** (IA assiste, ne décide pas) |
| **🟢 Production** | spécifier (test) · implémenter · refactorer · vérifier | **IA**, gardée par l'oracle (tests) |
| **🟠 Frontière** | réviser · auditer · documenter · intégrer/livrer | **gate** (auto + humaine) |

<!-- ───── global.md ───── -->
# Constitution globale — s'applique PARTOUT

> Règles non négociables, tous projets, tous contextes. (Exemple représentatif — à durcir par équipe.)

## Langue & nommage
- Conversation avec l'humain en **français** ; **code, noms, commentaires en anglais**.
- Utiliser l'**Ubiquitous Language** du domaine (pas de synonymes maison).

## Discipline de branches (STRICT)
- ⚠️ **Jamais directement sur `main`.** `main` n'arrive que par PR relue, CI verte.
- Un sujet = une branche. Préfixe conventional-commit : `feat/ fix/ chore/ ci/ docs/ refactor/ test/`.

## TDD — workflow obligatoire
- ⚠️ **Jamais de code de production sans test rouge préalable.** RED → GREEN → REFACTOR (sur vert).
- Petits incréments, un comportement à la fois. Bug = reproduire en test d'abord.
- Noms de tests = comportement, pas implémentation (`Should_X_When_Y`).

## Couplage back/front
- Un changement back n'est **pas fini** tant que le front n'est pas vérifié compatible (et vice-versa) :
  routes, DTOs/contrats, modèle de domaine, variables d'env.

> Les principes de design (SOLID, hexagonal, « gagne ton archi », anti sur-engineering) et le *comment
> travailler* (protocole de délibération) font partie de ce bundle — voir les sections **Principes
> d'architecture** et **Méthode**.

<!-- ───── architecture-principles.md ───── -->
# Principes d'architecture (méta) — le *pourquoi*

> Rubrique du **réfuteur** sur les décisions de design. Ce ne sont pas des recettes : ce sont des
> **détecteurs de sur-engineering** et des **règles de jugement**. Chaque pattern s'applique quand on
> sent la **douleur** qu'il soigne — jamais par identité d'équipe.

## 1. Développer = un apprentissage, pas un process

On **découvre** le bon design en construisant le mauvais. On ne connaît pas la bonne abstraction avant
d'avoir senti la mauvaise. Le « dev naïf → c'est le bazar → refacto » **n'est pas un échec de la
méthode : c'est la méthode.** La belle histoire linéaire est une *narration a posteriori*.

## 2. Gagne ton architecture (n'en hérite pas par défaut)

Commence au **plus simple** qui marche (souvent CRUD). Monte en DDD tactique / Event-Sourcing
**quand le domaine pousse**, pas avant. *YAGNI s'applique à l'archi.*
Sur-architecturer un domaine simple = aussi grave que du spaghetti.

## 3. Classe la porte (réversibilité)

- **Porte à double sens** (changer plus tard est cheap) → **diffère**, garde simple. (nommage, découpage interne)
- **Porte à sens unique** (le switch est catastrophique : frontières de BC, persistance, contrat public)
  → **c'est là que la prévoyance de l'architecte gagne sa croûte.** Choisis bien, en amont.

> Le skill = **classer la porte**, puis dépenser la prévoyance rare sur les portes à sens unique.
> L'**hexagonal défensif** est l'outil qui **transforme des portes à sens unique en double sens**
> (rend le swap d'infra cheap) — assurance d'optionalité, pas prédiction.

## 4. Effort différentiel (pas uniforme)

- **Dans le temps** : investis le design sur les **hotspots** (churn × complexité), laisse le stable tranquille.
  *« Ça marche, on touche pas »* est souvent le **bon** choix Craft — pas de la flemme.
- **Dans l'espace** : c'est le rôle des **bounded contexts**. On ne choisit pas *une* archi pour *un projet* —
  on choisit **une archi par contexte**, taillée à son domaine local.

## 5. N'applique pas un pattern uniformément (l'anti-pattern n°1)

> **Le sur-engineering = un *pattern juste*, appliqué *uniformément* là où il fallait l'appliquer
> *localement* — en effaçant les frontières qui auraient dû le contenir.**

Signaux à attraper (le réfuteur DOIT les flaguer) :
- **ES / CQRS sur tout le projet** → les 80 % CRUD paient la taxe pour les 20 %. Souvent un *substitut*
  au vrai travail de frontières (« on est un shop CQRS » remplace « où l'histoire crée-t-elle de la valeur ? »).
- **Value Objects partout** (jusque dans les requêtes SQL et les ViewModels) → la *primitive obsession*
  soignée si fort qu'elle devient *VO obsession*. **Viole la règle DDD :** domaine ≠ persistance ≠ présentation.

Qui **gagne** ES/CQRS : l'historique EST la valeur (audit, finance, régulation) · invariants complexes dans
le temps · forte asymétrie lecture/écriture. **Sinon : CRUD assumé.**

## 6. Un modèle par couche — la traduction EST la feature

VO et entités riches **vivent dans le domaine**. À chaque frontière, on **traduit** vers la forme dont
elle a besoin (DTO de persistance, DTO/ViewModel de présentation). Le **mapping n'est pas une corvée à
éliminer** : c'est la couche anti-corruption qui **garde les couches indépendantes** (le domaine évolue
sans casser le schéma SQL ni le format JSON). Supprimer la traduction « pour ne pas se répéter » = jeter
la réversibilité.

## 7. Le refacto est déclenché par la friction, pas par l'esthétique

Beck : *« make the change easy, then make the easy change. »* Quand *« ça devrait être simple mais ça
l'est pas »*, c'est le code qui te dit **où** l'abstraction est fausse. Refactore **juste ce qu'il faut**,
sur **vert**, et continue.

## 8. Les paradigmes sont du vocabulaire + un filet, pas des recettes

- **TDD** = un *oracle* pour être **téméraire en sécurité** et refactorer sans trembler.
- **DDD** = un *langage partagé* pour que le mess reste lisible à plusieurs.
- **Hexagonal** = isoler le **volatil** (infra) du **stable** (domaine) pour pouvoir swapper le volatil.

→ Applique-les **quand tu sens la douleur qu'ils soignent.**

## 9. Arbitrer les conflits : la hiérarchie *pondérée*

Les principes ci-dessus **se contredisent** (YAGNI vs SOLID, KISS vs Design Patterns, consistance vs
Boy-Scout). Une contradiction **n'est pas un bug à trancher** — c'est une tension permanente qu'on
**pondère**. Deux opérations *distinctes* :

- **Élaguer** une règle **morte / redondante** (ne se déclenche jamais, doublon exact) → hygiène pure.
- **Pondérer** deux règles **qui se contredisent** → on **garde les deux** ; en conflit, **la plus lourde
  (la plus fondamentale) gagne** ce round. Aucune n'est supprimée.

### Les poids de base — la pyramide *(d'après Bartosz Krajka)*

Du plus **fondamental** (lourd) au plus **aspirationnel** (léger). Méta-règle :
**« ne jamais saper une couche basse au profit d'une couche haute ».**

```
(lourd) Make it work → YAGNI → moindre surprise → KISS → consistance → DRY →
        clean code → SOLID → design patterns → agile → boy-scout → make it fast (léger)
```

> L'ordre exact des barreaux est discutable ; la valeur est la **méta-idée** (ranger, ne pas saper le bas).
> Réf. : *Principle of Software Development Principles*, B. Krajka.

### La modulation contextuelle *(notre étage en plus)*

⚠️ **Pas de poids numériques** — ce serait un faux formalisme (× *quoi* ?). La pyramide est un **ordre
qualitatif** ; le contexte le **ré-ordonne localement** :

- `billing` : l'Event-Sourcing **remonte au-dessus de KISS** (il est *gagné* — l'historique est la valeur).
- `catalog` : l'ES **reste tout en bas** → KISS le domine.

### La procédure du réfuteur

Sur chaque proposition : **comparer les principes *pondérés dans CE contexte***, et **rejeter** toute
approche qui laisse un principe **léger écraser un principe lourd**.

> VO/ES partout = Design Patterns (léger) qui écrasent YAGNI + KISS (lourds) → **rejet à vue**.

<!-- ───── taxonomy.md ───── -->
# Taxonomie — où va quoi ? (le rangement EST une convention)

> Quand l'IA **propose** une règle (ou qu'un humain en ajoute une), elle a UN bon foyer. Mauvais
> rangement = règle perdue, dupliquée, ou injectée là où elle ne devrait pas. Cette page est la
> **règle de placement** ; applique-la *avant* de poser quoi que ce soit.

## Trois natures de contenu

1. **Règle** (déclaratif : « fais ci, pas ça ») → `conventions/` (cœur) ou `.ai/contexts/` (projet).
2. **Commande** (action invocable : `/check`, `/watch`…) → `.ai/commands/` (projet) ; le cœur peut fournir des skills *project-agnostiques*. ⚠️ Une **méthode toujours active** (délibération) n'est PAS une commande (sinon elle devient *opt-in*) → c'est un **skill de base** dans `method.md`.
3. **Pointeur de référence** (Lexique, ADR, glossaire, specs) → un **context court qui LIE** la source de
   vérité (dans `docs/`…). **On pointe, on ne recopie pas** (sinon : drift + bloat dans chaque adapter).

## Où va une RÈGLE ? (du plus partagé au plus local)

| La règle est… | Foyer | Exemple |
|---|---|---|
| **universelle** (tout projet, tout langage) | `conventions/global.md` / `meta/` (**cœur**) | SOLID, KISS, « gagne ton archi », FR/EN |
| **liée à une techno** | `conventions/stacks/<stack>.md` (**cœur**) | `record` en C#, pas de `any` en TS |
| **propre à CE projet / bounded context** | `.ai/contexts/<ctx>.md` (**local**) | design-system, `billing`=ES, chemins de tests |

> **Règle d'or : ne jamais injecter une règle qu'on ne peut pas justifier.** Dans le doute, descends
> d'un cran (local plutôt que cœur). Une règle cœur engage *tous* les projets → ça se **ratifie** (PR).

## Cas particuliers

- **Référence (Lexique, ADR…)** → context-pointeur, jamais une copie :
  ```markdown
  # Lexique
  Source de vérité : [docs/LEXIQUE.md](docs/LEXIQUE.md).
  ```
  Le lien survit à l'inline ; l'IA le suit à la demande.
  Pour un **répertoire** (ADR, `docs/`…) : pointe le dossier — **ne pré-indexe pas**. Le LLM le lit
  lui-même à l'init. **Règle : inline le STABLE (conventions), POINTE le VOLATIL (docs, ADR).** Inliner du
  volatil te condamne à re-syncer à chaque changement — *le but n'est pas de sync tous les matins.*
- **« Je le veux pour UN seul outil »** ou de la prose bespoke → **zone libre** de l'adapter (au-dessus /
  au-dessous du bloc managé). ai-core n'y touche jamais. *Mais* un `context` sert les **trois** outils.
- **Spécifique à une techno DANS une commande** → fragment `<stack>.md` du dossier de la commande (additif).
- **Auto-suffisance** : une convention/stack/context **ne référence pas un autre fichier du cœur par son
  chemin** (style `[autre.md](autre.md)` ou « cf. un-autre-fichier §N »). Chaque fichier peut être généré
  **seul** (instruction Copilot scopée) ou **inliné** → le chemin source n'existe **jamais** chez le
  consommateur (lien mort). Énonce le principe, ou renvoie au **nom de section**.

## Le test « est-ce au bon endroit ? »

1. Si je change de projet, cette règle **part-elle avec moi** ? → oui = **cœur** · non = `.ai/` (**local**).
2. Est-ce une **règle**, une **action**, ou une **référence** ? → `conventions` · `commande` · `context-pointeur`.
3. Est-ce que je **recopie** un doc qui vit ailleurs ? → **STOP**, pointe-le.
<!-- ai-core:end -->
