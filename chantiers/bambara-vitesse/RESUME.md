# Page bambara : réponse plus rapide

- **Statut** : en attente d'une décision de Bourama (comment fusionner avec la lecture par blocs de l'autre session)
- **Dernière mise à jour** : 2026-11-24
- **Dépôts concernés** : classinus-frontend (aucun changement backend ni Supabase)
- **Branche(s)** : `feat/bambara-vitesse` (mon travail, partie de l'ancien `staging`, commit `2e47144`) ; `staging` (contient depuis la refonte « réponse en blocs »)

## Le but, en langage clair
La réponse de la page bambara s'affichait lentement. Bourama a validé trois changements (« 1, 2 et 3 go ») pour qu'elle s'affiche et se dise plus tôt, sans changer le texte, la voix ni les données gardées.

## Ce qui est déjà fait
Tout est sur la branche `feat/bambara-vitesse`, avec ses tests et sa documentation (FR et EN) :
1. La voix lit chaque phrase terminée pendant que le texte arrive encore (`lib/voixBambaraFlux.ts`, `lib/voixBambaraTexte.ts`, `lib/voixBambaraLecture.ts`).
2. Les images et vidéos s'affichent dès que leur lien est complet (`extraireVisuelsStables` dans `lib/pageBambaraVisuels.ts`).
3. Les audios de l'historique (premier message vocal, audios des questions et réponses) ne partent au serveur qu'à la fin de la réponse (`PageBambaraClient.tsx`).
- Tests ajoutés ou renforcés : `test:voix-bambara`, `test:voix-flux-bambara` (nouveau, avec un faux contexte audio), `test:page-bambara`. Les quatre tests bambara passent sur cette branche.
- Documentation : section « Réponses plus rapides » dans `docs/VOIX_BAMBARA.md` et `.fr.md`.
- Non fait : le typage des fichiers qui utilisent React n'a pas pu être vérifié (types React absents hors ligne). Le gain réel de vitesse n'a pas été mesuré avec les vrais services.

## Ce qui reste à faire
1. Décider quoi faire du point 1 (voir Points ouverts).
2. Refaire les points 2 et 3 par-dessus le `staging` actuel (les fichiers `PageBambaraClient.tsx`, `pageBambaraVisuels.ts`, `useEcritureBambara.ts`, `voixBambara.ts` ont beaucoup changé).
3. Relancer les tests bambara, mettre la documentation à jour, pousser sur `staging` (jamais le bloc STAGING ONLY vers `main`).
4. Pistes facultatives : mesurer les temps réels, route serveur plus légère pour la page bambara, limiter à une recherche par réponse.

## Décisions prises par Bourama
- « 1, 2 et 3 go » : les trois changements ci-dessus sont validés.
- Pour le push : « dans une autre branche » (d'où `feat/bambara-vitesse`).

## Points ouverts
- L'autre session a poussé sur `staging` une lecture « par blocs, un vocal par bloc, lu au défilement et au clic » (fichiers `lib/lectureBlocsBambara.ts`, `lib/blocsBambara.ts`). Elle recoupe le point 1. Proposition de Claude : garder la lecture par blocs, abandonner le point 1 et refaire les points 2 et 3 par-dessus. À confirmer par Bourama.

## Pour l'IA qui reprend ce chantier
- Vérifier d'abord l'état réel de `staging` (`git fetch`, `git log`), il a pu encore bouger.
- Lire `lib/lectureBlocsBambara.ts` et `lib/voixBambara.ts` sur `staging` avant de toucher à la voix.
- Le commit `2e47144` de `feat/bambara-vitesse` contient le code à reprendre pour les points 2 et 3.
