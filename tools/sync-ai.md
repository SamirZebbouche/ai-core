# `sync-ai` — spécification

> Génère les **adapters** de chaque outil IA depuis le cœur `conventions/` (+ les `contexts/`
> project-local). À lancer en **pre-commit** ou en **CI**. *(Spec — le script reste à implémenter ;
> PowerShell + Node tous deux OK.)*

## Entrées
- `ai-core/conventions/` : `method.md`, `global.md`, `stacks/*.md`, `meta/*.md` (le cœur, partagé).
- `<projet>/conventions/contexts/*.md` : les bounded contexts **du projet courant** (local).

## Sorties (au ROOT du projet de dev)
| Outil | Fichier(s) généré(s) | Stratégie |
|-------|----------------------|-----------|
| **Claude** | `CLAUDE.md` | `@import` (pointeurs) — résout `{AI_CORE}` vers le chemin réel |
| **Gemini** | `GEMINI.md` | **inline** (concatène tout) |
| **Copilot** | `.github/copilot-instructions.md` + `.github/instructions/*.instructions.md` | inline global/method/meta ; matérialise stacks/contexts avec leur `applyTo` |
| **Cursor** | `.cursor/rules` | inline |

## Règles
1. Chaque fichier généré porte l'en-tête `<!-- GÉNÉRÉ — édite conventions/ -->`.
2. **Idempotent** : relancer ne produit aucun diff si rien n'a changé.
3. **Échoue** si un `contexts/*.md` référence un pattern interdit globalement, ou si un `applyTo` est absent.
4. Versioning : `ai-core` est **épinglé** (submodule à un tag, ou package semver) — **jamais** auto-follow `main`.

## Décision à trancher (cf. README §6)
- Adapters générés **committés** (header GÉNÉRÉ) → reco : un clone frais marche tout de suite.
- ou **gitignorés** + sync au clone → plus pur, exige le sync avant usage.
