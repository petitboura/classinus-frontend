# Page de test des voix bambara

[English version](BOUCHE_BAMBARA.md) · **Version française**

Statut : page de test interne sur la branche `feat/bouche-bambara`, non déployée. Demandée par Bourama le 12 novembre 2026 pour comparer à l'oreille des voix de synthèse vocale bambara. Le service qui la fait fonctionner est dans le dépôt backend (voir son `docs/BOUCHE_BAMBARA.fr.md`).

## Ce qu'elle fait

La page `/dev-demo-bouche` permet à un administrateur d'écrire une phrase en bambara et d'écouter chaque voix disponible, une carte par voix, ou toutes à la suite avec « Tout écouter ». Chaque carte indique le statut de licence du modèle et une marque « expérimental » quand la fiche du modèle le dit. Une voix à plusieurs locuteurs a un sélecteur de locuteur.

## Fichiers

- `app/dev-demo-bouche/page.tsx`, `layout.tsx` : la page, et la mise en page qui envoie `noindex, nofollow`.
- `components/bouche/PageTestBouche.tsx` : état et disposition de la page (texte, voix, audio, erreurs).
- `components/bouche/CarteVoixBouche.tsx` : une carte de voix, et son squelette de chargement.
- `lib/boucheApi.ts` : appels à `GET /api/bouche/voix` et `POST /api/bouche/synthese`.
- `lib/textesBouche.ts` : tous les textes, en français et en anglais.
- `lib/erreurs.ts` : les sept codes d'erreur `BOUCHE_*`, dans les deux langues, synchronisés avec le backend.
- `lib/liensEntrants.ts` : la page fait partie de celles qui ne s'ouvrent jamais dans l'appli.

## À savoir

- Réservée aux administrateurs : le backend répond `PAS_LE_DROIT_ADMIN` à toute autre personne, et la page affiche ce message.
- La liste des voix, le nombre de locuteurs et la longueur maximale du texte viennent du service. Rien sur les voix n'est écrit en dur dans la page.
- L'audio est lu depuis une adresse temporaire du navigateur, libérée quand un nouvel audio la remplace et quand la page se ferme.
- C'est une page web seulement : elle ne fait pas partie de la navigation de l'appli native et n'est pas dans le sitemap.
- La page ne conserve aucun texte.
