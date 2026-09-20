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
  layout.tsx             layout racine, résout NEXT_PUBLIC_APP_URL pour les balises OG

components/
  AppShell.tsx           coquille de toute l'app connectée : sidebar desktop classique (AppSidebar),
                          hamburger + tiroir coulissant sur web mobile ; en natif, la nav passe par
                          components/mobile/ à la place
  AppSidebar.tsx          sidebar desktop (Bureau/Bibliothèque/Notes en direct, groupes
                          "Personnaliser Clovis" et "Scolarité")
  mobile/
    BarreOngletsNative.tsx  vraie barre d'onglets système (plugin Capgo, pas une barre CSS/React) :
                             Bibliothèque, Contrôle de session, Chat (au milieu), Notes, Personnaliser
                             Clovis ; masquée automatiquement pendant le chat plein écran
    BarreOngletsWeb.tsx     équivalent affiché quand l'app tourne dans un navigateur mobile classique
    MenuHamburgerNatif.tsx  menu "Plus" en natif : bouton haut gauche (icône 3 barres décroissantes) +
                            panneau flottant, reprend le contenu de l'ancien onglet Plus
    MenuHamburgerWeb.tsx    même menu, variante web
    GestionRetourNatif.tsx  gestion du bouton retour matériel Android
  chat/                  composants du chat (ChatIA.tsx, ChatFlottant.tsx, BarreDeSaisie.tsx...) ;
                          ChatSection.tsx (07/09/2026) : version "page normale" du chat plein écran
                          pour la route /chat (chantier en cours "chat plein écran = vraie section" --
                          ChatFlottant.tsx gère encore l'ancien overlay fixed en parallèle tant que le
                          chantier n'est pas terminé)
    minuteurs/           minuteurs du chat (20/09/2026) : DockMinuteurs.tsx (zone en haut du chat, montée
                          par ChatIA.tsx), CarteMinuteur.tsx, PastilleMinuteur.tsx (version réduite),
                          LanceurMinuteur.tsx (bouton horloge : lancer, retrouver les masqués),
                          AnneauMinuteur.tsx
  icones/, icons/        icônes du produit

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
  contexteMinuteurs.tsx   minuteurs du chat (20/09/2026) : liste, actions de l'étudiant, prise en charge
                          de la fin (message automatique invisible envoyé à Clovis par le chat ouvert) ;
                          minuteurs.ts (appels /api/minuteurs, formats), textesMinuteurs.ts (textes par
                          langue), useMaintenantMs.ts (horloge locale des affichages)
  canalTempsReel.ts      client du canal temps réel avec le backend (exploration de dossier mobile...)
  liensSortants.ts        règle unique des liens qui veulent sortir de l'appli (20/09/2026) : un fichier se
                          télécharge vraiment (lib/telecharger.ts), tout autre lien passe par l'aperçu interne
                          (VisionneurPositionGlobal) qui demande ensuite d'ouvrir le site ; appliquée à tous les
                          clics par components/GardienLiensSortants.tsx (layout racine). data-lien-libre sur un
                          lien = garde son comportement natif. Seul ouvrirSiteExterieur quitte réellement l'appli
  usePluginNatif.ts       hook d'accès générique aux plugins Capacitor
  useNotificationsPush.ts abonnement aux notifications Web Push (protégé : jamais appelé en natif,
                          la WebView Capacitor n'a pas l'objet Notification du navigateur)
  erreurs.ts              messages d'erreur centralisés, miroir de core/erreurs.py côté backend
  routesPubliques.ts      liste des pages d'élément partagé ouvertes sans compte (voir "Accès sans compte")
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

Rien n'est accessible sans compte, sauf une page d'élément partagé ouverte par
son lien : fichier, dossier ou skill (version publique ou perso, routes
`/bibliotheque/[id]`, `/dossiers/[id]`, `/skills/[id]` et leur variante
`/perso/[id]`) et fiche établissement (`/etablissements/[id]`). Toute autre
page du groupe `app/(app)` renvoie vers `/inscription`. La garde est posée une
seule fois, dans `components/AppShell.tsx`, et la liste des pages ouvertes vit
dans `lib/routesPubliques.ts` : une nouvelle page est donc protégée d'office,
et il suffit de l'ajouter à cette liste pour l'ouvrir à tout le monde.

Les mots `perso`, `publique` et `telephone`, seuls après `/bibliotheque/`,
sont réservés aux pages de liste de la Bibliothèque et ne sont jamais pris
pour l'identifiant d'un document partagé. Leur liste vient de
`lib/routesBibliotheque.ts`, la source unique des adresses de la Bibliothèque.

## Sections en groupe (Personnaliser Clovis, Bibliothèque, Bureau, Concentration)

Une section en groupe a une page d'accueil en liste (`components/ListeSections.tsx`)
et des pages filles qui sont de vraies routes, pas des onglets en mémoire. Chaque
page fille affiche un fil d'Ariane avec retour, et le passage d'une page voisine à
l'autre remplace l'entrée d'historique au lieu d'en ajouter une. Sur PC, un menu à
gauche liste les pages voisines ; sur téléphone, la même liste s'affiche en haut
sous forme de pastilles (`OngletsLiens` dans `components/OngletsSegment.tsx`).
Les deux se branchent via la prop `groupe` de `components/SectionPage.tsx`.
Bibliothèque : la liste est dans `lib/sectionsBibliotheque.tsx`, les adresses dans
`lib/routesBibliotheque.ts`. Bureau : `lib/sectionsBureau.tsx` et `lib/routesBureau.ts`. Concentration :
`lib/sectionsConcentration.tsx` et `lib/routesConcentration.ts`. Personnaliser Clovis :
`lib/sectionsPersonnaliser.tsx` et `lib/routesPersonnaliser.ts` (`/comportements` et `/memoire` gardent
leurs adresses historiques hors de `/personnaliser`, seul `/skills-publics` est nouveau).
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
