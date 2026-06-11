---
description: Délibère (proposeur ↔ réfuteur, en arbre) sur une décision AVANT de proposer une solution
---
Tu vas **délibérer** sur la décision/problème ci-dessous **avant** de proposer quoi que ce soit.
Ne déroule PAS de code tant que l'humain n'a pas ratifié l'approche.

1. **Classe la porte** (réversibilité, cf. principes d'archi). Sens unique (coûteux à défaire :
   frontière de bounded context, persistance, contrat public) → délibération profonde. Double sens
   (nommage, découpage interne) → légère. Dimensionne l'effort à la porte.
2. **Proposeur** — esquisse 1 à 3 approches concrètes, sans t'auto-censurer.
3. **Réfuteur** — chargé de `global.md`, des principes d'archi et des `contexts/` du projet, **attaque**
   chaque approche : quel principe *lourd* (YAGNI, KISS…) est écrasé par un *léger* (design pattern) ?
   sur-engineering = un pattern juste appliqué *uniformément* là où il fallait le contenir ? porte à
   sens unique mal choisie ? Rejette à vue ce qui laisse un principe léger écraser un lourd.
4. **Arbre** — abandonne les approches réfutées, garde les survivantes, creuse la meilleure d'un cran
   (et reviens en arrière si une branche meurt). Préfère un faux positif à un blocage prématuré.
5. **Verdict** — présente à l'humain l'approche **passée au crible** + les **tensions non tranchées**
   (ce qui reste à *ratifier*, et pourquoi). C'est l'humain qui dit « go ».

Décision à délibérer : $ARGUMENTS
