# 🧠 ai-core — Donner à l'IA la discipline d'un *crafter*, et la partager

*Comment on en est venus à formaliser une méthode de travail avec l'IA — par un détour inattendu par les mathématiques.*

---

## Le problème

Les assistants IA sont devenus de vrais compagnons de code. Mais **travailler *bien* avec eux** reste
un problème ouvert. On leur donne nos **règles** (TDD, SOLID, hexagonal) — et ils les suivent. On ne
leur donne pas notre **méthode** : ils passent de *« go »* à *« voilà le code »*, sans délibérer, sans
peser deux approches, sans se réfuter eux-mêmes.

Deux questions, donc :

1. **Comment leur donner une indépendance *qualitative*** sur le *comment* — sans perdre le contrôle ?
2. **Comment ne pas dupliquer** cette méthode entre Claude, Copilot, Gemini… (et l'améliorer une fois pour tous) ?

## Le constat — le bazar, et les missions lunaires

Sur un vrai projet, la config IA est **éparpillée** : `CLAUDE.md` ici, `.github/copilot-instructions.md`
là, chacun sa façon, des règles qui se dupliquent et **divergent** (on a vu une commande `/check`
exister en deux versions, dont une déjà périmée). Pire : le « commun » vit dans le dossier d'**un** outil,
et les autres « empruntent son hangar ». Pas de source neutre.

Et le symptôme profond, c'est le **sur-engineering** — qu'on a vu en vrai :

- de l'**Event-Sourcing / CQRS appliqué à *tout* un projet**, alors que 80 % du domaine était du CRUD
  qui paie la taxe pour les 20 % qui en avaient besoin ;
- des **Value Objects partout** — jusque dans les objets de requête SQL et les **ViewModels**. La
  *primitive obsession* soignée si fort qu'elle devient *VO obsession*.

Ces désastres sont passés **sans aucune gate de délibération**. On avait des règles ; on n'avait pas de
**méthode partagée et gouvernée** pour s'en servir.

## Le détour qui a tout éclairé : les mathématiques

Un soir, en reproduisant le pipeline d'une vidéo où une IA résout des problèmes de maths — *un LLM
**raisonne** → Aristotle **formalise** → Lean **vérifie*** — on a monté un petit **harnais** :
un **proposeur** qui ose, un **sceptique** qui réfute, un **juge objectif** (Lean) qui tranche,
de l'exploration **en arbre** (brancher, backtracker, persister), une **gate manuelle**, et un tri
honnête entre *« connu »* et *« neuf »*.

Et là, la révélation : **c'est du Software Craftsmanship.**

> Le **juge objectif** des maths (Lean), c'est **nos tests** (TDD). Le **proposeur ↔ sceptique**, c'est
> la **délibération** qu'on ne faisait pas. L'**arbre**, c'est explorer les approches au lieu de foncer
> sur la première. **Le même système**, transposé du théorème au code.

Ce repo, c'est cette transposition.

## L'esprit de la solution

Ce n'est pas un outil. C'est une **discipline + sa plomberie**, en trois idées :

1. **L'IA délibère *avant* de proposer.** Boucle proposeur ↔ réfuteur en arbre, où le **réfuteur est
   chargé de nos conventions**, et **dimensionnée au risque** (à la *porte* : irréversible → on creuse ;
   trivial → on fait). Elle t'amène une **approche passée au crible + l'arbre des branches tuées (et pourquoi)**.
   *Toi*, tu gates le **design** (là, pas d'oracle objectif) ; l'**oracle** (les tests) gate
   l'**implémentation**.
2. **Un cœur neutre, des adapters générés.** On applique **notre propre archi hexagonale… à notre
   config IA** : un domaine stable (`conventions/`), des adapters volatils (Claude/Copilot/Gemini)
   *générés*, jamais sources. *On mange notre propre nourriture.*
3. **Les règles grandissent par la friction, et sont ratifiées.** Quand le réfuteur attrape 3× la même
   chose, l'IA **propose** de la codifier ; *toi* tu ratifies. Évolution **gouvernée**, partagée entre
   **outils ET projets**.

> Le test décisif : un réfuteur chargé de nos leçons aurait **tué « VO dans le ViewModel » à vue**,
> *avant* l'implémentation. Voilà la valeur — la constitution craft devient un **contre-feu adversarial
> sur chaque proposition**.

## Les arbitrages (parce qu'il y en a eu)

Rien n'est gratuit. Les décisions assumées :

- **Copilot et Gemini n'importent pas** de fichiers externes (contrairement à Claude) → leurs adapters
  sont *bêtes*, donc **générés** par un *sync* (un codegen / anti-corruption layer). **Coût : une étape de build.**
- **Un submodule ne peut pas porter les fichiers du projet** parent → les `contexts/` (project-local)
  vivent dans **l'arbre du projet**, pas dans le cœur. Le sync recolle.
- **L'interop de la *méthode* dégrade gracieusement** : même *protocole*, *horsepower* différent (Claude
  = arbre agentique parallèle ; Copilot/Gemini = même discipline, en séquentiel). Honnête : **pas
  « tous pareils »**, mais « tous la même méthode, chacun à son niveau ».
- **Ne pas sur-délibérer** : on dimensionne à la porte, sinon le harnais devient *son propre*
  sur-engineering (on s'appliquerait à nous-mêmes le défaut qu'on dénonce).
- **Anti-bloat sur les règles** — deux opérations distinctes : une règle **morte/redondante** est
  **élaguée** ; deux règles **qui se contredisent** ne sont pas supprimées mais **pondérées** (ordre
  hiérarchique modulé par le contexte — cf. [`architecture-principles.md`](conventions/meta/architecture-principles.md) §9,
  d'après B. Krajka). La constitution ne doit pas devenir son propre bazar.
- **Adapters générés *committés*** (avec en-tête `GÉNÉRÉ`) plutôt que gitignorés → un clone frais marche
  tout de suite. (L'inverse est plus « pur » mais exige le sync avant usage.)

---

## Concrètement

**Trois piliers** : les **règles** (`conventions/{global,stacks/,contexts/,meta/}`), la **méthode**
([`conventions/method.md`](conventions/method.md)), la **plomberie** (`templates/`, `tools/sync-ai`).

**La taxonomie des règles** — chaque règle a *une* maison :

```
conventions/
  method.md   ← le protocole de délibération (comment on bosse)
  global.md   ← constitution : TDD, branches, langue — PARTOUT
  stacks/     ← scoped (applyTo) : dotnet · react · testing…
  meta/       ← principes d'archi (le POURQUOI) → architecture-principles.md
  contexts/   ← 🆕 règles LOCALES par bounded context — PROJECT-LOCAL
```

> Le calque **`contexts/`** est la maison qui manquait : c'est là qu'on écrit *« ES dans `billing`, CRUD
> assumé dans `catalog` — pas de VO dans ses ViewModels »*. Le sur-engineering vient de son **absence**.

**Dans un projet de dev :**

```
mon-projet/
  .ai/contexts/  .ai/commands/   ← TON espace (bounded contexts + commandes projet, committé)
  package.json             ← devDep + "ai-core": { "models": [...], "stacks": [...] }
  node_modules/@samirzebbouche/ai-core/   ← le cœur (npm, caché)
  CLAUDE.md  GEMINI.md  .github/*  .claude/commands/*   ← GÉNÉRÉS (selon "models") + ta ZONE LIBRE
```

L'IA propose une règle → **tu ratifies** (PR sur ce repo) → bump de version → `npm update` à ton rythme.
*Extensibilité et interop, réalisées par le versioning npm.*

### Importer dans un projet existant

```bash
npm i -D github:SamirZebbouche/ai-core#v0.1.0     # GitHub, ou un registry privé
```

Puis : choisis tes **modèles** + **stacks** (`package.json` → `"ai-core": { "models": ["anthropic"], "stacks": ["dotnet","react"] }`),
écris tes bounded contexts dans **`.ai/contexts/`**, lance **`npx ai-core-sync`**. Les adapters sont **committés** :
le sync ne réécrit qu'un **bloc balisé** (`<!-- ai-core:start … end -->`) — ta **zone libre** (instructions
projet) est préservée. **Pas-à-pas → [HOWTO.md](HOWTO.md).**

**La « finesse » — trois axes, additifs (sans config → tout) :**
- **Modèles** (`models` / `--models anthropic,copilot`) : ne génère que les adapters des assistants utilisés —
  un shop Claude-only n'a ni `GEMINI.md` ni `.github/` qui polluent (alias `claude`=`anthropic`).
- **Stacks** (`stacks` / `--stacks dotnet,react`) : un projet .NET ne traîne pas React. **Défaut sain : auto-détectées (`.csproj`→dotnet, dep react→react…), jamais « toutes ».**
- **Commandes** (`.ai/commands/<cmd>/`) : multi-techno, **assemblées additivement** par stack (ex. `/check` = back .NET + front React).

Découvrir/configurer : `npx ai-core-sync --list` (catalogue) · `--config` (bloc package.json) · `--help`.

> *Cas dégénéré (Claude seul, sans Node) : submodule + `@import` `conventions/` à la main — mais tu perds
> Copilot/Gemini, le sync et la sélection.*

**Pour aller plus loin :** [`method.md`](conventions/method.md) (*comment* l'IA travaille) ·
[`meta/architecture-principles.md`](conventions/meta/architecture-principles.md) (*le pourquoi*) ·
[`meta/taxonomy.md`](conventions/meta/taxonomy.md) (*où va quoi*) ·
[`tools/sync-ai.md`](tools/sync-ai.md) (la plomberie).

### Développer / contribuer

**Aucun build** — JS pur (ESM) + Markdown, **zéro dépendance**. Juste Node (≥ 18).

```bash
npm test        # lance la suite (runner intégré de Node — tests/lib.test.mjs + tests/sync.test.mjs)
npm run sync    # démo : génère dans .sync-out/ (gitignoré). Chez le consommateur, `npx ai-core-sync` génère au root.
```

Contribuer une règle = **PR sur ce repo** (= la ratification : l'IA propose, l'humain ratifie, bump de version).
Les `tests/` ne sont pas publiés dans le package (le champ `files` ship `conventions/` `commands/` `templates/` `tools/` + `HOWTO.md`).
