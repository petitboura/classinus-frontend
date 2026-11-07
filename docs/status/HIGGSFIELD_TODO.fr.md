> [English version](./HIGGSFIELD_TODO.md) · **Version française**

# Higgsfield — branche `feature/higgsfield-catalogue-generation`

> Mis à jour le 2026-11-01 : panneau Générer finalisé.

## Fait dans cette branche

### Frontend `classinus-frontend`
- `components/higgsfield/CatalogueHiggsfield.tsx` : recherche texte normalisée, compteur `X effets / N au total`, chips Type/Style, bandeau BIENTÔT retiré, grid 2→3 cols, état vide + reset.
- `components/higgsfield/VisionneurHiggsfield.tsx` : snap vertical, flèches ← → / ↑ ↓, dots en bas, clavier, bouton Générer → callback `onGenerer`.
- `lib/higgsfieldApi.ts` : helpers `higgsfieldDisponible`, `lancerVideoHiggsfield`, `lancerImageHiggsfield`, `lancerGenjutsuHiggsfield`, `statutHiggsfield`, `annulerHiggsfield`, `estimerHiggsfield`, `uploaderFichierHiggsfield`.
- `components/higgsfield/GenererHiggsfield.tsx` : **finalisé** — upload image/vidéo (via `POST /api/uploads/fichier-chat`), formulaire titre/prompt/durée/format/qualité/son/résolution, lancement Higgsfield, polling `GET /statut/{id}` toutes les 5s avec barre de progression, annulation, affichage résultat (vidéo/image) + sauvegarde auto en bibliothèque côté backend.

