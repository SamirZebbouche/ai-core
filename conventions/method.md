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
