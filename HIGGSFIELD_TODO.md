# Higgsfield — TODO suite branche `feature/higgsfield-catalogue-generation`

> Poussé tel quel le 2026-11-01. Cette branche contient l'état réel du chantier Higgsfield : catalogue amélioré + visionneur + API backend REST. Le panneau `Générer` est un placeholder.

## Déjà fait dans cette branche

### Frontend `classinus-frontend`
- `components/higgsfield/CatalogueHiggsfield.tsx` : recherche texte (normalisée), compteur `X effets / N au total`, chips Type/Style, bandeau BIENTÔT retiré, grid 2→3 cols, état vide + reset.
- `components/higgsfield/VisionneurHiggsfield.tsx` : snap vertical, flèches ← → / ↑ ↓, dots en bas, clavier supporté, bouton Générer → callback `onGenerer`.
- `lib/higgsfieldApi.ts` : helpers `higgsfieldDisponible`, `lancerVideoHiggsfield`, `lancerImageHiggsfield`, `lancerGenjutsuHiggsfield`, `statutHiggsfield`, `annulerHiggsfield`, `estimerHiggsfield`, `uploaderFichierHiggsfield`.
- `components/higgsfield/GenererHiggsfield.tsx` : **placeholder** (présent pour que le build passe, à remplacer).

### Backend `classinus-backend`
- `api/higgsfield.py` : router `POST /api/higgsfield/video|image|genjutsu`, `GET /statut/{id}`, `POST /annuler/{id}`, `POST /estimation`, `GET /disponible`. Limite `10/min` + `reserver_generation` (quota jour), sauvegarde bibliothèque en fin de `statut` via `_sauvegarder_generation_bibliotheque`.
- `api/main.py` : `higgsfield_router` importé + `app.include_router(higgsfield_router)`.

## Ce qu'il reste à faire

### 1. Panneau Générer réel (prioritaire)
Fichier à finaliser : `components/higgsfield/GenererHiggsfield.tsx`
- Props : `{ effet: EffetHiggsfield; onClose: () => void }`
- Upload :
  - `image → video` : 1 image (jpg/png/webp, ≤ ~20 Mo) + option `image_fin_url`.
  - `video → video` + `genjutsu` : 1 vidéo mp4/webm (≤ ~100 Mo, ≤ 15-30s conseillée).
  - Utiliser `POST /api/uploads/fichier-chat` existant pour obtenir une URL publique avant d'appeler Higgsfield (Higgsfield exige des URLs, pas des blobs).
- Formulaire : `titre` (requis, max 120), `prompt` (optionnel selon effet), `modele` (défaut : `genjutsu-motion` pour genjutsu, `seedance` sinon), `duree`/`format`/`qualite`/`son` selon type.
- Appel : `lancerVideoHiggsfield` / `lancerImageHiggsfield` / `lancerGenjutsuHiggsfield` → récupère `request_id`.
- Polling : `statutHiggsfield(requestId, titre)` toutes les 4-6 s (`setInterval`), afficher `en_cours` + progression. Prévoir `annuler` (`POST /annuler/{id}`).
- Succès : afficher `url` (video ou image), bouton `Ouvrir` + `Télécharger`, lien vers bibliothèque. La sauvegarde bibliothèque est déjà faite côté backend (best-effort), mais prévoir aussi un toast.
- Erreurs : `HIGGSFIELD_NON_CONFIGURE` (503) → CTA "Configurer clé" ; `429` / quota jour → message limite ; `400` → afficher `message`.
- A11y : focus trap, `Esc` ferme, safe areas.

### 2. Tests manuels à faire avant merge
- [ ] Catalogue : recherche, filtres, compteur, reset, carte hover son, fallback preview HS.
- [ ] Visionneur : scroll snap, flèches, clavier, dots, son toggle, Générer ouvre bien le panneau.
- [ ] Backend : `GET /api/higgsfield/disponible` → `{disponible: true/false}` selon env (`HIGGSFIELD_API_KEY`).
- [ ] Générer : upload → lancer → statut → annuler → terminé → bibliothèque.

## Références
- Endpoints backend : `api/higgsfield.py`
- Logique Higgsfield : `core/generation_video_higgsfield.py`, `core/higgsfield_catalogue.py`, `core/higgsfield_limites.py`, `core/higgsfield_requetes.py`
- Catalogue statique : `lib/effetsHiggsfield.ts` (50+ effets)
