> [English version](./HIGGSFIELD_TODO.md) · **Version française**

# Higgsfield — branche `feature/higgsfield-catalogue-generation`

> Mis à jour le 2026-11-08 : les quatre onglets Higgsfield (Catalogue, Genjutsu, Viral, Marketing Studio) utilisent maintenant une seule section partagée, `components/higgsfield/SectionEffetsHiggsfield.tsx`, avec la barre de filtres dans `BarreFiltresHiggsfield.tsx` et la carte dans `CarteEffetHiggsfield.tsx`. La rangée Image / Vidéo reste visible à côté du bouton Filtres, et le compteur est masqué sur téléphone. Les onglets ne doivent jamais différer (voir `CLAUDE.fr.md`).

> Mis à jour le 2026-11-07 : le formulaire Générer peut passer la main au chat.

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
- Carte de génération (`components/higgsfield/CarteGenerationHiggsfield.tsx`) : pendant une génération, le formulaire se range et une carte vide, à la forme exacte de la future vidéo ou image, prend sa place, avec un verre dépoli par-dessus le fichier de la personne, un compteur de temps réel, et le résultat révélé une fois chargé. Higgsfield n'envoie ni aperçu partiel ni pourcentage : seules les trois étapes réelles sont affichées, « Envoi de tes fichiers », « En attente de son tour » et « Création en cours ».

### Porte de sortie vers le chat depuis le formulaire Générer (7 novembre 2026)

- Nouveau bouton « Faire dans le chat » dans le formulaire Générer, au-dessus de Fermer et Générer. Il ouvre une nouvelle conversation du chat avec un message déjà écrit et garde tout ce qui est déjà ajouté dans le formulaire : la vidéo et les images sont de nouveau jointes dans la barre de saisie du chat, et le titre (s'il a été changé), la description et les options choisies sont écrits dans le message. Le bouton se range pendant une génération et quand le résultat est affiché, et revient après un échec ou une annulation. Il sert quand le formulaire ne suffit pas.
- Les 3 effets image (Soul) ont le même bouton, avec le message sur le style choisi.
- Les presets Marketing Studio n'ont pas encore de formulaire : le même bouton se trouve sous l'avis « génération pas encore disponible » et ouvre le chat avec un message qui nomme le preset (nom, catégorie, identifiant).
- Nouveau `lib/messageChatHiggsfield.ts` : construit le message à partir du `promptChat` de l'effet et de ce qui a été saisi dans le formulaire (il écrit lui-même la phrase de départ des presets Marketing Studio). Les messages restent en français, comme les phrases du catalogue.
- Côté chat : `useOuvrirChatAvecTexte` accepte désormais des fichiers en option. `ContexteChat` reçoit `fichiersInitiauxConversation`, qui suit la vie de `texteInitialConversation` (vidé quand le texte est vidé) et que la barre de saisie vide aussi dès l'envoi du message. `BarreDeSaisie` ajoute ces fichiers une seule fois à son ouverture, par son chemin normal de pièces jointes.
- Pas encore testé dans un navigateur : le contrôle des types, les tests de langues et les vérifications des composants natifs et des couleurs du thème passent, et le constructeur de message a été exécuté sur de vrais effets.

## Tests manuels avant merge
- [ ] Catalogue : recherche, filtres, compteur, reset, carte hover son, fallback preview HS.
- [ ] Visionneur : scroll snap, flèches, clavier, dots, son toggle, Générer ouvre bien le panneau.
- [ ] Backend : `GET /api/higgsfield/disponible` → `{disponible: true/false}` selon env (`HIGGSFIELD_API_KEY`).
- [ ] Générer : upload → lancer → statut → annuler → terminé → bibliothèque.
- [ ] Générer, « Faire dans le chat » : avec une vidéo et des images ajoutées, le chat s'ouvre sur une nouvelle conversation, le message est écrit, les mêmes fichiers sont joints dans la barre de saisie, et envoyer le message les envoie ; le bouton se range pendant une génération et revient après un échec.
- [ ] Marketing Studio : « Faire dans le chat » sous l'avis ouvre le chat avec un message qui nomme le preset.

## Références
- Endpoints backend : `api/higgsfield.py`
- Logique Higgsfield : `core/generation_video_higgsfield.py`, `core/higgsfield_catalogue.py`, `core/higgsfield_limites.py`, `core/higgsfield_requetes.py`
- Catalogue statique : `lib/effetsHiggsfield.ts` (50+ effets)

### Anglais pour tous les textes d'effets (7 novembre 2026)

- Règle de Bourama : tout texte visible existe en anglais. Chaque effet a maintenant `descriptionEn`, et `promptInitialEn` quand un texte est prérempli (Viral et Soul). `descriptionEffet` et `promptInitialEffet` dans `lib/effetsHiggsfield.ts` choisissent la langue réglée dans les paramètres ; le texte de départ est choisi à l'ouverture du formulaire, donc une personne en anglais envoie le texte anglais.
- La recherche du catalogue regarde les deux descriptions. Les textes d'interface restants sont ajoutés dans `lib/i18n/interface.ts`, et les codes d'erreur Higgsfield dans `lib/erreurs.ts`.
- `tests/verifier-i18n.mjs` échoue quand une description ou un texte de départ d'effet n'a pas sa version anglaise.

### Images : ce qui est montré est ce qui est fait (7 novembre 2026, branche `feat/images-coherence-reelle`)

- Vérifié auprès de Higgsfield (MCP, rien généré) : un style Soul n'arrive qu'avec un nom et une image d'exemple, sans description ni texte de départ. Les textes de départ inventés des 3 effets Soul sont retirés : le champ commence vide et la personne écrit ce qu'elle veut. Le format par défaut de Soul est maintenant 3:4, celui de ses exemples.
- Images Marketing Studio (photos de produit, avec ou sans personne) : le choix du format est masqué et aucun format n'est envoyé, car Higgsfield n'en propose pas pour elles et l'exemple garde son propre format. Les vidéos ne changent pas.
- Reste à vérifier avec une vraie génération : que l'image affichée comme résultat Marketing Studio est bien celle qui a été générée (le serveur la lit dans une réponse non documentée).
