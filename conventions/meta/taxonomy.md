# Taxonomie — où va quoi ? (le rangement EST une convention)

> Quand l'IA **propose** une règle (ou qu'un humain en ajoute une), elle a UN bon foyer. Mauvais
> rangement = règle perdue, dupliquée, ou injectée là où elle ne devrait pas. Cette page est la
> **règle de placement** ; applique-la *avant* de poser quoi que ce soit.

## Trois natures de contenu

1. **Règle** (déclaratif : « fais ci, pas ça ») → `conventions/` (cœur) ou `.ai/contexts/` (projet).
2. **Commande** (action invocable : `/check`, `/deliberate`) → `commands/` (cœur) ou `.ai/commands/` (projet).
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
- **« Je le veux pour UN seul outil »** ou de la prose bespoke → **zone libre** de l'adapter (au-dessus /
  au-dessous du bloc managé). ai-core n'y touche jamais. *Mais* un `context` sert les **trois** outils.
- **Spécifique à une techno DANS une commande** → fragment `<stack>.md` du dossier de la commande (additif).

## Le test « est-ce au bon endroit ? »

1. Si je change de projet, cette règle **part-elle avec moi** ? → oui = **cœur** · non = `.ai/` (**local**).
2. Est-ce une **règle**, une **action**, ou une **référence** ? → `conventions` · `commande` · `context-pointeur`.
3. Est-ce que je **recopie** un doc qui vit ailleurs ? → **STOP**, pointe-le.
