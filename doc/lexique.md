# Lexique — ai-core (vocabulaire pour *développer l'outil*)

> ⚠️ **Ce lexique décrit ai-core *lui-même*, pas l'application cible.** Il vit dans `doc/` **exprès** :
> il ne doit **jamais** migrer dans `conventions/`, sinon le sync l'injecterait dans le `CLAUDE.md` de
> *chaque* projet consommateur — qui n'a que faire de nos « packs », « fragments » ou « adapters ».
>
> *C'est le test de [`conventions/meta/taxonomy.md`](../conventions/meta/taxonomy.md) appliqué à
> lui-même : « si je change de projet, ce terme part-il avec moi ? » → **non** → ce n'est pas du cœur →
> `doc/`.* Le domaine d'un projet cible, lui, vit dans son `.ai/contexts/`. On ne mélange pas les deux mondes.

Raison d'être : on se marchait sur les pieds (« cœur » voulait dire trois choses). **Une maison par terme.**

---

## A. L'application vs la matière

| Terme | Définition | ≠ |
|---|---|---|
| **ai-core** *(l'outil, le paquet)* | L'**application** npm : le `sync` + la matière embarquée. | ❌ « le cœur » |
| **sync** | `tools/sync-ai.mjs` : l'orchestrateur (adaptateur IO + CLI) qui assemble la matière → adapters. La logique pure vit dans `tools/lib/`. | |
| **Adapter** | Fichier **généré** (`CLAUDE.md`, `GEMINI.md`, `.github/*`). Jamais source ; le sync n'en possède qu'un **bloc balisé** (`ai-core:start … end`). | la **zone libre** (à l'humain) |

## B. La matière — deux origines

| Terme | Définition |
|---|---|
| **Cœur** | La source **embarquée & ratifiée** dans le paquet (`conventions/` + `commands/`). **« Cœur » ne désigne plus que ça.** Versionné, ne change que par PR. |
| **Project-local** | La matière **apportée par le projet** sous `.ai/` (`contexts/`, `commands/`). **Opaque** au cœur, hors PR ai-core. |

## C. Le cœur, par couche (agnostique ↔ techno)

| Terme | Définition |
|---|---|
| **Socle** *(agnostique)* | `method + global + meta` : les règles **sans langage**, valables partout. *(= « ce qui est embarqué sans langage spécifique ».)* |
| **Stack** *(cadre, framework embarqué)* | `stacks/<techno>.md` : règles **scopées techno** (`applyTo`). Jusqu'à 3 facettes : *détection · convention · fragments de commande*. |
| **Aspect** | Préoccupation **transverse** (testing, security, a11y). **N'est pas une stack.** Reste dans socle/stack tant qu'une friction ne l'émancipe pas. |
| **Context** | Règles d'un **bounded context** précis. **Project-local** (`.ai/contexts/`). |

## D. Les commandes

| Terme | Définition |
|---|---|
| **Pack** | **Namespace** de commandes par domaine (`git`, `craft`, `tests`…). **Opt-in** (importé seulement si listé dans `commands`). **Agnostique par construction.** Résout la collision **par construction** : `/git:commit` ≠ `/craft:commit`. |
| **Commande** | **Squelette agnostique** (`command.md`) **+** **fragments** additifs. |
| **Fragment** | Le `<stack>.md` d'une commande, **ajouté quand la stack est active** — c'est lui qui porte le **concret techno**. |
| **Complétion guidée** *(1ʳᵉ exécution)* | Au lieu d'un param statique : le fragment fait **découvrir le concret au LLM** (chemins…), **demande confirmation au user**, puis **fige** le résultat en project-local. *Agnostique à la livraison → concret au 1ᵉʳ run → déterministe ensuite.* |

## E. Cycle de vie d'une règle / d'une commande

| Terme | Définition |
|---|---|
| **Skill de base** | Méthode **toujours active** (la délibération, `conventions/method.md`). **Pas** une commande — sinon elle deviendrait *opt-in*. |
| **Ratifier** | L'IA **propose** une règle (method §6) → l'humain **valide par PR** sur ce repo → bump de version. |
| **Consolidate** | `--consolidate` : rassemble les commandes natives éparpillées (`.claude/commands`, `.github/prompts`) en **une** source neutre `.ai/commands/`. |
| **Orphelin** | Adapter signé `ai-core` mais **plus généré** ce run → le sync le **signale**, ne le **supprime jamais**. |

---

> **Règle d'or du lexique** : un terme qui décrit *comment ai-core est fabriqué* → ici (`doc/`).
> Un terme du *domaine d'un projet cible* → le `.ai/contexts/` de ce projet. Deux mondes, deux maisons.
