# Parrainage et crédits d'images gratuits (frontend, étape 5)

[English version](parrainage-credits-images.md) · [Français]

Chantier lancé le 9 novembre 2026. But : que chaque utilisateur devienne un canal d'acquisition. La génération d'images est gratuite jusqu'à épuisement d'un solde de crédits ; une image ne se télécharge qu'après avoir été partagée ; chaque ami qui s'inscrit avec le lien d'une personne lui rapporte des crédits.

Ce document couvre l'étape 5 (frontend). Les étapes 1 à 4 (tables Supabase, crédits, parrainage, déblocage du téléchargement) sont dans le dépôt backend et étaient déjà en place sur `staging` au début de cette étape.

## Les six étapes

1. Supabase : crédits, codes de parrainage, parrainages, domaines d'email jetables, email normalisé.
2. Backend, crédits : un crédit par image, refus à zéro (`CREDITS_IMAGES_EPUISES`). Les vidéos ne sont pas facturées.
3. Backend, parrainage : le parrain est enregistré ; une fois l'email confirmé (et si ce n'est ni la personne elle même ni un email jetable), le parrain gagne des crédits.
4. Backend, déblocage du téléchargement : une image se télécharge seulement après un partage terminé, signalé par l'appli.
5. Frontend (ce document).
6. Test réel sur staging, puis reprise vers `main`.

## Contrats du serveur utilisés par le frontend

| Appel | Usage |
| --- | --- |
| `GET /api/parrainage/moi` | Code, crédits restants, amis validés et en attente. Limité à 30 par minute. |
| `POST /api/parrainage/enregistrer` | Enregistre le parrain. Répond `valide`, `en_attente`, `refuse` ou `ignore`. |
| `POST /api/higgsfield/partage-termine/{id}` | Dit au serveur que le partage est terminé ; le téléchargement se débloque. Sans risque à répéter. |
| `GET /api/higgsfield/telecharger/{id}` | Renvoie le fichier. Demande la session de la personne ; refuse une image verrouillée avec `TELECHARGEMENT_PARTAGE_REQUIS`. |
| routes de statut et de liste | Portent désormais `telechargement_debloque`. |

Codes d'erreur ajoutés à `lib/erreurs.ts` (français et anglais) : `CREDITS_IMAGES_EPUISES`, `CREDITS_IMAGES_INDISPONIBLE`, `PARRAINAGE_CODE_INVALIDE`, `PARRAINAGE_INDISPONIBLE`, `TELECHARGEMENT_PARTAGE_REQUIS`, `IMPOSSIBLE_TELECHARGER_HIGGSFIELD`, `PARTAGE_IMAGE_INVALIDE`. À garder synchronisés avec `core/erreurs.py` côté backend.

## Ce que voit la personne

- **Après la génération d'une image** : « Partager » et un « Télécharger » verrouillé (cadenas). « Ouvrir » est caché, car il afficherait l'image à l'état brut. Une vidéo garde « Ouvrir » et « Télécharger », jamais verrouillés.
- **Partager** : la personne choisit le lien, l'image, ou les deux, ou copie le lien en secours. Quand le partage est terminé, l'appli le dit au serveur et le cadenas s'ouvre.
- **Télécharger** (débloqué) : le fichier est récupéré avec la session de la personne et enregistré via `lib/telecharger.ts`.
- **Crédits restants** : une petite pastille dans les fenêtres de génération d'image. À zéro, ou quand le serveur refuse une image, le bloc « plus d'images, invite tes amis » remplace le message d'erreur.
- **Générations récentes** : une image verrouillée affiche « Partager » au lieu de « Voir » ; le même bloc se déplie sous la ligne.
- **Lien d'invitation** `/invitation?code=ABCD2345` : page d'arrivée publique. Elle garde le code sur l'appareil et mène vers l'inscription.

## Fichiers

