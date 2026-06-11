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

Le poids **n'est pas global** :

> **poids(principe, contexte) = poids_pyramide(principe) × modulation(contexte)**

- `billing` : l'Event-Sourcing est **re-pondéré lourd** (il est *gagné* — l'historique est la valeur) → il bat KISS.
- `catalog` : l'ES reste **léger** → KISS le bat.

### La procédure du réfuteur

Sur chaque proposition : **comparer les principes *pondérés dans CE contexte***, et **rejeter** toute
approche qui laisse un principe **léger écraser un principe lourd**.

> VO/ES partout = Design Patterns (léger) qui écrasent YAGNI + KISS (lourds) → **rejet à vue**.
