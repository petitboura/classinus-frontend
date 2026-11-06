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

## Tests manuels avant merge
- [ ] Catalogue : recherche, filtres, compteur, reset, carte hover son, fallback preview HS.
- [ ] Visionneur : scroll snap, flèches, clavier, dots, son toggle, Générer ouvre bien le panneau.
- [ ] Backend : `GET /api/higgsfield/disponible` → `{disponible: true/false}` selon env (`HIGGSFIELD_API_KEY`).
- [ ] Générer : upload → lancer → statut → annuler → terminé → bibliothèque.

## Références
- Endpoints backend : `api/higgsfield.py`
- Logique Higgsfield : `core/generation_video_higgsfield.py`, `core/higgsfield_catalogue.py`, `core/higgsfield_limites.py`, `core/higgsfield_requetes.py`
- Catalogue statique : `lib/effetsHiggsfield.ts` (50+ effets)
