# clovis-frontend — Clovis

Frontend Next.js (App Router, TypeScript) de **Clovis**, IA autonome pour
établissements scolaires. Anciennement `classgpt-frontend`, renommé
pendant l'été 2026. Dépôt séparé de `djiguigne-frontend` (dont il a
hérité une partie de la structure de code initiale) et de son backend
`clovis-backend` — isolation totale, le lien avec l'écosystème Djiguignè
ne doit jamais transparaître pour l'utilisateur final.

Ce même dépôt produit aussi l'**app mobile Android/iOS** via Capacitor
(dossiers `android/` et `ios/`) : pas de code natif séparé pour l'UI, la
même app Next.js tourne dans une WebView, avec une barre d'onglets et un
menu natifs par-dessus.

**Ce README décrit l'état réel du code.** En cas de doute, le code fait
foi — pas d'anciennes conversations ou de documentation externe.

---

## Structure du dépôt

```
app/
  (app)/                 écrans connectés (voir "Écrans" plus bas)
  connexion/, inscription/  authentification
  oauth/, oauth/consent/  retour OAuth (Notion, connecteurs génériques)
  mon-espace/            section publique "Mon espace" (bibliothèque publique, portfolio)
  telecharger/           page qui sert le dernier APK publié (GitHub Releases)
  cgu/, copyright/       contenu légal
  decouvrir/             pages publiques de présentation (SEO/AEO), sans compte : accueil, bibliothèque,
                          personnaliser, concentration, et usages/ (11/10/2026) : une page par question
                          d'étudiant (trouver des PDF, apprendre à coder, trouver des vidéos, étudier),
                          avec questions fréquentes. Les textes des usages vivent dans lib/usagesDecouvrir.ts,
                          source unique partagée avec llms.txt et les données structurées ; adresses dans
                          lib/routesDecouvrir.ts ; une fonction qui change dans l'appli se corrige là
                          Chaque page se termine par un bouton vers le chat et, quand elle parle d'une section,
                          par un bouton vers cette section de l'appli (components/CtaDecouvrir.tsx, posé une
                          fois dans le layout ; la table page vers section est dans lib/ctaDecouvrir.ts) et les
                          deux mêmes boutons en icônes seules en haut à droite (components/CtaDecouvrirIcones.tsx).
                          La page Thonny a un bouton Télécharger Thonny
  layout.tsx             layout racine, résout NEXT_PUBLIC_APP_URL pour les balises OG, porte la
                          description de l'appli (RESUME_CLASSINUS) et la fiche WebApplication en
                          données structurées (lib/donneesApplication.ts, components/DonneesStructurees.tsx)
  llms.txt/route.ts      fiche /llms.txt pour les IA, fabriquée à partir des mêmes listes que les pages
                          /decouvrir (rien d'écrit à la main)
  robots.ts, sitemap.ts  autorisations des robots (robots des IA nommés un par un, avec la liste des pages
                          privées répétée pour chacun, voir le commentaire du fichier) et plan du site

components/
  InteractionGlobale.tsx  couche montée une seule fois au niveau du layout racine : fournisseurs du chat,
                          du retour, du curseur, du canal en direct et de la voix, plus les éléments
                          flottants du canal (curseur, bulle, journal, bouton, superposition vocale) rendus
                          dans un portail. Ils restent donc en place en passant de l'app aux pages
                          Découvrir. À chaque changement de compte, la voix et le canal sont coupés et
                          le contexte du chat recharge son historique et ses outils.
  Logo.tsx                la plume dorée, deux versions de la même image : par défaut sur sa tuile sombre
                          (public/logo-classinus.webp), et avec la prop sansFond la plume seule, fond transparent
                          (public/logo-classinus-sans-fond.webp), utilisée partout (appli et pages publiques) ;
                          la tuile ne sert plus qu'aux icônes et à l'image de partage.
                          SplashOuverture.tsx (écran d'ouverture) utilise la plume seule sur le fond du thème
  AppShell.tsx           coquille de toute l'app connectée : sidebar desktop classique (AppSidebar),
                          hamburger + tiroir coulissant sur web mobile ; en natif, la nav passe par
                          components/mobile/ à la place
  MenuProfil.tsx          bouton profil et son panneau (profil, Paramètres, thème, déconnexion), utilisé par
                          AppSidebar (rail et tiroir du chat) et par l'en-tête du menu Plus du téléphone ;
                          photo et nom viennent de lib/useMonProfilAffiche.ts
  AppSidebar.tsx          sidebar desktop (Bureau/Bibliothèque/Notes en direct, groupes
                          "Personnaliser Clovis" et "Scolarité") ; repliée par défaut, elle se
                          déplie au survol du bouton "Classinus" par-dessus la page, sans la décaler.
                          Sur téléphone, le tiroir du chat montre les quatre groupes (Bibliothèque,
                          Concentration, Bureau, Personnaliser) avec leurs sous-sections ; le rail
                          ordinateur et le tiroir ne montent que leurs propres boutons de groupe
                          (lib/useEstDesktop.ts), pour qu'un menu masqué ne ferme jamais celui qui
                          est visible
  voix/                   voix en direct (Gemini Live) : OndeVoix (onde dessinée, trois aspects selon l'état)
                          et VoixDirecteSuperposition (onde plein écran dans le chat, bulle réduite,
                          bulle qui suit le curseur de Classinus quand le canal en direct est actif).
                          Aucun texte d'état à l'écran. Session unique partagée : lib/contexteVoixDirecte.tsx,
                          montée dans InteractionGlobale ; réglages (modèle, consignes, relances) côté serveur
                          dans core/gemini_live_config.py.
  mobile/
    BarreOngletsNative.tsx  vraie barre d'onglets système (plugin Capgo, pas une barre CSS/React) :
                             Bibliothèque, Contrôle de session, Chat (au milieu), Notes, Personnaliser
                             Clovis ; masquée automatiquement pendant le chat plein écran
    BarreOngletsWeb.tsx     équivalent affiché quand l'app tourne dans un navigateur mobile classique ;
                            elle descend hors de l'écran quand le clavier s'ouvre au lieu de remonter au
                            dessus de lui (lib/useClavierOuvert.ts, partagé avec le canal en direct)
    MenuHamburgerNatif.tsx  menu "Plus" en natif : bouton haut gauche (icône 3 barres décroissantes) +
                            panneau flottant, reprend le contenu de l'ancien onglet Plus
    MenuHamburgerWeb.tsx    même menu, variante web
    ProfilEnteteMenuPlus.tsx  en tête du menu Plus (natif et web), à la place du titre : le bouton profil
                            de la barre latérale du chat (photo, nom, puis profil, Paramètres, thème,
                            déconnexion) ou "Se connecter" sans compte. Paramètres n'est donc plus dans la liste
    GestionRetourNatif.tsx  gestion du bouton retour matériel Android
  chat/                  composants du chat (ChatIA.tsx, ChatFlottant.tsx, BarreDeSaisie.tsx...) ;
                          ChatSection.tsx (07/09/2026) : version "page normale" du chat plein écran
                          pour la route /chat (chantier en cours "chat plein écran = vraie section" --
                          ChatFlottant.tsx gère encore l'ancien overlay fixed en parallèle tant que le
                          chantier n'est pas terminé) ;
                          chat/barre/ (01/10/2026) : morceaux de la barre de saisie, le bouton "+" et son
                          menu (MenuPlus.tsx), le bouton "Réglages" avec ses lignes
                          (choix dans un volet latéral sur PC, dépliés sous la ligne sur mobile) et sa bulle des réglages actuels au survol (BoutonReglages.tsx, LigneReglage.tsx), les données du mode
                          pédagogique, des modes ressources et du code enseignant (useReglagesPedagogiques.ts,
                          useModeActif.ts), le bandeau d'accès bloqué d'un mineur sans code, et les listes
                          de réglages partagées (reglagesReponse.ts) ;
                          SelecteurModeleHaut.tsx (14/10/2026) : bouton du modèle en haut au milieu du chat,
                          nom et icône du fournisseur du modèle actif, liste dépliante groupée par fournisseur. Les modèles pas encore
                          ouverts (modeles_bientot, envoyés par le backend) y sont grisés avec la mention Bientôt.
                          Il remplace la ligne Modèle de Réglages dans la barre de saisie (BoutonReglages garde
                          cette ligne seulement pour le canal en direct, prop afficherChoixModele).
                          Plus de choix "Auto" (15/10/2026) : le modèle actif est le dernier choix de l'élève
                          (gardé sur son compte, profiles.modele_prefere, donc le même sur tous ses appareils),
                          sinon DeepSeek Flash, sinon le premier de la liste (lib/modeleActif.ts). Sur
                          téléphone (chat plein écran) le bouton est posé tout en haut, sur la ligne du hamburger ;
                          IconeFournisseur.tsx : icône d'un fournisseur de modèles, depuis public/icones-fournisseurs/ ;
                          LigneApercuPieces.tsx (02/10/2026) : ligne unique défilable des pièces jointes,
                          avant envoi (BarreDeSaisie.tsx) et après envoi (BulleMessage.tsx) ; carrés pour
                          images et vidéos, pilules empilées par deux pour le reste ; FenetreTexteColle.tsx
                          et FenetreMedia.tsx : fenêtres de lecture d'un texte collé et d'un audio ou d'une
                          vidéo ; lib/texteColle.ts : détection du langage d'un texte collé ;
                          PleinEcranApercu.tsx (20/09/2026) : vrai plein écran de bord à bord du bouton
                          Agrandir des aperçus (BlocExpansible.tsx : widget, animation, PDF, Office, texte), monté
                          dans <body> par un portail pour ne jamais être recadré par le message ;
                          BlocLarge.tsx (20/09/2026) : règle des blocs larges (tableaux, blocs de code,
                          aperçus md et code) qui s'élargissent des deux côtés de la colonne de texte sans
                          bouger le texte ; toute nouvelle zone de chat doit porter data-zone-chat (voir
                          ChatIA.tsx) et tout futur bloc large s'envelopper dans BlocLarge ;
                          BlocExpansible.tsx, option direct (04/10/2026) : le widget interactif et
                          l'animation s'affichent tout de suite dans le fil, à la largeur du texte comme un
                          tableau, sans puce repliée, sans carte, sans ligne de titre ni bouton Fermer ; les
                          boutons (Filmer, Copier, Agrandir) sont dans une fine rangée au dessus, révélée au
                          survol sur ordinateur et toujours visible sur écran tactile, hors du widget pour ne
                          jamais apparaître dans la vidéo de Filmer, puis dans un rail d'icônes collé en haut
                          du bloc (au survol) quand cette rangée sort de l'écran ; les autres contenus (code, PDF, Office,
                          texte) gardent la puce repliée ; le widget suit le thème de l'utilisateur sans rechargement
                          (état conservé), l'animation se recrée avec les nouvelles couleurs et reprend à la même
                          seconde, en lecture ou en pause ; le widget et l'animation ne font qu'un avec le chat : ni
                          contour ni coins arrondis sur l'iframe, document au fond transparent et sans marge, et
                          la hauteur du widget suit son contenu (plafond de sécurité à 6000 px) sans défilement
                          dans le widget lui même
                          (la barre de défilement du document du widget et de l'animation est masquée, avec
                          !important : un dépassement de 1 ou 2 px affichait une barre blanche à droite ; la
                          molette, le doigt et le clavier défilent toujours)
    minuteurs/           minuteurs (20/09/2026) : DockMinuteurs.tsx (cartes et pastilles en position fixe
                          sous la cloche, montée UNE fois dans AppShell.tsx pour tous les écrans, 03/10/2026),
                          CarteMinuteur.tsx, PastilleMinuteur.tsx (version réduite),
                          LanceurMinuteur.tsx (bouton horloge à gauche de la cloche : durée libre sans plafond
                          en secondes/minutes/heures, suite facultative, retrouver les masqués),
                          AnneauMinuteur.tsx
    AnimationLecteur.tsx  bloc ```animation du markdown (29/09/2026) : animation qui se regarde comme une
                          vidéo (lecture, pause, barre de progression, barre d'espace), en 2D (SVG) ou en 3D
                          (Three.js r128 chargé depuis cdnjs, jsdelivr en secours), pour n'importe quel sujet,
                          dans une iframe isolée comme le widget (WidgetSandbox.tsx), affichée directement
                          dans le fil (04/10/2026) et lancée seulement quand elle approche de l'écran ;
                          branché dans composantsMarkdownRiches.tsx et RenduMarkdownAutonome.tsx
    animation/           le lecteur lui même : construireDocumentAnimation.ts (page de l'iframe, thème,
                          barre de lecture) et runtimeAnimation.ts (code exécuté dans l'iframe). Le modèle
                          n'écrit que le contenu : une ou plusieurs parties (animer), chacune étant une fonction de sa
                          progression p (0 à 1), rejouée dans l'ordre à chaque image (animer peut être écrit après installer ou à l'intérieur) ; titres cliquables et
                          légende facultatifs. Pause et retour en arrière sont donc exacts. Textes dans lib/textesAnimation.ts. Consignes données au modèle
                          dans clovis-backend, core/profils_agents.py (INSTRUCTIONS_FORMATS_AFFICHAGE)
    BoutonVideoAnimation.tsx  bouton Télécharger de la barre d'actions du bloc animation (07/10/2026) : il ouvre un petit menu
                          (MenuActionsCarte) pour choisir le format, 16:9 ou 9:16, puis télécharge l'animation en vidéo MP4, fabriquée par le serveur (classinus-backend, api/rendu_animation.py),
                          donc aussi sur téléphone. Sans état : tout vit dans lib/useVideoAnimation.ts (envoi, suivi de
                          l'avancement, annulation, téléchargement). Appels dans lib/apiRenduVideoAnimation.ts, textes dans
                          lib/textesVideoAnimation.ts. Le document envoyé est celui du lecteur, mis en page au format de la
                          vidéo par animation/styleRenduVideo.ts (16:9 : la scène seule ; 9:16 : titre de la partie en haut,
                          scène au milieu, légende en bas, les textes dessinés dans l'animation restant prioritaires) et
                          piloté par animation/runtimeRenduVideo.ts (dessiner l'animation à un instant donné). three.js
                          est aussi copié côté serveur : changer sa version ici impose de changer cette copie
  icones/, icons/        icônes du produit
  VisionneurLivre.tsx     liseuse des livres numériques EPUB et MOBI (11/10/2026), dépliée dans le fil comme le PDF
                          (components/chat/FichierChip.tsx). Charge le moteur public/foliate-js à l'ouverture
                          seulement, lit le fichier en suivant l'avancement (refus au-delà de
                          NEXT_PUBLIC_LIVRE_TAILLE_MAX_MO, 100 par défaut), sommaire, flèches du clavier, thème
                          clair ou sombre. Chaque page du livre passe par lib/neutraliserPageLivre.ts avant
                          d'être affichée
  chat/LecteurMedia.tsx   lecteur audio et vidéo du chat. Un fichier d'un site externe passe par le relais
                          (lib/useLienRelaisExterne.ts) ; si la lecture échoue, il retente avec l'adresse
                          d'origine puis affiche une carte de téléchargement
  chat/LinkPreview.tsx    carte d'un lien du chat (aperçu du site, vignette YouTube). Depuis le 12/10/2026, le texte
                          du lien markdown écrit par le modèle devient le titre de la carte et l'attribut title
                          ([Titre](url "Description")) sa description (2 lignes sur la carte, en entier dans l'aperçu
                          ouvert au clic) ; le titre du site ne sert que de repli (les vignettes YouTube gardent le titre de la vidéo et
                          la ligne de la chaîne). La carte porte data-titre-lien et
                          data-description-lien, que GardienLiensSortants.tsx relit pour les passer à l'aperçu
  chat/BoutonCopierLien.tsx  bouton qui copie l'adresse d'un lien (11/10/2026). Icône nue (sans cadre ni
                          texte). Variante survol : posée à côté d'une carte de LinkPreview, visible seulement au
                          survol de CETTE carte (groupe nommé group/lien) et à la souris, cachée sur téléphone ;
                          variante texte : même icône dans l'en-tête de l'aperçu (VisionneurPositionGlobal), pour
                          tous les types sauf la carte de site, qui a la sienne sous la carte
  lib/arretServeur.ts     appel POST /api/chat/arreter : demande au serveur d'arrêter les outils et la boucle d'agent du tour (12/10/2026)
  lib/tacheCanal.ts       état de la tâche du canal et signal d'arrêt commun : le bouton Arrêter (chat ou canal) coupe aussi la
                          voix, le commentaire affiché et la frappe simulée, et prévient le serveur (abonnerArretTache,
                          arreterToutLocalEtServeur)
  lib/copierMarkdown.ts   copie "formatée" d'un markdown : HTML rendu + markdown brut dans le presse-papiers
                          (boutons "Copier formaté" / "Copier brut" de ContenuMarkdown, VisionneuseBibliotheque.tsx).
                          FenetreTexteColle.tsx (aperçu d'un long texte collé) affiche le texte formaté par défaut,
                          avec un bouton Brut ; code et LaTeX gardent leur rendu

public/
  icones-fournisseurs/    icônes SVG des fournisseurs de modèles (claude, gpt, gemini, deepseek, grok), nommées comme la clé
                          "distributeur" du backend, tirées de @lobehub/icons-static-svg (licence MIT). Pour ajouter
                          un fournisseur : déposer son SVG ici et l'ajouter dans components/chat/IconeFournisseur.tsx
  foliate-js/             moteur de lecture EPUB et MOBI (foliate-js, licence MIT), copié sans modification
                          (voir ORIGINE.txt dans le dossier : commit repris, fichiers gardés). Servi tel quel,
                          jamais intégré au bundle (chargé par import dynamique depuis VisionneurLivre.tsx) ;
                          pour le mettre à jour, remplacer les fichiers par ceux du dépôt d'origine puis
                          rouvrir un livre dont une page contient un script, pour vérifier que rien ne s'exécute
  pdf-worker/             worker pdf.js du lecteur PDF
  pyodide-worker.mjs      worker Python (voir lib/executionPython.ts)

lib/
  api.ts                 client HTTP vers clovis-backend (NEXT_PUBLIC_API_URL)
  supabase.ts             client Supabase (auth + DB), enregistrement des plugins Capacitor natifs
  contexteChat.tsx        état global du chat (état "plein_ecran" lu par la barre d'onglets,
                          préremplissage d'une nouvelle conversation via useOuvrirChatAvecTexte) ;
                          porte aussi l'état de la conversation elle-même (agent, messages,
                          historique...) depuis le 07/09/2026, remonté depuis ChatFlottant.tsx pour
                          qu'il soit lisible à la fois par ChatFlottant.tsx et par la future route
                          /chat (ChatSection.tsx) sans dupliquer le chargement initial
  contexteCatalogue.tsx, contexteFenetres.tsx, contexteRetour.tsx  autres contextes React globaux
  useDeplacable.ts        éléments flottants déplaçables au doigt ou à la souris (20/09/2026) : décalage par
                          rapport à l'emplacement d'origine, bornes à l'écran, clic ignoré après un glissement ;
                          utilisé par CanalEnDirectFlottant.tsx (canal + dictée + écriture) et BoutonJournalAgent.tsx
  contexteMinuteurs.tsx   minuteurs (20/09/2026) : liste, actions de l'étudiant, prise en charge de la fin
                          (message automatique invisible : par le chat à l'écran, sinon par le canal en
                          direct et sa bulle s'il est actif, 03/10/2026) ;
                          minuteurs.ts (appels /api/minuteurs, formats), textesMinuteurs.ts (textes par
                          langue), useMaintenantMs.ts (horloge locale des affichages)
  canalTempsReel.ts      client du canal temps réel avec le backend (exploration de dossier mobile...)
  executionPython.ts      bouton Exécuter des blocs de code : Python (Pyodide) tourne dans un Worker
                          (public/pyodide-worker.mjs) sur l'appareil de l'étudiant. prechargerPython() démarre
                          le chargement de Pyodide dès l'ouverture de l'appli (AppShell.tsx, au repos du
                          navigateur) et après toute coupure du worker, pour que l'exécution soit instantanée ;
                          useExecutionPython.ts gère l'état d'un bloc (sortie, input(), sys.argv)
  telecharger.ts          téléchargement réel d'un fichier par adresse (10/10/2026) : lecture au fil de l'eau
                          avec pourcentage (Content-Length exposé par le backend), échec signalé avec un message
                          clair, jamais d'exception. L'état de chaque téléchargement vit dans etatTelechargements.ts ;
                          les boutons l'affichent via components/EtatTelechargement.tsx (icône, pourcentage, rouge
                          + "Réessayer" en cas d'échec) et components/IndicateurTelechargements.tsx (carte globale,
                          layout racine) couvre les téléchargements sans bouton (lien du chat, sélection). Textes
                          dans textesTelechargement.ts
  liensSortants.ts        règle unique des liens qui veulent sortir de l'appli (20/09/2026) : un fichier se
                          télécharge vraiment (lib/telecharger.ts), tout autre lien passe par l'aperçu interne
                          (VisionneurPositionGlobal) qui demande ensuite d'ouvrir le site ; appliquée à tous les
                          clics par components/GardienLiensSortants.tsx (layout racine). data-lien-libre sur un
                          lien = garde son comportement natif. Seul ouvrirSiteExterieur quitte réellement l'appli
  neutraliserPageLivre.ts filtre de sécurité des livres numériques (11/10/2026) : retire scripts, gestionnaires
                          on*, liens javascript:, iframes, objets et redirections de chaque page d'un livre, et
                          pose une règle Content-Security-Policy qui interdit le reste. Un livre venu d'un site
                          externe est un contenu non fiable, ses pages tournent avec les mêmes droits que
                          l'appli (limite de WebKit sur le bac à sable des iframes)
  useHauteurWidget.ts     hauteur du cadre d'un widget interactif (03/10/2026) : suit la hauteur du contenu entre
                          120 et 1200 px, repart de 384 px (l'ancienne hauteur fixe) ; garde contre un widget
                          qui dépend de la hauteur de la fenêtre (retour à 384 px après 5 agrandissements de
                          suite), ignorée en plein écran, figée pendant un enregistrement du bouton Filmer ;
                          scriptHauteurWidget.ts : le script posé dans le widget qui mesure son contenu (bas
                          de l'élément le plus bas, éléments en position fixe ignorés)
  paletteIframe.ts        palette de l'interface pour les contenus en iframe isolée (widget et animation, une
                          seule source) : variables CSS --dj-*, objet THEME du widget, script qui applique un
                          changement de thème sans recharger le widget (04/10/2026) ; le modèle n'écrit plus
                          aucune couleur, fond ni police, la consigne est dans le backend (profils_agents.py)
  useProcheEcran.ts       devient vrai quand un élément approche de l'écran (04/10/2026), puis le reste ;
                          sert au widget interactif et à l'animation, qui ne démarrent qu'à ce moment
                          pour qu'une longue conversation n'en lance pas dix d'un coup
  usePluginNatif.ts       hook d'accès générique aux plugins Capacitor
  useNotificationsPush.ts abonnement aux notifications Web Push (protégé : jamais appelé en natif,
                          la WebView Capacitor n'a pas l'objet Notification du navigateur)
  erreurs.ts              messages d'erreur centralisés, miroir de core/erreurs.py côté backend
  outils.ts, matieres.ts, coloration.ts, dateRelative.ts, formatageHeure.ts, salutations.ts  utilitaires

android/, ios/            projets Capacitor (capacitor.config.ts minimal, export statique build:capacitor
                          vers webDir "out", pas de rechargement du site distant dans la WebView)
```

## Écrans (`app/(app)`)

| Route | Contenu |
|---|---|
| `/` | Accueil (raccourcis "Mon espace", activité récente) |
| `/bureau` | Bureau : page d'accueil en liste, même principe que Personnaliser Clovis |
| `/bureau/audit` | Audit hebdomadaire des signalements des élèves |
| `/bureau/codes` | Mes codes |
| `/bureau/programme` | Programme de notions par code |
| `/bureau/entrer-code` | Entrer un code reçu |
| `/bureau/etablissements` | Établissements (la fiche `/etablissements/[id]` y ramène) |
| `/bureau/signalements` | Signalements reçus des élèves |
| `/bibliotheque` | Bibliothèque : page d'accueil en liste (Perso, Publique, Dossiers du téléphone), même principe que Personnaliser Clovis |
| `/bibliotheque/perso` | Bibliothèque personnelle |
| `/bibliotheque/publique` | Bibliothèque publique (catalogue partagé par tout le monde) |
| `/bibliotheque/telephone` | Dossiers du téléphone (appli mobile uniquement) |
| `/memoire` | Ma mémoire |
| `/comportements` | Mes skills ("comportements" en interne) |
| `/skills-publics` | Skills publics (catalogue partagé par les autres étudiants) |
| `/personnaliser` | Personnaliser Clovis : page d'accueil en liste (Mes skills, Skills publics, Ma mémoire) — onglet central du menu natif |
| `/controle-session` | Concentration : page d'accueil en liste, même principe que Personnaliser Clovis |
| `/controle-session/session` | Contrôle de session |
| `/controle-session/temps-ecran` | Temps d'écran |
| `/rappels` | Notes / rappels |
| `/connecter-claude` | Connexion du serveur MCP public comme connecteur externe |
| `/parametres` | Paramètres (profil, préférences, confidentialité, capacités du téléphone, accessibilité, aide, à propos, zone de danger) |
| `/plus` | Menu "Plus" en version web (bureau, scolarité, connecter Claude, admin, paramètres) |
| `/admin/signalements` | Modération des signalements de contenu public |

### Accès sans compte

Toutes les pages du groupe `app/(app)` s'affichent sans compte (mode invité).
Seules les actions qui ont vraiment besoin d'un compte le demandent, via
`components/CompteRequisModal.tsx` (déjà utilisé par la Bibliothèque publique,
les établissements, les notes/commentaires...). Le chat garde sa propre
limite invité (5 messages, `ChatSection.tsx`/`ChatFlottant.tsx`) avant
d'afficher cette même modale.

Historique : une garde globale bloquant toute page sans compte (sauf les
pages d'élément partagé) a existé du 19/09/2026 au 22/09/2026
(`components/AppShell.tsx`, liste dans l'ex-`lib/routesPubliques.ts`) --
retirée à la demande de Bourama, qui bloquait aussi le chat invité.

## Sections en groupe (Personnaliser Clovis, Bibliothèque, Bureau, Concentration)

Une section en groupe a une page d'accueil en liste (`components/ListeSections.tsx`)
et des pages filles qui sont de vraies routes, pas des onglets en mémoire. Les lignes de cette liste sont
à nu, sans carte ni flèche : un trait les sépare et commence après l'icône. Ce trait, ainsi que le trait
renforcé des icônes de section, viennent de `lib/styleLignes.ts`, lu aussi par les listes de la Bibliothèque,
de la Bibliothèque publique et des Dossiers du téléphone.
La page Paramètres (`components/ParametresAccueil.tsx`) suit le même visuel et s'affiche tout de suite, sans écran de
chargement : seule sa ligne de profil montre un squelette le temps de recevoir sa donnée. Skills publics, Entrer un code,
Ma mémoire et l'écran d'accueil sont aussi à nu, sans carte, de même que la liste de Mes skills (une ligne par skill, plus de pastilles). Dans Paramètres et dans le panneau Plus du téléphone, les groupes de plusieurs lignes sont enfermés dans un cadre arrondi, avec les mêmes lignes de séparation à l'intérieur. Le panneau Plus s'ouvre collé en haut de l'écran (option `enHaut` de `components/PanneauFlottant.tsx`), son titre en haut. Dans Ma mémoire, chaque catégorie est repliée par défaut. Chaque
page fille affiche un fil d'Ariane avec retour, et le passage d'une page voisine à
l'autre remplace l'entrée d'historique au lieu d'en ajouter une. Sur PC, un menu à
gauche liste les pages voisines ; sur téléphone, la même liste s'affiche en haut
sous forme de pastilles (`OngletsLiens` dans `components/OngletsSegment.tsx`).
Les deux se branchent via la prop `groupe` de `components/SectionPage.tsx`.
La ligne du titre (avec le retour et le « i ») et, sur téléphone, les pastilles restent en place quand la page défile.
Bibliothèque : la liste est dans `lib/sectionsBibliotheque.tsx`, les adresses dans
`lib/routesBibliotheque.ts`. Bureau : `lib/sectionsBureau.tsx` et `lib/routesBureau.ts`. Concentration :
`lib/sectionsConcentration.tsx` et `lib/routesConcentration.ts`. Personnaliser Clovis :
`lib/sectionsPersonnaliser.tsx` et `lib/routesPersonnaliser.ts` (`/comportements` et `/memoire` gardent
leurs adresses historiques hors de `/personnaliser`, seul `/skills-publics` est nouveau).
Dans le chat, chaque groupe devient un bouton qui déplie la liste de ses pages
(`components/MenuGroupeRail.tsx`) : au survol sur PC (le premier clic ne change rien, le second
entre dans la page du groupe), au toucher dans le tiroir mobile (un toucher ouvre la liste, un autre
la referme, on entre dans une page en touchant sa ligne).
Sur PC, cette liste a l'apparence compacte de la bulle du bouton Réglages de la barre de saisie
(largeur du contenu, petit texte, lignes serrées) ; le tiroir mobile garde des lignes tactiles.
La barre latérale a le même fond que la barre de saisie (`bg-dj-surface`) et des icônes
petites au trait renforcé, avec des noms en semi-gras ; leur taille et leur trait viennent de `lib/styleBarreLaterale.ts`.
Le prop `groupe` se fabrique avec `construireGroupe` (`lib/groupeSections.tsx`). Le titre
et le bouton "i" d'une page fille sont portés par la page (`components/DefinirInfoSection.tsx`),
les écrans ne les répètent pas dans leur carte.

## Navigation mobile

Décision confirmée : barre d'onglets système en bas (Bibliothèque,
Contrôle de session, Chat, Notes, Personnaliser Clovis) + menu "Plus" en
icône hamburger haut gauche plutôt qu'en onglet. Implémentée avec de
vrais composants système (`@capgo/capacitor-native-navigation` +
`@capgo/capacitor-transitions`), pas une barre stylée en CSS. La version
web mobile (navigateur, hors app installée) garde un hamburger + tiroir
coulissant équivalent mais non natif.

Neuf plugins Capacitor natifs existent côté Android (`MainActivity.java`) :
Dossiers, ControleSession, Connecteurs, Accessibilité, MiseAJour, PontNatif,
TempsEcran, Notifications et Telechargement (vrai téléchargement système
Android -- DownloadManager pour les fichiers déjà en ligne, MediaStore.Downloads
+ notification pour le contenu généré côté client -- voir `lib/telecharger.ts`),
tous ont désormais un point d'entrée dans la nav web/TypeScript.

## Ce qui tourne en production

- App web sur Vercel (Next.js 14, React 18), consommant `clovis-backend`.
- App mobile Android/iOS buildée depuis ce même dépôt (`npm run
  build:capacitor`), distribuée hors store (APK via `/telecharger`) ;
  socle natif historique (Kotlin/Compose + Swift/SwiftUI) conservé pour
  référence dans le dépôt séparé `clovis-mobile`, plus de nouveau
  développement natif direct là bas.

## Variables d'environnement

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL de `clovis-backend` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client Supabase (auth + DB) |
| `NEXT_PUBLIC_LIVRE_TAILLE_MAX_MO` | taille maximale, en Mo, d'un livre numérique ouvert dans la liseuse (100 si absente ou invalide) ; au-delà, carte de téléchargement. Optionnelle |
| `NEXT_PUBLIC_OTA_LATEST_URL` | adresse de `latest.json` pour les mises à jour OTA de l'appli installée (voir "Mises à jour OTA") ; adresse du dépôt `classinus-updates` par défaut. Optionnelle |
| `NEXT_PUBLIC_APP_URL` | URL publique du déploiement, utilisée par `app/layout.tsx` (balises OG) et le bouton partager (lien de téléchargement de l'app) ; sur Vercel, doit être créée en type "Configuration", jamais "Secrète" (incompatible avec un préfixe `NEXT_PUBLIC_`) |

Voir `.env.local.example`.

## Lancer l'app

```
npm install
npm run dev
```

## Builder pour mobile (Capacitor)

```
npm run build:capacitor
```

Build statique Next.js vers `out/`, puis `npx cap sync`. Nécessite
Android Studio/Xcode installés localement pour ouvrir et compiler les
projets `android/`/`ios/` ensuite (hors de portée d'un sandbox sans ces
outils).

## Mises à jour OTA (sans réinstaller l'APK)

Le code web de l'appli installée se met à jour tout seul : à l'ouverture,
l'appli télécharge en arrière-plan le dernier bundle, et il s'active à
l'ouverture suivante. Seuls les changements natifs (nouveau plugin, permission,
manifest Android, mise à jour de Capacitor) exigent un nouvel APK.

- **Publication automatique** : chaque push sur `main` lance
  `.github/workflows/ota.yml` (jamais depuis `staging`). Il construit l'export
  statique, publie `bundle.zip` en release du dépôt `classinus-updates`, puis met
  à jour `latest.json` dans ce même dépôt. Les 5 dernières versions sont gardées
  (variable `OTA_VERSIONS_GARDEES` pour changer).
- **Côté appli** : `lib/miseAJourOta.ts`, lancé par `components/MiseAJourOta.tsx`
  (monté dans `app/layout.tsx`). Plugin `@capgo/capacitor-updater` en mode
  manuel, aucun service Capgo n'est utilisé. Si un bundle ne démarre pas, le
  plugin revient à la version précédente et cette version n'est plus retentée.
- **Compatibilité native** : `ota.config.json` contient `versionNativeMin`, le
  `versionCode` (`android/app/build.gradle`) minimal d'un APK pour recevoir les
  bundles. À relever dès qu'un changement natif rend les anciens APK
  incompatibles avec le nouveau code web.
- **Réglages GitHub à faire une fois** dans ce dépôt (Settings, Secrets and
  variables, Actions) : secret `UPDATES_TOKEN` (jeton avec droit d'écriture sur
  `classinus-updates`), variables `OTA_DEPOT` (`petitboura/classinus-updates`),
  `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL`. Le workflow s'arrête
  avec un message clair si l'un d'eux manque.
- **Première mise en place** : les APK déjà installés n'ont pas le plugin. Un
  APK qui l'embarque doit d'abord être publié par le circuit habituel
  (`/telecharger`), ensuite tout le code web passe en OTA.
