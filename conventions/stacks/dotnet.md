---
applyTo: "**/*.cs"
---

# Stack — .NET / C# (scoped : fichiers `.cs`)

> Règles spécifiques à la stack .NET. (Exemple — à compléter par équipe.)

- **Immutabilité par défaut** : `record`, `readonly`, collections immuables.
- **Value Objects dans le DOMAINE uniquement** — *pas* dans les objets de requête SQL ni les ViewModels
  (principe « un modèle par couche » : entités/VO riches dans le domaine, on **traduit** aux frontières).
- **Async** : `async`/`await` de bout en bout ; pas de `.Result`/`.Wait()`.
- **Nullable reference types** activés ; valider aux frontières, *fail fast*.
- Tests : xUnit, Arrange-Act-Assert, pas de mock des objets de domaine.
