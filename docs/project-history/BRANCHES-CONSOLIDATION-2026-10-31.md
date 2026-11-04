# Branch consolidation notes: 31 October 2026

[English version] · [Français](BRANCHES-CONSOLIDATION-2026-10-31.fr.md)

Note for the owners of the affected branches. Decision by Bourama, based on Git analysis: ancestry, `git cherry`, and tree diffs against `staging`.

## Branch to use from now on (PC relay cluster)

- **`fix/relais-sante-stable`** (`6ab3490c79005f919799540ccb1e0dfeab1efdd9`)
  - Includes `ci/pc-1.0.7-brouillon` and `fix/relais-stabilite-log-watchdog` as proven ancestors.
  - Also includes the two most recent fixes (different role siblings and transient health-check failure).
  - Continue all PC relay work on this branch, not on the older branches.

## Branches deleted on 31 October 2026

| Deleted branch | SHA (can be restored) | Reason |
|---|---|---|
| `ci/pc-1.0.7-brouillon` | `9d545fbfdbe066788c27d3b13af882608967b4c3` | Ancestor of `fix/relais-sante-stable` |
| `fix/relais-stabilite-log-watchdog` | `3958482a71887e12f04a4fe134b918ef7c4d8e28` | Ancestor of `fix/relais-sante-stable` |
| `fix/relais-stabilite-v2` | `750b817f9db0ee65b6aadafa502df761d1c00836` | Divergent attempt that removed `plugin.mts`; replaced |
| `fix/relais-auto-log-watchdog` | `ff7ccdc792f6d4a3d8fbc4898ff3d8134a03a771` | Divergent attempt that removed `plugin.mts` and `relaisPc.mts`; replaced |
| `feat/higgsfield-rail` | `036c878e3a9cf58021da75b5836ab8498f0c368f` | V1 (3 effects) superseded by the extended catalogue in `staging` |
| `diag/focus2-temp` | `cfd374ce12e847b24656904c21de9da632e6213e` | 18 October diagnostic replaced by `focusPrecedent.mts` in `staging` |

## Restore a branch if genuinely needed

```bash
git branch <branch-name> <sha-above>
git push origin <branch-name>
```

Unaffected: `main`, `staging`, and all other useful branches and open PRs.
