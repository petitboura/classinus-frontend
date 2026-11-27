# État des lieux des lecteurs (classinus-frontend, commit 2fb0b11, 27/11/2026)

Lu dans le code, pas vu à l'écran.

## Trois présentations différentes aujourd'hui
1. **Dépliés dans le fil du chat** (`BlocExpansible`, ouvert depuis `components/chat/FichierChip.tsx`) :
   - PDF : `components/VisionneurPdf.tsx` (bibliothèque @anaralabs/lector, zoom avant et arrière).
   - Livres EPUB et MOBI : `components/VisionneurLivre.tsx` (foliate-js, sommaire, pages gauche et droite).
   - Word, Excel, PowerPoint : `ContenuOffice` dans `components/VisionneuseBibliotheque.tsx` (iframe).
   - Texte et Markdown : `ContenuTexte` et `ContenuMarkdown` (même fichier), avec vue brute pour le Markdown.
2. **En fenêtre au-dessus du chat** :
   - Images : `components/chat/VisionneuseImage.tsx` (précédent, suivant, télécharger).
   - Audio et vidéo joints : `components/chat/FenetreMedia.tsx`.
   - Liens audio et vidéo du chat : `components/chat/LecteurMedia.tsx` (carte de téléchargement si le navigateur ne sait pas lire).
3. **En plein écran** :
   - `components/chat/PleinEcranApercu.tsx` (bouton Agrandir des aperçus, monté par portail dans le body).
   - `components/VisionneuseBibliotheque.tsx` (visionneur de la Bibliothèque).
   - `components/chat/VisionneurPositionGlobal.tsx` (« Ouvrir à cet endroit » depuis les sources citées, PDF ou audio à une position), monté une seule fois à la racine par `components/VisionneurGlobalRacine.tsx`.

À part : `components/chat/AnimationLecteur.tsx` (bloc animation, contrôles de lecture propres, bouton de rendu vidéo) et le dossier `components/chat/animation/`.

## Incohérences relevées
- Fermer, Télécharger et Plein écran sont réécrits dans plusieurs composants (`VisionneuseImage`, `FenetreMedia`, `VisionneuseBibliotheque`, `VisionneurPositionGlobal`).
- Libellés en dur en français dans le code (« Zoom avant », « Fermer », « Télécharger », « Agrandir ... »), donc non traduits.
- Contrôles inégaux : le PDF n'a que le zoom, les livres ont leur propre navigation, le plein écran vient d'ailleurs.

## Mise en page actuelle
- Le chat est une fenêtre flottante (`PanneauFlottant`) à plusieurs endroits de l'application.
- Aucune bibliothèque de volets redimensionnables n'est installée (ni react-resizable-panels ni allotment dans package.json).
