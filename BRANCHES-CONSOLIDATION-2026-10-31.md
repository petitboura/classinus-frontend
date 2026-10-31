# Consolidation des branches en doute — 31/10/2026

Note pour les créateurs des branches concernées (décision Bourama, analyse Git : ancêtres, `git cherry`, diffs d'arbres vs `staging`).

## Branche à utiliser désormais (cluster relais PC)
- **`fix/relais-sante-stable`** (`6ab3490c79005f919799540ccb1e0dfeab1efdd9`)
  - Contient `ci/pc-1.0.7-brouillon` et `fix/relais-stabilite-log-watchdog` en ancêtres (prouvé).
  - Contient en plus les 2 correctifs les plus récents (frères de rôles différents, échec de santé transitoire).
  - Continuez tout le travail relais PC sur cette branche, pas sur les anciennes.

## Branches supprimées le 31/10/2026
| Branche supprimée | SHA (restauration possible) | Raison |
|---|---|---|
| `ci/pc-1.0.7-brouillon` | `9d545fbfdbe066788c27d3b13af882608967b4c3` | Ancêtre de `fix/relais-sante-stable` |
| `fix/relais-stabilite-log-watchdog` | `3958482a71887e12f04a4fe134b918ef7c4d8e28` | Ancêtre de `fix/relais-sante-stable` |
| `fix/relais-stabilite-v2` | `750b817f9db0ee65b6aadafa502df761d1c00836` | Tentative divergente supprimant `plugin.mts`, remplacée |
| `fix/relais-auto-log-watchdog` | `ff7ccdc792f6d4a3d8fbc4898ff3d8134a03a771` | Tentative divergente supprimant `plugin.mts` + `relaisPc.mts`, remplacée |
| `feat/higgsfield-rail` | `036c878e3a9cf58021da75b5836ab8498f0c368f` | V1 (3 effets) dépassée par `staging` (catalogue étendu) |
| `diag/focus2-temp` | `cfd374ce12e847b24656904c21de9da632e6213e` | Diagnostic du 18/10 remplacé par `focusPrecedent.mts` dans `staging` |

## Restaurer une branche si vraiment nécessaire
```bash
git branch <nom-branche> <sha-ci-dessus>
git push origin <nom-branche>
```

Non touchés : `main`, `staging` et toutes les autres branches utiles / PR ouvertes.