### Backend `classinus-backend`
- `api/higgsfield.py` : router `POST /api/higgsfield/video|image|genjutsu`, `GET /statut/{id}`, `POST /annuler/{id}`, `POST /estimation`, `GET /disponible`. Limite `10/min` + `reserver_generation` (quota jour), sauvegarde bibliothèque en fin de `statut`.
- `api/main.py` : `higgsfield_router` importé + `app.include_router(higgsfield_router)` (restauré — n'avait pas été committé avant).

### Fluidité sur téléphone (6 novembre 2026, branche `fix/higgsfield-allegement-mobile`)
- Catalogue : la vidéo d'une carte n'est chargée que lorsque la carte est proche de l'écran, et elle est libérée quand la carte s'éloigne (avant, toutes les vidéos déjà passées restaient en mémoire). Les cartes ne se redessinent plus quand le plein écran s'ouvre ou se ferme, et les effets de flou sur chaque carte ont été retirés.
- Visionneur : seuls l'effet affiché et ses deux voisins ont une vraie vidéo, les autres montrent leur image fixe. Avant, toutes les vidéos du catalogue démarraient ensemble à l'ouverture du plein écran.

- Cadrage du visionneur (téléphone et PC) : la vidéo (ou l'image) s'affiche en entier, avec des bandes noires si besoin, au lieu d'être recadrée pour remplir l'écran.
- Navigation du visionneur (6 novembre 2026, branche `fix/higgsfield-points-cadrage`) : la colonne verticale à droite (`RailVisionneur`) a été retirée. Sur PC, un petit point par effet est en bas (l'effet affiché a un point allongé et blanc, chaque point est cliquable) et les flèches haut et bas restent sur le bord droit. Sur téléphone, aucun indicateur n'est affiché, le glissement du doigt suffit. Le compteur `1 / N` en haut reste.

### Formulaire Générer : ce qui est affiché, envoyé et renvoyé (6 et 7 novembre 2026)

Règle décidée par Bourama le 6 novembre 2026 : pour les effets, la description que la personne lit, ce qui part vraiment au modèle et ce qui en sort ne doivent jamais diverger.

- Le nom et l'aperçu d'un effet ne sont jamais envoyés à Higgsfield. Ce sont des exemples, et le visionneur le dit sous l'aperçu.
- **Genjutsu, transfert de mouvement (25 effets).** Garde les gestes, la caméra et le rythme de la vidéo de l'utilisateur et refait la scène à partir de ses images. Le champ de texte reste replié sous « Ajouter une précision (optionnel) » tant qu'il est vide, et reste visible dès qu'il contient un texte, puisque ce texte part.
- **Genjutsu, remplacement d'un élément (10 effets).** Change un élément de la vidéo (personnage, tenue, objet ou lieu) et garde le reste. Le texte dit lequel, donc le champ « Qu'est-ce qui doit changer ? » est toujours visible (optionnel).
- **Viral (12 effets).** Ils passent par le transfert de mouvement. La description de l'effet est le texte de départ d'un champ toujours visible et part avec la demande ; la personne peut la modifier ou l'effacer. La documentation de Higgsfield ne confirme pas qu'il suive ce texte pour le transfert de mouvement : un essai avec et sans le texte reste à faire.
- **Soul (3 effets).** Soul 2.0 est maintenant vraiment appelé (avant, la demande partait vers Grok). Le style de l'effet est envoyé (`style_id`), le champ de texte commence rempli avec un court texte de portrait pour ce style, la zone d'images de référence est masquée (Soul n'en propose pas) et la qualité est 720p ou 1080p. Higgsfield peut reformuler un texte très court, et le formulaire le dit.
- Des libellés simples remplacent les noms techniques de modèle (`hf_mult_motion_control`, `genjutsu-motion`, `higgsfield-viral`) : « Transfert de mouvement », « Remplacement d'un élément » et « Soul 2.0 ».
- `lib/effetsHiggsfield.ts` : le champ inutilisé `promptChat` est supprimé, `styleId` et `promptInitial` sont ajoutés, et les descriptions sont écrites avec leurs accents. `lib/higgsfieldGeneration.ts` : `modeEffet`, `libelleModeEffet`, `estEffetViral`, `FORMATS_SOUL` et `QUALITES_SOUL`.
- Les descriptions des effets restent en français (ce sont des données du catalogue, hors du dictionnaire anglais) : un utilisateur anglophone voit donc et envoie aussi le texte français d'un effet Viral.

### Génération côté serveur (6 novembre 2026)

- Le lancement, le suivi et l'enregistrement d'une génération se font maintenant sur le serveur : tu peux fermer l'appli, le résultat arrive quand même dans ta bibliothèque, avec une notification quand il est prêt. Voir `docs/status/HIGGSFIELD_TODO.md` dans `classinus-backend` pour la table, la boucle et les endpoints.
- `lib/higgsfieldApi.ts` : `statutHiggsfield` lit seulement l'état serveur (paramètre `titre` retiré) ; nouveau `listerGenerationsHiggsfield`.
- Nouveau `components/higgsfield/GenerationsRecentesHiggsfield.tsx` : bloc « Mes générations récentes » en haut du catalogue (en cours, terminées, échecs ; lien « Voir » sur les terminées). Il se rafraîchit tant qu'une génération tourne et reste caché si la liste est vide.
- Pas encore fait : l'effet visuel « construit sous tes yeux » pendant la génération.

## Tests manuels avant merge
- [ ] Catalogue : recherche, filtres, compteur, reset, carte hover son, fallback preview HS.
- [ ] Visionneur : scroll snap, flèches, clavier, dots, son toggle, Générer ouvre bien le panneau.
- [ ] Backend : `GET /api/higgsfield/disponible` → `{disponible: true/false}` selon env (`HIGGSFIELD_API_KEY`).
- [ ] Générer : upload → lancer → statut → annuler → terminé → bibliothèque.

## Références
- Endpoints backend : `api/higgsfield.py`
- Logique Higgsfield : `core/generation_video_higgsfield.py`, `core/higgsfield_catalogue.py`, `core/higgsfield_limites.py`, `core/higgsfield_requetes.py`
- Catalogue statique : `lib/effetsHiggsfield.ts` (50+ effets)

### Anglais pour tous les textes d'effets (7 novembre 2026)

- Règle de Bourama : tout texte visible existe en anglais. Chaque effet a maintenant `descriptionEn`, et `promptInitialEn` quand un texte est prérempli (Viral et Soul). `descriptionEffet` et `promptInitialEffet` dans `lib/effetsHiggsfield.ts` choisissent la langue réglée dans les paramètres ; le texte de départ est choisi à l'ouverture du formulaire, donc une personne en anglais envoie le texte anglais.
- La recherche du catalogue regarde les deux descriptions. Les textes d'interface restants sont ajoutés dans `lib/i18n/interface.ts`, et les codes d'erreur Higgsfield dans `lib/erreurs.ts`.
- `tests/verifier-i18n.mjs` échoue quand une description ou un texte de départ d'effet n'a pas sa version anglaise.
