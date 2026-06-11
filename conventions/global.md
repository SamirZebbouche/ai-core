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

> Les principes de design (SOLID, hexagonal, « gagne ton archi », anti sur-engineering) sont dans
> [`meta/architecture-principles.md`](meta/architecture-principles.md). Le *comment travailler* est dans
> [`method.md`](method.md).
