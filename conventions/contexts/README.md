# `contexts/` — règles LOCALES par bounded context (PROJECT-LOCAL)

> ⚠️ **Ce dossier est propre à CHAQUE projet de dev.** Son contenu est **gitignoré dans `ai-core`**
> (le cœur partagé ship ce dossier vide). Chaque projet apporte ses fichiers de contexte **dans son
> propre arbre**, committés là-bas. Le `sync-ai` recolle *cœur + contexts*.

## Pourquoi cet étage existe

C'est ici qu'on **localise** les choix d'architecture, au lieu de les appliquer uniformément (la cause
du « ES partout / VO partout »). Un fichier par bounded context.

## Gabarit d'un fichier de contexte

```markdown
---
context: billing
applyTo: "src/**/Billing/**"
---

# Bounded context — Billing

- **Pattern** : Event-Sourcing + CQRS (l'historique EST la valeur : audit/facturation).
- Invariants temporels forts ; reconstituer l'état depuis les events.
- Value Objects riches (Money, InvoiceNumber…) — *dans ce domaine*.
```

```markdown
---
context: catalog
applyTo: "src/**/Catalog/**"
---

# Bounded context — Catalog

- **Pattern** : CRUD assumé. Pas d'ES, pas de CQRS.
- ❌ **Interdiction de Value Objects dans les ViewModels / objets de requête** ici.
- DTO plats, mapping simple.
```

> Règle : avant d'introduire un pattern lourd (ES, CQRS, VO riches), **déclare-le dans le contexte
> concerné** — et **seulement** là où le domaine le justifie.