- `lib/parrainageApi.ts` : appels vers `/api/parrainage`.
- `lib/parrainage.ts` : code gardé sur l'appareil (`localStorage`, survit au détour par la confirmation d'email), construction du lien, contrôle de la forme du code.
- `lib/useMonParrainage.ts` : requête partagée pour le compte connecté, rangée par identifiant d'utilisateur (le cache est conservé et rien ne le vide à la déconnexion).
- `lib/partagerImage.ts` : logique de partage (plugin de partage Capacitor, `navigator.share` avec `canShare`, copie en secours).
- `lib/higgsfieldApi.ts` : `signalerPartageTermineHiggsfield`, `recupererFichierHiggsfield`, champ `telechargement_debloque`.
- `lib/useSuiviGenerationHiggsfield.ts` : garde désormais `telechargementDebloque`, `marquerDebloque` et `codeErreur`.
- `components/higgsfield/ActionsResultatHiggsfield.tsx` : boutons du résultat (vidéo inchangée, image derrière le partage).
- `components/higgsfield/CreditsImagesHiggsfield.tsx`, `PlusDeCreditsHiggsfield.tsx` : solde et bloc « invite tes amis ».
- `components/EnregistrementParrainage.tsx` : enregistre le code gardé dès que la personne est connectée (monté dans `app/layout.tsx`).
- `app/invitation/` : page d'arrivée et son habillage (non indexée).

## Décisions

- Aucun chiffre de gain (10 au départ, 5 par ami) n'est écrit dans un texte. Ils vivent dans `parrainage_reglages` côté Supabase et aucune route publique ne les expose. Les textes parlent seulement d'« images gratuites ».
- Le texte qui accompagne l'image ou le lien partagé existe en français et en anglais dans `lib/partagerImage.ts` (il n'est pas dans la page, donc la traduction de l'interface ne l'atteint pas).
- Le lien d'invitation utilise un paramètre d'adresse, pas un segment, pour fonctionner dans l'export statique de l'appli mobile.
- `/invitation` est déclarée dans `AndroidManifest.xml` pour que le lien ouvre l'appli, comme toutes les autres pages.

## Limites connues

- Le verrou pousse au partage, il ne protège pas un secret. L'image générée est affichée dans la fenêtre, et une copie est enregistrée automatiquement dans la bibliothèque de la personne (d'où elle se télécharge). Le backend le dit aussi dans `core/higgsfield_telechargement.py`.
- Les images générées dans le chat ne sont pas encore verrouillées : le chat reçoit l'adresse brute de l'image sans le numéro de génération. Il faut une modification du backend (renvoyer le numéro), puis le même verrou dans le chat. Prévu comme étape 5b.
- Partager l'image elle même demande que `navigator.canShare` accepte les fichiers. Firefox sur ordinateur ne le fait pas : le lien est partagé à la place.
- Certaines applications ignorent le texte qui accompagne une image partagée, donc le lien peut ne pas apparaître à côté de l'image. La personne peut choisir le lien seul.
- Lire l'image dans le navigateur pour la partager dépend de l'autorisation de l'hébergeur de l'image (CORS). S'il refuse, « L'image » et « Les deux » sont désactivés et le lien reste disponible. Pas encore vérifié avec une vraie image Higgsfield.
- Le partage dans l'appli native (Capacitor) n'a pas été essayé sur un appareil.
- `tests/verifier-liens-entrants.mjs` échoue parce que `/higgsfield` manque dans la liste du manifeste Android. Cela existait avant ce chantier et n'en fait pas partie.

## Test sur staging (étape 6)

1. Générer une vraie image Marketing Studio : le solde baisse d'un ; une génération ratée rend le crédit.
2. Partager (lien, image, les deux, copier le lien) : le cadenas s'ouvre, « Télécharger » enregistre le fichier, « Ouvrir » apparaît.
3. Ouvrir `/invitation?code=<code>` déconnecté, créer un deuxième compte, confirmer l'email : le solde du parrain augmente.
4. Épuiser le solde : le bloc « invite tes amis » apparaît à la place d'une erreur.
5. Vérifier les trois versions (web, PC, natif) : débordements, bouton retour et barre du bas sur téléphone.
