"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Pin, Mic, Square, AudioLines, ArrowUp, X, MapPin, FileText, ArrowUpRight, Minimize2, Search, Code, PenLine, Wrench, FileSearch, Globe, Map, FileType, FileSpreadsheet, Presentation, FolderSearch, Package, Archive, Download, Image as IconImage, Bell, FolderTree, FileCode, Edit3, Sigma, Check, LayoutGrid, SlidersHorizontal, UserX, Radio } from "lucide-react";
import { transcrireAudioChat, statutConnexion, demarrerConnexion, depotsGithub, pagesNotion, lignesBaseNotion, creerPageNotion, extraireFormuleImage, lireOutilsChatAgent, demarrerZipChat } from "@/lib/api";
import { APPLIS_DISPONIBLES, useOutilsRegistre } from "@/lib/outils";
import { LecteurMedia } from "./LecteurMedia";
import { CanvasDessin } from "./CanvasDessin";
import { VisionneuseImage } from "./VisionneuseImage";
import { LigneApercuPieces, type GenrePiece, type PieceApercu } from "./LigneApercuPieces";
import { FenetreTexteColle } from "./FenetreTexteColle";
import { FenetreMedia } from "./FenetreMedia";
import dynamic from "next/dynamic";
import katex from "katex";
import { messageErreur } from "@/lib/erreurs";
import { Skeleton } from "../Skeleton";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { PleinEcranApercu } from "./PleinEcranApercu";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { BoutonRetour } from "@/components/BoutonRetour";
import { ouvrirPosition } from "./visionneurPositionEvenement";
import { BoutonReglages } from "./barre/BoutonReglages";
import { MenuPlus, type EntreeMenuPlus } from "./barre/MenuPlus";
import { BandeauAccesBloque } from "./barre/BandeauAccesBloque";
import { useModeActif } from "./barre/useModeActif";
import { useReglagesPedagogiques } from "./barre/useReglagesPedagogiques";
import type { LongueurReponse } from "./barre/reglagesReponse";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { detecterLangageCode, type TexteColle } from "@/lib/texteColle";
import { ContexteVoixDirecte } from "@/lib/contexteVoixDirecte";

// EditeurMathsRiche (tiptap + mathlive) et EditeurFormule (mathlive) ne
// montent que quand leur modale respective s'ouvre (voir
// editeurMathsRicheOuvert/editeurFormuleOuvert plus bas) -- next/dynamic
// les sort du bundle initial de la barre de saisie, chargées uniquement
// au clic sur les boutons correspondants. katex, lui, reste en import
// statique ci-dessus : rendreFormuleKatex() (aperçu LaTeX en direct
// pendant la frappe, plus bas) l'appelle de façon synchrone à chaque
// rendu du texte -- le rendre lazy demanderait de refondre ce chemin en
// asynchrone, risqué sur une fonctionnalité aussi visible/fréquente pour
// un gain modeste (katex est plus léger que tiptap+mathlive).
const EditeurMathsRiche = dynamic(() => import("./EditeurMathsRiche").then((m) => m.EditeurMathsRiche), {
  ssr: false,
});
const EditeurFormule = dynamic(() => import("./EditeurFormule").then((m) => m.EditeurFormule), {
  ssr: false,
});

// Le type et les listes de réglages de réponse (longueur, modèles, modes) vivent
// dans barre/reglagesReponse.ts, source unique partagée avec BoutonReglages.
export type { LongueurReponse } from "./barre/reglagesReponse";
export type LocalisationJointe = { latitude: number; longitude: number } | null;

// Listes OUTILS_DISPONIBLES / ONGLETS_OUTILS / APPLIS_DISPONIBLES
// extraites dans lib/outils.ts le 01/08 (Bourama : "est-ce que ça
// varie en fonction de quel outil est ajouté ou enlevé" -- source
// unique désormais, ne plus les redéfinir ici).

const REGEX_URL = /(https?:\/\/[^\s]+)/g;

// Découpe le texte en segments {texte, lien} pour le calque de
// superposition -- coloration/soulignement des liens PENDANT la frappe
// (avant envoi), demande explicite de Bourama (2026-07-23) : un
// <textarea> natif ne peut pas colorer une sous-partie de son propre
// texte, donc on superpose un calque en lecture seule qui, lui, peut
// styler chaque morceau, pendant que le vrai <textarea> (texte rendu
// invisible via text-transparent) reste en dessous pour la saisie/le
// curseur/la sélection réels. Voir le rendu plus bas pour la
// synchronisation de défilement entre les deux calques.
function segmenterTexteAvecLiens(texte: string): { texte: string; lien: boolean }[] {
  const segments: { texte: string; lien: boolean }[] = [];
  let dernierIndex = 0;
  for (const trouve of texte.matchAll(REGEX_URL)) {
    const index = trouve.index ?? 0;
    if (index > dernierIndex) segments.push({ texte: texte.slice(dernierIndex, index), lien: false });
    segments.push({ texte: trouve[0], lien: true });
    dernierIndex = index + trouve[0].length;
  }
  if (dernierIndex < texte.length) segments.push({ texte: texte.slice(dernierIndex), lien: false });
  return segments;
}

// Aperçu formules (2026-07-27, demande de Bourama : le champ de saisie
// reste un <textarea> brut -- LaTeX visible tel quel ($...$) pendant la
// frappe -- mais un aperçu séparé au-dessus affiche le même texte avec
// les formules rendues via KaTeX, mis à jour en direct à chaque frappe.
// Alternative volontairement plus légère qu'un vrai éditeur riche
// (contenteditable) : celui-ci demanderait de refaire toute la gestion
// du curseur/de la sélection déjà en place (insertion à la position du
// curseur, sélection -> "Expliquer", détection de collage, etc.) --
// voir échange avec Bourama à ce sujet. `$$...$$` est traité avant
// `$...$` pour ne pas couper un bloc display au milieu.
const REGEX_FORMULE = /\$\$([^$]+)\$\$|\$([^$\n]+)\$/g;

function segmenterTexteAvecFormules(texte: string): { texte: string; formule: boolean; bloc?: boolean }[] {
  const segments: { texte: string; formule: boolean; bloc?: boolean }[] = [];
  let dernierIndex = 0;
  for (const trouve of texte.matchAll(REGEX_FORMULE)) {
    const index = trouve.index ?? 0;
    if (index > dernierIndex) segments.push({ texte: texte.slice(dernierIndex, index), formule: false });
    const estBloc = trouve[1] !== undefined;
    segments.push({ texte: estBloc ? trouve[1] : trouve[2], formule: true, bloc: estBloc });
    dernierIndex = index + trouve[0].length;
  }
  if (dernierIndex < texte.length) segments.push({ texte: texte.slice(dernierIndex), formule: false });
  return segments;
}

function rendreFormuleKatex(latex: string, bloc: boolean): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: bloc });
  } catch {
    return latex;
  }
}

export function BarreDeSaisie({
  onEnvoyer,
  desactive,
  genererEnCours = false,
  onArreter,
  agentId,
  modelesDisponibles = [],
  modeleSelectionne = null,
  onModeleChange,
  boutonSansEnseignant = false,
  outilsActifsAgent = null,
  texteInitial,
  conversationId,
  onAccesBloqueChange,
}: {
  onEnvoyer: (
    texte: string,
    longueur: LongueurReponse,
    fichiers: File[],
    localisation: LocalisationJointe,
    textesColles: string[],
    rechercheForcee: boolean,
    sansEnseignant: boolean,
    // Zip(s) en cours/terminé(s) de dézipage (26/09/2026) : job_id(s)
    // déjà démarrés dès la sélection (voir ajouterFichiers), à transmettre
    // tels quels à /api/chat (zips_en_attente) -- voir
    // ChatIA.tsx:envoyerMessage et core/main.py:chat().
    zipsEnAttente: string[]
  ) => void;
  desactive?: boolean;
  // Ajouté 20/09/2026 (demande Bourama : bouton arrêter, jusque-là
  // inexistant, le bouton d'envoi se contentait de se désactiver
  // pendant la génération, sans aucun moyen de la couper). true pendant
  // qu'une réponse est en train de streamer : fait passer le bouton
  // d'envoi en bouton "arrêter" (voir plus bas), qui appelle onArreter
  // au clic au lieu d'envoyer un message.
  genererEnCours?: boolean;
  onArreter?: () => void;
  agentId?: string;
  // Selecteur de modele premium (02/08/2026, voir ChatIA.tsx et
  // core/fournisseurs_llm.py) -- liste vide = agent sans abonnement
  // premium debloque, AUCUN bouton affiche (comportement identique a
  // avant cette feature, jamais de selecteur pour un agent qui n'a rien
  // debloque). Controle par le PARENT (ChatIA.tsx) plutot qu'en state
  // local ici, contrairement a rechercheForcee -- la valeur
  // doit survivre au closure de envoyerMessage sans passer par
  // onEnvoyer (deja tres charge), voir ChatIA.tsx:modeleSelectionne.
  modelesDisponibles?: { modele_id: string; label: string; distributeur: string; palier: string }[];
  modeleSelectionne?: string | null;
  onModeleChange?: (modeleId: string | null) => void;
  // Agent "Classinus" / contenu dynamique par matière (06/08/2026, demande
  // Bourama) -- affiche le bouton "Sans enseignant" (voir sansEnseignant
  // plus bas), qui force le prompt généraliste pour le prochain message,
  // sans utiliser le contenu d'aucun enseignant même si des matières
  // sont débloquées. Absent pour tous les autres agents.
  boutonSansEnseignant?: boolean;
  // Outils autorisés pour cet agent (14/08, demande Bourama) -- fourni
  // par le parent (ChatIA -> page.tsx), chargé pendant l'écran de
  // chargement plein écran initial. Ce composant ne va plus le chercher
  // lui-même après son montage : plus de bouton "Utilitaires" ou de
  // raccourcis d'outils récents qui apparaissent après coup, ils sont déjà
  // là dès le premier rendu de la barre.
  outilsActifsAgent?: { outils: string[]; actions_locales: string[] } | null;
  // Partie 5 (06/09/2026) : dépose ce texte dans le champ dès le
  // montage, sans l'envoyer -- voir ChatIA.tsx et
  // lib/contexteChat.tsx::useOuvrirChatAvecTexte. Lu UNIQUEMENT à
  // l'initialisation de l'état ci-dessous (pas dans un useEffect) : ce
  // composant est toujours remonté avec une conversation neuve (key
  // changée dans ChatFlottant.tsx) quand cette prop est fournie, jamais
  // réappliqué en cours de frappe.
  texteInitial?: string;
  // Conversation en cours : sert au mode pédagogique, aux modes ressources et
  // au code enseignant actif (ligne "Code enseignant" du bouton Réglages).
  // Sans conversationId (écran d'accueil avant le premier message), ces
  // réglages ne chargent ni n'envoient rien.
  conversationId?: string;
  // Remonte à ChatIA qu'un mineur sans aucun code est bloqué (voir
  // useModeActif), pour que la barre de saisie soit désactivée.
  onAccesBloqueChange?: (bloque: boolean) => void;
}) {
  const [texte, setTexte] = useState(() => texteInitial ?? "");
  const [longueur, setLongueur] = useState<LongueurReponse>("moyenne");
  // Devenu un TABLEAU le 17/08 (demande Bourama : "permet l'upload de
  // plusieurs fichiers dans le chat" -- avant, un seul fichier possible
  // par message). Chaque entrée garde son propre aperçu (image only, même
  // logique qu'avant) et un id stable pour la clé React / le retrait
  // individuel.
  const [fichiers, setFichiers] = useState<{ id: string; fichier: File; apercu: string | null; urlMedia?: string; zipJobId?: string }[]>([]);
  const [imageAgrandieId, setImageAgrandieId] = useState<string | null>(null);
  const [mediaOuvertId, setMediaOuvertId] = useState<string | null>(null);
  // Icône de recherche web (2026-07-23, demande de Bourama : "une icône
  // dans la barre de saisie mais peut s'activer automatiquement") --
  // forçage manuel EN PLUS de l'activation automatique déjà possible
  // (le modèle décide seul d'utiliser Tavily via le tool-calling normal,
  // dès lors que le serveur est activé pour l'agent, voir
  // core/registre_outils.py). Un clic garantit la recherche pour LE
  // PROCHAIN message envoyé, puis se désactive (pas un mode permanent).
  const [rechercheForcee, setRechercheForcee] = useState(false);
  // Bouton "Sans enseignant" (06/08/2026, demande Bourama) -- même
  // pattern que rechercheForcee ci-dessus : un clic force le prompt
  // généraliste pour LE PROCHAIN message uniquement (voir
  // core/contenu_dynamique_matiere.py côté backend), puis se désactive
  // -- pas un mode permanent. Uniquement affiché si
  // boutonSansEnseignant (Classinus).
  const [sansEnseignant, setSansEnseignant] = useState(false);
  // Bouton "Outils" (2026-07-25, étendu à la MULTI-sélection le 26/07 --
  // voir core/mcp_tools.py:lister_tous_les_outils). AUCUN outil n'est
  // envoyé au modèle par défaut, sur aucun agent : il faut en
  // sélectionner un ou plusieurs manuellement ici pour qu'ils soient
  // disponibles pour le prochain message. Sélection cumulative (clic sur
  // un outil déjà actif le retire, clic sur un autre l'ajoute à la liste
  // sans désélectionner le reste) -- demande explicite de Bourama, la
  // sélection unique précédente ne permettait pas de combiner par ex.
  // recherche web + GitHub sur un même message.

  // CORRECTION (2026-07-30, re-appliqué après écrasement accidentel par
  // d053181 qui repartait d'une copie locale périmée du fichier) : droits
  // réels de CET agent (flux 1 -> flux 2), via GET
  // /api/agents/{id}/outils-disponibles (réutilise
  // lister_outils_autorises_pour_agent côté backend, donc déjà la liste
  // PLATE et expansée des vrais noms d'outils, ex. tavily_search,
  // explorer_depot_github inclus directement) + les actions locales
  // (préfixe "ui_", catégorie 4, invisibles pour cette fonction backend
  // puisque ce ne sont pas des outils LLM). `null` tant que pas encore
  // chargé -> AUCUN bouton d'outil backend affiché (fail closed) plutôt
  // que de risquer d'afficher un bouton pour un outil désactivé le temps
  // du chargement.
  function outilAutorisePourAgent(outil: { nom: string }): boolean {
    if (!outilsActifsAgent) return false;
    if (outil.nom.startsWith("ui_")) return outilsActifsAgent.actions_locales.includes(outil.nom);
    return outilsActifsAgent.outils.includes(outil.nom);
  }

  // Listes réellement proposables pour CET agent (flux 2) -- toute la
  // suite de ce composant (menus + raccourcis, desktop et mobile) doit
  // utiliser CES listes filtrées, jamais OUTILS_DISPONIBLES /
  // APPLIS_DISPONIBLES brutes.
  // outilsDisponibles (2026-08-15) : registre vivant chargé depuis le
  // backend (voir lib/outils.ts:useOutilsRegistre) -- remplace l'ancienne
  // liste statique OUTILS_DISPONIBLES pour cette source de filtrage,
  // afin qu'un nouvel outil ajouté côté backend apparaisse ici sans rien
  // toucher dans ce dépôt.
  const { outils: outilsDisponibles } = useOutilsRegistre();
  const outilsPourAgent = outilsDisponibles.filter((o) => outilAutorisePourAgent(o));
  // Une appli (ex. GitHub) est autorisée si au moins une de ses actions
  // (ex. explorer_depot_github) fait partie des outils autorisés.
  //
  // CORRECTIF (19/09/2026, demande Bourama) : Notion et Google Drive sont
  // "necessite_utilisateur" côté backend (core/registre_outils.py) --
  // tant que la personne n'est pas connectée, leurs outils sont
  // entièrement absents d'outilsPourAgent (headers=None -> ignoré en
  // silence, voir lister_outils_autorises_pour_agent). Baser l'affichage
  // du bouton sur outilsPourAgent est donc impossible à amorcer : avant
  // la toute première connexion, la liste est vide, le bouton ne peut
  // jamais apparaître, et sans bouton la personne ne peut jamais se
  // connecter. Notion et Drive sont donc toujours proposés ici --
  // cliquerNotion()/cliquerGoogleDrive() gèrent déjà eux-mêmes, via
  // statutConnexion()/demarrerConnexion() (appels REST directs, pas liés
  // à outilsPourAgent), l'état connecté/non connecté au clic. GitHub
  // exclu de CE bouton précis (même demande) même s'il n'a pas ce
  // problème d'amorçage. APPLIS_DISPONIBLES (lib/outils.ts) reste
  // inchangé -- il sert aussi à app/dashboard/applications/page.tsx
  // (liste des applis connectables), qui doit continuer à lister GitHub.
  // google_drive retiré du filtre (19/09/2026, demande Bourama : "on va
  // masquer son bouton pour l'instant") -- bouton/menu uniquement, ne
  // touche pas à core/registre_outils.py côté backend : si un agent a
  // encore "google_drive" coché dans ses droits, l'outil reste utilisable
  // en autonomie par le modèle, seul le bouton de connexion manuelle
  // disparaît ici. APPLIS_DISPONIBLES (lib/outils.ts) reste inchangé --
  // app/dashboard/applications/page.tsx continue donc de lister Google
  // Drive comme appli connectable, ce filtre-ci ne concerne que la barre
  // de saisie du chat.
  const applisPourAgent = APPLIS_DISPONIBLES.filter((a) => a.nom === "notion");
  // Bouton "Utilitaires" (2026-08-01, demande Bourama : "seront un autre
  // bouton à part, plus dans outils") -- ex-onglet "utilitaires" du menu
  // Outils, sorti dans son propre bouton dédié. Même liste/filtre agent
  // que les autres (outilAutorisePourAgent), juste un sous-ensemble de
  // outilsPourAgent au lieu d'un onglet parmi d'autres.
  const outilsUtilitairesPourAgent = outilsPourAgent.filter((o) => o.onglet === "utilitaires");
  // Prendre une photo et Mode vocal vivent dans le menu du "+" (01/10/2026),
  // la liste du bouton Utilitaires ne les répète pas.
  const OUTILS_DU_MENU_PLUS = ["ui_photo", "ui_mode_vocal"];
  const utilitairesBouton = outilsUtilitairesPourAgent.filter((o) => !OUTILS_DU_MENU_PLUS.includes(o.nom));

  // Interrupteur (13/08/2026, demande Bourama) -- désactive l'AFFICHAGE du
  // bouton "Applications" (menu complet, application seule, raccourci "dernier
  // utilisé") sans toucher au reste du code (state, effets, appels API,
  // logique de sélection). Remettre à true pour le réactiver.
  // Le menu déroulant "Outils" (sélection manuelle d'un outil backend
  // forcé) a été retiré entièrement (2026-08-20, demande Bourama) : mort
  // depuis son kill-switch du 13/08, jamais réactivé, remplacé par le
  // routeur automatique (routeur_outils_auto) côté backend pour l'agent
  // clovis. Seul le bouton Utilitaires (ex-onglet de ce menu, sorti à
  // part le 01/08) reste actif -- voir estOutilActif/executerActionOutil
  // plus haut, désormais limités aux entrées "ui_*".
  // Réactivé le 19/09/2026 (demande Bourama : "aucun bouton pour les
  // connecter [les applis] hors il existe normalement") -- limité à
  // Drive + Notion, voir APPLIS_BOUTON_SAISIE ci-dessus.
  // Réactivé le 19/09/2026 après ajout des routes de connexion côté serveur
  // et de la page de retour /oauth/retour (demande Bourama).
  const AFFICHER_BOUTON_APPLICATIONS = true;

  const appliButtonVisible = AFFICHER_BOUTON_APPLICATIONS && applisPourAgent.length > 1;
  const appliSlotUnique = AFFICHER_BOUTON_APPLICATIONS && applisPourAgent.length === 1 ? applisPourAgent[0] : null;
  // Booléens stables (contrairement à applisPourAgent, un nouveau tableau
  // à chaque rendu) pour les deps des useEffect de statut plus bas --
  // équivalent de appliSlotUnique?.nom === "x" mais qui reste vrai aussi
  // dans le cas multi-appli (Notion + Drive tous les deux actifs).
  const notionDisponiblePourAgent = AFFICHER_BOUTON_APPLICATIONS && applisPourAgent.some((a) => a.nom === "notion");
  const driveDisponiblePourAgent = AFFICHER_BOUTON_APPLICATIONS && applisPourAgent.some((a) => a.nom === "google_drive");
  // Les réglages de réponse (modèle, longueur, mode pédagogique, modes
  // ressources, code enseignant) vivent dans le bouton Réglages
  // (barre/BoutonReglages.tsx). Leurs données sont chargées une seule fois
  // ici, les deux instances du bouton (PC et mobile) les partagent.
  const pedagogie = useReglagesPedagogiques(conversationId);
  const modeActif = useModeActif(conversationId, onAccesBloqueChange);
  // Menu du bouton "Utilitaires" (2026-08-01) -- multi-sélection cumulative
  // via estOutilActif/executerActionOutil déjà génériques, pas d'onglets :
  // une seule liste plate (utilitairesBouton).
  const [menuUtilitairesOuvert, setMenuUtilitairesOuvert] = useState(false);
  const menuUtilitairesRef = useRef<HTMLDivElement>(null);
  const menuUtilitairesMobileRef = useRef<HTMLDivElement>(null);
  const boutonUtilitairesRef = useRef<HTMLButtonElement>(null);
  const boutonUtilitairesMobileRef = useRef<HTMLButtonElement>(null);
  const [menuAppliOuvert, setMenuAppliOuvert] = useState(false);
  const menuAppliRef = useRef<HTMLDivElement>(null);
  const menuAppliMobileRef = useRef<HTMLDivElement>(null);
  // Canal en direct, chantier L (19/09/2026) : point d'entrée depuis le chat,
  // dans le menu du "+", en plus du bouton flottant (masqué sur /chat).
  // Contexte nullable : la barre de saisie peut être montée hors AppShell.
  const canalEnDirect = useContext(ContexteCanalEnDirect);
  // Mode vocal du menu des utilitaires : conversation vocale Gemini Live
  // liée à la conversation du chat affichée.
  // Depuis le 02/10/2026, la voix est une pièce partagée montée dans InteractionGlobale
  // (lib/contexteVoixDirecte.tsx) : cette barre ne fait que la piloter.
  const voixDirecte = useContext(ContexteVoixDirecte);
  const geminiLive = {
    etat: voixDirecte?.etat ?? "inactif",
    erreur: voixDirecte?.erreur ?? null,
    basculer: () => voixDirecte?.basculer(conversationId ?? null),
  };
  useEffect(() => {
    if (geminiLive.erreur) alert(geminiLive.erreur);
  }, [geminiLive.erreur]);
  // La fermeture de la voix à la fin de la conversation n'est PAS ici : cette
  // barre est remontée au premier message (écran d'accueil puis conversation),
  // ce qui coupait la voix et fermait son plein écran. Elle vit dans ChatIA.tsx,
  // qui reste monté tant que la conversation est la même.

  useEffect(() => {
    if (!menuAppliOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (menuAppliRef.current?.contains(cible)) return;
      if (menuAppliMobileRef.current?.contains(cible)) return;
      setMenuAppliOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [menuAppliOuvert]);

  // Certaines entrées de OUTILS_DISPONIBLES (préfixe "ui_") ne sont pas des
  // outils backend forcés mais d'anciennes icônes autonomes de la barre --
  // ces deux fonctions font le routage, que l'entrée soit cliquée depuis le
  // menu "Outils" ou depuis un raccourci de la rangée du "+" (même comportement).
  function estOutilActif(nom: string): boolean {
    switch (nom) {
      case "ui_localisation":
        return !!localisation;
      case "ui_recherche":
        return rechercheForcee;
      case "ui_formule":
        return editeurFormuleOuvert;
      case "ui_editeur_maths":
        return editeurMathsRicheOuvert;
      case "ui_dessin":
        return canvasOuvert;
      case "ui_mode_vocal":
        return geminiLive.etat !== "inactif" && geminiLive.etat !== "erreur";
      default:
        return false;
    }
  }

  function executerActionOutil(nom: string) {
    switch (nom) {
      case "ui_localisation":
        toggleLocalisation();
        break;
      case "ui_recherche":
        setRechercheForcee((v) => !v);
        break;
      case "ui_formule":
        setEditeurFormuleOuvert((v) => !v);
        break;
      case "ui_editeur_maths":
        setEditeurMathsRicheOuvert(true);
        break;
      case "ui_dessin":
        setCanvasOuvert(true);
        break;
      case "ui_mode_vocal":
        if (!conversationId) {
          alert("Envoie d'abord un premier message pour lancer le mode vocal.");
          break;
        }
        if (geminiLive.etat === "connexion") break;
        geminiLive.basculer();
        break;
      case "ui_photo":
        inputPhotoRef.current?.click();
        break;
    }
  }

  function executerActionAppli(nom: string) {
    switch (nom) {
      case "github":
        cliquerGithub();
        break;
      case "notion":
        cliquerNotion();
        break;
      case "google_drive":
        cliquerGoogleDrive();
        break;
    }
  }

  useEffect(() => {
    if (!menuUtilitairesOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (menuUtilitairesRef.current?.contains(cible)) return;
      if (boutonUtilitairesRef.current?.contains(cible)) return;
      if (boutonUtilitairesMobileRef.current?.contains(cible)) return;
      if (menuUtilitairesMobileRef.current?.contains(cible)) return;
      setMenuUtilitairesOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [menuUtilitairesOuvert]);
  // Collage long -> pièce jointe texte (2026-07-23, demande de Bourama :
  // comportement Claude -- coller un gros pavé de texte ne l'insère pas
  // tel quel dans le champ, ça devient une pièce jointe séparée qu'on
  // peut retirer/relire, comme un fichier joint mais sans upload : le
  // texte est déjà là côté client, pas besoin d'aller-retour serveur).
  const SEUIL_COLLAGE_LONG = 800;
  const [textesColles, setTextesColles] = useState<TexteColle[]>([]);
  const [texteColleOuvertId, setTexteColleOuvertId] = useState<string | null>(null);
  // 18/08/2026, voir lib/useFermetureAnimee.ts -- une instance par
  // PanneauFlottant de ce fichier, chacun avec sa propre fermeture.
  // Plein écran de la saisie (2026-07-23, demande de Bourama : l'agrandissement
  // auto restait trop limité pour écrire un long message confortablement).
  const [pleinEcranSaisie, setPleinEcranSaisie] = useState(false);
  const { enSortie: pleinEcranSaisieEnSortie, demarrerFermeture: fermerPleinEcranSaisieAnime } = useFermetureAnimee();
  // Canvas de dessin (2026-07-25) -- géométrie/graphe/croquis, voir
  // CanvasDessin.tsx. Le résultat rejoint le tableau `fichiers` comme un
  // upload classique (ajouterFichiers), donc suit exactement le même
  // chemin d'envoi/aperçu, aucun état séparé nécessaire pour l'envoi.
  const [canvasOuvert, setCanvasOuvert] = useState(false);
  const { enSortie: canvasEnSortie, demarrerFermeture: fermerCanvasAnime } = useFermetureAnimee();
  // Éditeur de formule maths/chimie (2026-07-25) -- voir EditeurFormule.tsx.
  const [editeurFormuleOuvert, setEditeurFormuleOuvert] = useState(false);
  // Éditeur maths riche à part (01/08) -- voir EditeurMathsRiche.tsx. Un
  // seul point de contact avec l'existant : `setTexte` au moment
  // d'"Insérer dans le message", rien d'autre du textarea/clavier
  // n'est touché ni partagé (demande explicite de Bourama).
  const [editeurMathsRicheOuvert, setEditeurMathsRicheOuvert] = useState(false);
  const { enSortie: editeurMathsEnSortie, demarrerFermeture: fermerEditeurMathsAnime } = useFermetureAnimee();
  // Insertion live (2026-07-27, demande Bourama : "les symboles s'insèrent
  // automatiquement, pas de bouton insérer/effacer") -- plutôt qu'un clic
  // "Insérer" qui pousse le résultat final d'un coup, on garde la trace de
  // la portion de `texte` qui correspond à la formule en cours de
  // construction (`plageFormuleLive`), et on la remplace en entier à
  // chaque frappe dans le champ maths/chimie. `null` = rien en cours de
  // construction -- la prochaine frappe insère une nouvelle formule à la
  // position actuelle du curseur plutôt que d'en remplacer une existante.
  const [plageFormuleLive, setPlageFormuleLive] = useState<{ debut: number; fin: number } | null>(null);
  // OCR ciblé formule (2026-07-26, priorité maths de Bourama) -- image
  // jointe -> LaTeX extrait par Gemini -> ouvert dans EditeurFormule pour
  // relecture/correction avant insertion (jamais inséré tel quel sans
  // passage par l'éditeur, une transcription OCR peut se tromper).
  const [extractionFormuleEnCours, setExtractionFormuleEnCours] = useState(false);
  const [formuleInitiale, setFormuleInitiale] = useState<string | undefined>(undefined);

  async function extraireFormuleDeImage() {
    // Plusieurs fichiers possibles depuis le 17/08 -- on cible la
    // première image jointe (choix par défaut raisonnable, cette action
    // n'a de sens que pour une image ; documenté ici plutôt que deviné en
    // silence si Bourama veut un comportement différent plus tard).
    const premiereImage = fichiers.find((f) => f.fichier.type.startsWith("image/"))?.fichier;
    if (!premiereImage || extractionFormuleEnCours) return;
    setExtractionFormuleEnCours(true);
    try {
      const latex = await extraireFormuleImage(premiereImage);
      setFormuleInitiale(latex);
      setEditeurFormuleOuvert(true);
    } catch (e) {
      alert(e instanceof Error && e.message.includes("Aucune formule") ? "Aucune formule détectée dans cette image." : "Échec de l'extraction, réessaie.");
    } finally {
      setExtractionFormuleEnCours(false);
    }
  }
  const inputFichierRef = useRef<HTMLInputElement>(null);
  // Input "prendre une photo" (25/09/2026, demande Bourama ; devenu
  // l'utilitaire ui_photo le 26/09, voir lib/outils.ts et
  // executerActionOutil) -- séparé du sélecteur de fichier normal
  // (inputFichierRef juste au-dessus) : `capture="environment"` ouvre
  // directement l'appareil photo sur mobile au lieu du sélecteur de
  // fichiers/galerie (support navigateur : Chrome/Safari mobile ;
  // ignoré sans effet néfaste sur desktop, où l'input ouvre le
  // sélecteur de fichier habituel, avec webcam si le navigateur en
  // propose un). Réutilise ajouterFichiers, même chemin que le fichier
  // joint normalement.
  const inputPhotoRef = useRef<HTMLInputElement>(null);
  const zoneTexteRef = useRef<HTMLTextAreaElement>(null);
  // Ref séparée pour le composeur mobile (2026-07-28) -- même état
  // `texte`, DOM distinct.
  const zoneTexteMobileRef = useRef<HTMLTextAreaElement>(null);
  const calqueRef = useRef<HTMLDivElement>(null);
  // Aperçu formules (2026-07-27, retour Bourama : l'aperçu restait figé
  // à son ancienne position de défilement -- en ajoutant des lignes, ce
  // qu'on venait de taper se retrouvait hors de la zone visible, donnant
  // l'impression que rien ne s'écrivait. Fait défiler automatiquement
  // vers le bas à chaque changement du texte, pour toujours montrer la
  // dernière ligne tapée.
  const apercuFormulesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (apercuFormulesRef.current) {
      apercuFormulesRef.current.scrollTop = apercuFormulesRef.current.scrollHeight;
    }
  }, [texte]);
  // Équivalent mobile (2026-07-30, bug signalé par Bourama : cet aperçu
  // n'existait qu'à l'intérieur du bloc "hidden ... md:block", donc
  // jamais affiché sur mobile malgré `texte.includes("$")` vrai -- même
  // raison de ref séparé que le calque plein écran ci-dessus.
  const apercuFormulesMobileRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (apercuFormulesMobileRef.current) {
      apercuFormulesMobileRef.current.scrollTop = apercuFormulesMobileRef.current.scrollHeight;
    }
  }, [texte]);
  // Calque/textarea séparés pour le plein écran -- reste monté en même
  // temps que le composer compact (juste recouvert par l'overlay), donc
  // impossible de partager les mêmes refs entre les deux.
  const zoneTextePleinEcranRef = useRef<HTMLTextAreaElement>(null);
  const calquePleinEcranRef = useRef<HTMLDivElement>(null);

  // Aperçu des fichiers joints AVANT envoi (2026-07-20, bug trouvé par
  // Bourama : jusqu'ici juste le nom du fichier en texte, aucune vignette).
  // URL.createObjectURL uniquement pour les images -- documents/vidéos
  // gardent le chip icône+nom (une vraie prévisualisation vidéo ou PDF
  // demanderait un lecteur/rendu dédié, hors scope de ce correctif ciblé).
  // Devenu un tableau le 17/08 (demande Bourama : "permet l'upload de
  // plusieurs fichiers dans le chat").
  function ajouterFichiers(nouveaux: File[]) {
    if (!nouveaux.length) return;
    setFichiers((prec) => [
      ...prec,
      ...nouveaux.map((f) => ({
        id: crypto.randomUUID(),
        fichier: f,
        apercu: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
        // Audio et vidéo : URL locale créée une seule fois ici (et libérée au
        // retrait), pour la vignette vidéo et la fenêtre de lecture.
        urlMedia: f.type.startsWith("video/") || f.type.startsWith("audio/") ? URL.createObjectURL(f) : undefined,
      })),
    ]);

    // Zip (26/09/2026, chantier "zip en conversation", demande Bourama :
    // "le dézipage commence à l'upload, au fond") -- démarré ICI, tout de
    // suite, sans attendre l'envoi du message. Volontairement AUCUN
    // indicateur visuel pendant cette attente (la vignette reste un
    // fichier joint tout à fait normal) : si le dézipage n'est pas fini
    // au moment d'envoyer, c'est core/main.py:chat() qui affichera une
    // ligne de statut (voir ChatIA.tsx), jamais avant. Un id est attribué
    // à chaque fichier AVANT cette boucle (ci-dessus) -- on ne peut donc
    // relier la réponse à la bonne entrée qu'en comparant l'objet File
    // lui-même (référence stable, jamais cloné entre les deux boucles).
    for (const f of nouveaux) {
      const estZip = f.type === "application/zip" || f.type === "application/x-zip-compressed" || f.name.toLowerCase().endsWith(".zip");
      if (!estZip) continue;
      demarrerZipChat(f)
        .then(({ job_id }) => {
          setFichiers((prec) => prec.map((entree) => (entree.fichier === f ? { ...entree, zipJobId: job_id } : entree)));
        })
        .catch((e) => {
          // Bug corrigé 27/09/2026 : un échec ici passait inaperçu (le
          // fichier restait joint sans job_id, le message partait quand
          // même, le LLM ne recevait donc STRICTEMENT rien sur cette
          // archive et l'étudiant ne comprenait pas pourquoi). Retiré de
          // la liste + message clair, plutôt que de laisser envoyer une
          // pièce jointe qui ne sera jamais lue.
          console.error("Démarrage dézipage échoué :", e);
          setFichiers((prec) => prec.filter((entree) => entree.fichier !== f));
          alert(e instanceof Error ? e.message : "Impossible de lire cette archive.");
        });
    }
  }

  function retirerFichier(id: string) {
    setFichiers((prec) => {
      const cible = prec.find((f) => f.id === id);
      if (cible?.apercu) URL.revokeObjectURL(cible.apercu);
      if (cible?.urlMedia) URL.revokeObjectURL(cible.urlMedia);
      return prec.filter((f) => f.id !== id);
    });
    setImageAgrandieId((prec) => (prec === id ? null : prec));
    setMediaOuvertId((prec) => (prec === id ? null : prec));
  }

  function viderFichiers() {
    setFichiers((prec) => {
      prec.forEach((f) => {
        if (f.apercu) URL.revokeObjectURL(f.apercu);
        if (f.urlMedia) URL.revokeObjectURL(f.urlMedia);
      });
      return [];
    });
  }

  // Auto-agrandissement du textarea (2026-07-20, bug trouvé par Bourama en
  // test réel) -- rows={1} fixait la hauteur à une seule ligne sans aucune
  // logique de croissance : dès qu'on passait à la ligne, le texte
  // défilait DANS cette unique ligne au lieu que le cadre grandisse, donc
  // tout ce qui était au-dessus du curseur sortait du cadre visible.
  // Approche standard (pas de lib) : hauteur remise à "auto" puis fixée à
  // scrollHeight à chaque frappe -- le CSS max-h-40 (voir plus bas) prend
  // le relais au-delà pour repasser en défilement interne plutôt que de
  // grandir indéfiniment.
  // Étendu au composeur mobile (28/08/2026, retour Bourama : "il ne
  // s'agrandit pas, tout reste sur une même ligne") -- la v1 mobile du
  // 28/07 avait volontairement laissé de côté l'auto-agrandissement
  // (rows={1} fixe, défilement interne uniquement), mais Bourama veut le
  // même comportement que sur desktop. Les deux textarea (desktop et
  // mobile) restent montés en même temps avec le même état `texte` (voir
  // zoneTexteMobileRef plus haut), donc on ajuste les deux à chaque
  // appel plutôt que de dupliquer la fonction.
  function ajusterHauteurTexte() {
    for (const ref of [zoneTexteRef, zoneTexteMobileRef]) {
      const el = ref.current;
      if (!el) continue;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  useEffect(() => {
    ajusterHauteurTexte();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dictée vocale (2026-07-20) : enregistrement micro réel via
  // MediaRecorder, transcrit par Whisper/Groq (api/uploads.py:
  // uploader_audio_chat) puis ajouté au texte -- pas d'envoi automatique,
  // l'étudiant garde la main pour relire/corriger avant d'envoyer.
  const [dictant, setDictant] = useState(false);
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  // Localisation (2026-07-20) : jointe explicitement via ce bouton, jamais
  // capturée en silence -- voir core/main.py:chat(), paramètre
  // `localisation`, injecté en contexte de prompt système.
  const [localisation, setLocalisation] = useState<LocalisationJointe>(null);
  const [localisationEnCours, setLocalisationEnCours] = useState(false);

  // Connexion GitHub (2026-07-22) : bouton dédié, style de l'app (pas les
  // couleurs de marque GitHub) -- voir connexions/oauth_generique.py et
  // core/serveur_mcp_github.py côté backend. `null` = statut pas encore
  // connu (chargement), évite un flash "non connecté" au premier rendu.
  const [githubConnecte, setGithubConnecte] = useState<boolean | null>(null);
  const [githubEnCours, setGithubEnCours] = useState(false);
  // Sélecteur de dépôts (2026-07-22) : ouvert au clic quand déjà connecté
  // -- cliquer un dépôt insère son lien dans le champ, pas d'envoi
  // automatique (la personne garde la main pour écrire sa question).
  const [depots, setDepots] = useState<{ nom_complet: string; prive: boolean; description: string | null }[] | null>(
    null
  );
  const [selecteurOuvert, setSelecteurOuvert] = useState(false);
  const selecteurRef = useRef<HTMLDivElement>(null);
  // Panneau mobile ajouté séparément du bloc desktop (2026-07-30, voir plus
  // bas) -- exclu ici aussi, sinon tout tap À L'INTÉRIEUR de ce nouveau
  // panneau (ex: choisir un dépôt) serait interprété comme un clic
  // EXTÉRIEUR (il n'est pas contenu dans selecteurRef) et refermerait le
  // sélecteur avant même que choisirDepot() ait pu s'exécuter -- même piège
  // que le bug initial.
  const selecteurMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selecteurOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (selecteurRef.current?.contains(cible)) return;
      if (selecteurMobileRef.current?.contains(cible)) return;
      setSelecteurOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [selecteurOuvert]);

  // Correctif (02/09/2026, signalé Bourama : 404 répétés en console) :
  // le bouton GitHub (plus bas, appliSlotUnique?.nom === "github") ne
  // s'affiche que si l'agent a exactement cette appli activée -- avant
  // ce correctif, cet appel de statut partait quand même à chaque
  // chargement du chat même quand le bouton n'existe pas, contre un
  // endpoint qui répond 404 pour cet agent. Même garde-fou que le
  // rendu du bouton, pour ne plus appeler l'endpoint pour rien.
  useEffect(() => {
    if (appliSlotUnique?.nom !== "github") return;
    statutConnexion("github")
      .then((r) => setGithubConnecte(r.connecte))
      .catch(() => setGithubConnecte(false));
  }, [appliSlotUnique?.nom]);

  // Connexion Notion (01/08, activation complète demandée par Bourama) --
  // même pattern que githubConnecte/selecteurOuvert ci-dessus. Le choix du
  // sélecteur (plutôt que juste activer notion-search) : "Un sélecteur
  // (façon dépôts GitHub) pour choisir une page/base Notion précise à
  // insérer dans le champ", décision explicite de Bourama.
  const [notionConnecte, setNotionConnecte] = useState<boolean | null>(null);
  const [notionEnCours, setNotionEnCours] = useState(false);
  const [pagesNotionListe, setPagesNotionListe] = useState<
    { titre: string; type: "page" | "database"; url: string }[] | null
  >(null);
  // CORRECTION (01/08) : contrairement aux dépôts GitHub (listing complet
  // via /user/repos), notion-search est une recherche sémantique -- son
  // paramètre query est OBLIGATOIRE côté outil MCP (voir api/connexions.py).
  // Un simple "charger au premier clic" comme cliquerGithub ne peut donc
  // pas marcher : il faut une vraie zone de recherche, avec un texte tapé
  // par la personne, débouncé avant chaque appel réseau.
  const [rechercheNotion, setRechercheNotion] = useState("");
  const [selecteurNotionOuvert, setSelecteurNotionOuvert] = useState(false);
  const selecteurNotionRef = useRef<HTMLDivElement>(null);
  const selecteurNotionMobileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selecteurNotionOuvert) return;
    function gererClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (selecteurNotionRef.current?.contains(cible)) return;
      if (selecteurNotionMobileRef.current?.contains(cible)) return;
      setSelecteurNotionOuvert(false);
    }
    document.addEventListener("mousedown", gererClicExterieur);
    return () => document.removeEventListener("mousedown", gererClicExterieur);
  }, [selecteurNotionOuvert]);

  // Même correctif (02/09/2026) que githubConnecte plus haut : ne
  // vérifier le statut Notion que si le bouton Notion peut réellement
  // s'afficher pour cet agent.
  // ÉLARGI (19/09/2026) de appliSlotUnique?.nom à applisPourAgent.some(...) :
  // avec Notion + Drive actifs en même temps (cas multi-appli, menu
  // déroulant plutôt que slot unique -- voir le sélecteur Notion "cas
  // MULTI-appli" plus bas), appliSlotUnique reste null et cet effet ne se
  // déclenchait jamais -- notionConnecte restait bloqué à null, donc
  // cliquerNotion() relançait une connexion à chaque clic au lieu
  // d'ouvrir le sélecteur pour une personne déjà connectée.
  useEffect(() => {
    if (!notionDisponiblePourAgent) return;
    statutConnexion("notion")
      .then((r) => setNotionConnecte(r.connecte))
      .catch(() => setNotionConnecte(false));
  }, [notionDisponiblePourAgent]);

  // Recherche débouncée (400ms) déclenchée par la frappe, uniquement
  // pendant que le sélecteur est ouvert. Champ vide -> pas d'appel réseau,
  // liste remise à null (affiche l'invite "tape pour chercher").
  useEffect(() => {
    if (!selecteurNotionOuvert) return;
    if (!rechercheNotion.trim()) {
      setPagesNotionListe(null);
      return;
    }
    setNotionEnCours(true);
    const delai = setTimeout(() => {
      pagesNotion(rechercheNotion)
        .then(({ pages }) => setPagesNotionListe(pages))
        .catch((e) => {
          setPagesNotionListe([]);
          alert(messageErreur(e));
        })
        .finally(() => setNotionEnCours(false));
    }, 400);
    return () => clearTimeout(delai);
  }, [rechercheNotion, selecteurNotionOuvert]);

  async function cliquerNotion() {
    if (!notionConnecte) {
      setNotionEnCours(true);
      try {
        const { url } = await demarrerConnexion("notion", agentId);
        window.location.href = url;
      } catch (e) {
        alert(messageErreur(e));
        setNotionEnCours(false);
      }
      return;
    }

    // Déjà connecté : ouvre/ferme simplement le sélecteur -- le
    // chargement se fait désormais via la recherche tapée (voir
    // useEffect ci-dessus), pas au clic.
    setSelecteurNotionOuvert((prec) => !prec);
  }

  // Connexion Google Drive (01/09, demande Bourama) -- même pattern que
  // githubConnecte/notionConnecte ci-dessus, mais SANS sélecteur : les
  // outils Drive (chercher/lire/fichiers récents...) fonctionnent seuls
  // une fois connecté, rien à insérer dans le champ de texte. Un clic
  // une fois connecté ne fait donc rien de plus que confirmer visuellement
  // la connexion (point vert, comme GitHub/Notion).
  const [driveConnecte, setDriveConnecte] = useState<boolean | null>(null);
  const [driveEnCours, setDriveEnCours] = useState(false);

  // Même correctif (02/09/2026) que githubConnecte/notionConnecte
  // plus haut : ne vérifier le statut Drive que si le bouton Drive peut
  // réellement s'afficher pour cet agent (évite un 404 répété en
  // console sinon).
  // ÉLARGI (19/09/2026), même raison que notionDisponiblePourAgent
  // ci-dessus : Drive est maintenant actif en même temps que Notion
  // (cas multi-appli), appliSlotUnique seul ne suffit plus.
  useEffect(() => {
    if (!driveDisponiblePourAgent) return;
    statutConnexion("google_drive")
      .then((r) => setDriveConnecte(r.connecte))
      .catch(() => setDriveConnecte(false));
  }, [driveDisponiblePourAgent]);

  async function cliquerGoogleDrive() {
    if (driveConnecte) return;
    setDriveEnCours(true);
    try {
      const { url } = await demarrerConnexion("google_drive", agentId);
      window.location.href = url;
    } catch (e) {
      alert(messageErreur(e));
      setDriveEnCours(false);
    }
  }

  function choisirPageNotion(url: string) {
    setTexte((prec) => (prec.trim() ? `${prec} ${url}` : url));
    setSelecteurNotionOuvert(false);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  // Écrans "base" (query-data-sources/query-database-view) et "creer"
  // (create-pages) ajoutés le 02/08 (demande Bourama, scope confirmé) au
  // même sélecteur que la recherche de pages ci-dessus -- pas de nouveau
  // composant, juste un état "écran" en plus dans celui-ci.
  const [ecranNotion, setEcranNotion] = useState<"recherche" | "base" | "creer">("recherche");
  const [baseNotionChoisie, setBaseNotionChoisie] = useState<{ titre: string; url: string } | null>(null);
  const [rechercheLignesBase, setRechercheLignesBase] = useState("");
  const [lignesBaseListe, setLignesBaseListe] = useState<
    { titre: string; url: string | null }[] | null
  >(null);
  const [lignesBaseEnCours, setLignesBaseEnCours] = useState(false);
  const [titreCreationNotion, setTitreCreationNotion] = useState("");
  const [contenuCreationNotion, setContenuCreationNotion] = useState("");
  const [creationNotionEnCours, setCreationNotionEnCours] = useState(false);

  // Referme automatiquement les écrans "base"/"creer" à la fermeture du
  // sélecteur (clic extérieur, envoi du message...) -- sans ça, rouvrir le
  // sélecteur retomberait sur le dernier écran visité au lieu de la
  // recherche.
  useEffect(() => {
    if (!selecteurNotionOuvert) {
      setEcranNotion("recherche");
      setBaseNotionChoisie(null);
    }
  }, [selecteurNotionOuvert]);

  // Charge les lignes de la base dès qu'on entre sur l'écran "base"
  // (contrairement à la recherche de pages, PAS besoin d'attendre une
  // frappe -- voir lignes_base_notion côté backend, la base entière est
  // chargée puis filtrée par rechercheLignesBase, debounced 400ms comme
  // pour rechercheNotion ci-dessus).
  useEffect(() => {
    if (ecranNotion !== "base" || !baseNotionChoisie) return;
    setLignesBaseEnCours(true);
    const delai = setTimeout(() => {
      lignesBaseNotion(baseNotionChoisie.url, rechercheLignesBase)
        .then(({ lignes }) => setLignesBaseListe(lignes))
        .catch((e) => {
          setLignesBaseListe([]);
          alert(messageErreur(e));
        })
        .finally(() => setLignesBaseEnCours(false));
    }, 400);
    return () => clearTimeout(delai);
  }, [rechercheLignesBase, ecranNotion, baseNotionChoisie]);

  // Remplace choisirPageNotion comme handler de clic sur un résultat de
  // /notion/pages : une base ouvre l'écran "base" (query) au lieu d'insérer
  // directement son URL, une page garde l'ancien comportement.
  function choisirResultatNotion(p: { titre: string; type: "page" | "database"; url: string }) {
    if (p.type === "database") {
      setBaseNotionChoisie({ titre: p.titre, url: p.url });
      setLignesBaseListe(null);
      setRechercheLignesBase("");
      setEcranNotion("base");
      return;
    }
    choisirPageNotion(p.url);
  }

  function retourRechercheNotion() {
    setEcranNotion("recherche");
    setBaseNotionChoisie(null);
    setLignesBaseListe(null);
    setRechercheLignesBase("");
  }

  function choisirLigneBase(url: string | null, titre: string) {
    const valeur = url ?? titre;
    setTexte((prec) => (prec.trim() ? `${prec} ${valeur}` : valeur));
    setSelecteurNotionOuvert(false);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  function ouvrirCreationNotion() {
    setTitreCreationNotion("");
    setContenuCreationNotion("");
    setEcranNotion("creer");
  }

  async function soumettreCreationNotion() {
    if (!titreCreationNotion.trim()) return;
    setCreationNotionEnCours(true);
    try {
      const { url } = await creerPageNotion(titreCreationNotion.trim(), contenuCreationNotion);
      setTexte((prec) => (prec.trim() ? `${prec} ${url}` : url));
      setSelecteurNotionOuvert(false);
      requestAnimationFrame(ajusterHauteurTexte);
    } catch (e) {
      alert(messageErreur(e));
    } finally {
      setCreationNotionEnCours(false);
    }
  }

  // Contenu partagé des 3 rendus du sélecteur Notion (mono-appli desktop,
  // multi-appli desktop, mobile -- même contrainte de duplication que le
  // reste du fichier, voir les 3 sites d'appel). `fondChamp`/`fondHover`
  // reprennent exactement les classes déjà utilisées à chaque site avant
  // cet ajout (bg-dj-surface côté desktop, bg-dj-surface-haute côté
  // mobile), pour ne rien changer visuellement à l'écran "recherche".
  function contenuSelecteurNotion(fondChamp: string, fondHover: string) {
    if (ecranNotion === "creer") {
      return (
        <div className="p-2">
          <BoutonRetour
            onClick={retourRechercheNotion}
            taille={14}
            avecTexte
            padding="p-0"
            className="mb-2 w-fit"
          />
          <input
            type="text"
            autoFocus
            value={titreCreationNotion}
            onChange={(e) => setTitreCreationNotion(e.target.value)}
            placeholder="Titre de la page"
            className={`mb-1 w-full rounded-lg border border-dj-bordure ${fondChamp} px-3 py-2 text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet`}
          />
          <textarea
            value={contenuCreationNotion}
            onChange={(e) => setContenuCreationNotion(e.target.value)}
            placeholder="Contenu (optionnel)"
            rows={4}
            className={`mb-2 w-full rounded-lg border border-dj-bordure ${fondChamp} px-3 py-2 text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet`}
          />
          <button
            type="button"
            onClick={soumettreCreationNotion}
            disabled={creationNotionEnCours || !titreCreationNotion.trim()}
            className="w-full rounded-lg bg-dj-accent-1 px-3 py-2 text-sm text-white transition-opacity disabled:opacity-50"
          >
            {creationNotionEnCours ? "Création..." : "Créer la page"}
          </button>
        </div>
      );
    }

    if (ecranNotion === "base" && baseNotionChoisie) {
      return (
        <div>
          <div className="flex items-center gap-1 px-2 pb-1 pt-1">
            <BoutonRetour
              onClick={retourRechercheNotion}
              taille={14}
              avecTexte
              padding="p-0"
              className="w-fit"
            />
            <span className="truncate text-xs text-dj-texte-muet">{baseNotionChoisie.titre}</span>
          </div>
          <input
            type="text"
            autoFocus
            value={rechercheLignesBase}
            onChange={(e) => setRechercheLignesBase(e.target.value)}
            placeholder="Filtrer les lignes..."
            className={`mb-1 w-full rounded-lg border border-dj-bordure ${fondChamp} px-3 py-2 text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet`}
          />
          <div className="max-h-56 overflow-y-auto">
            {lignesBaseEnCours && (
              <div className="space-y-1.5 px-3 py-2" aria-hidden>
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded" style={{ animationDelay: "120ms" }} />
                <Skeleton className="h-3 w-2/3 rounded" style={{ animationDelay: "240ms" }} />
              </div>
            )}
            {!lignesBaseEnCours && lignesBaseListe?.length === 0 && (
              <p className="px-3 py-2 text-xs text-dj-texte-muet">Aucune ligne trouvée.</p>
            )}
            {lignesBaseListe?.map((l, i) => (
              <button
                key={l.url ?? i}
                type="button"
                onClick={() => choisirLigneBase(l.url, l.titre)}
                className={`block w-full rounded-lg px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:${fondHover}`}
              >
                {l.titre}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <>
        <input
          type="text"
          autoFocus
          value={rechercheNotion}
          onChange={(e) => setRechercheNotion(e.target.value)}
          placeholder="Chercher une page ou une base..."
          className={`mb-1 w-full rounded-lg border border-dj-bordure ${fondChamp} px-3 py-2 text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet`}
        />
        <button
          type="button"
          onClick={ouvrirCreationNotion}
          className={`mb-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-dj-accent-1-texte transition-colors hover:${fondHover}`}
        >
          + Créer une page
        </button>
        <div className="max-h-56 overflow-y-auto">
          {!rechercheNotion.trim() && (
            <p className="px-3 py-2 text-xs text-dj-texte-muet">Tape pour chercher dans ton Notion.</p>
          )}
          {rechercheNotion.trim() && notionEnCours && (
            <p className="px-3 py-2 text-xs text-dj-texte-muet">Recherche...</p>
          )}
          {rechercheNotion.trim() && !notionEnCours && pagesNotionListe?.length === 0 && (
            <p className="px-3 py-2 text-xs text-dj-texte-muet">Aucune page trouvée.</p>
          )}
          {pagesNotionListe?.map((p) => (
            <button
              key={p.url}
              type="button"
              onClick={() => choisirResultatNotion(p)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:${fondHover}`}
            >
              <span className="flex items-center gap-1.5">
                {p.titre}
                {p.type === "database" && (
                  <span className={`rounded ${fondHover} px-1.5 py-0.5 text-[10px] text-dj-texte-muet`}>
                    base
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }

  async function cliquerGithub() {
    if (!githubConnecte) {
      setGithubEnCours(true);
      try {
        const { url } = await demarrerConnexion("github", agentId);
        window.location.href = url;
      } catch (e) {
        // Corrigé le 2026-07-23, puis le 2026-07-31 (demarrerConnexion lève
        // maintenant une vraie erreur au lieu de renvoyer {url: null,
        // erreur: "..."}) : masquait la vraie cause (erreur réseau,
        // 401/500 côté backend, session expirée...) derrière le même
        // texte générique à chaque fois -- même correction que pour la
        // dictée vocale et l'upload de fichiers plus tôt dans la session.
        alert(messageErreur(e));
        setGithubEnCours(false);
      }
      return;
    }

    // Déjà connecté : ouvre/ferme le sélecteur de dépôts, en chargeant la
    // liste au premier clic seulement (pas re-fetché à chaque ouverture).
    setSelecteurOuvert((prec) => !prec);
    if (depots === null) {
      setGithubEnCours(true);
      try {
        const { depots: liste } = await depotsGithub();
        setDepots(liste);
      } catch (e) {
        setDepots([]);
        alert(messageErreur(e));
      } finally {
        setGithubEnCours(false);
      }
    }
  }

  function choisirDepot(nomComplet: string) {
    setTexte((prec) => (prec.trim() ? `${prec} https://github.com/${nomComplet}` : `https://github.com/${nomComplet}`));
    setSelecteurOuvert(false);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  function pasDisponible() {
    alert("Pas disponible pour le moment.");
  }

  // Mise à jour live de la formule en construction (2026-07-27, "les
  // symboles s'insèrent automatiquement, pas de bouton insérer/effacer").
  // `contenuAffiche` est déjà le texte final ($...$) à placer -- si une
  // portion est déjà en cours de construction (plageFormuleLive), on la
  // remplace entièrement ; sinon on insère à la position actuelle du
  // curseur et on commence à la suivre. Ne touche jamais le focus/la
  // sélection du textarea -- le focus reste dans le champ MathLive/chimie
  // pendant que la personne tape, sans quoi chaque frappe lui volerait le
  // clavier.
  function mettreAJourFormuleLive(contenuAffiche: string) {
    if (plageFormuleLive) {
      const nouveauTexte = texte.slice(0, plageFormuleLive.debut) + contenuAffiche + texte.slice(plageFormuleLive.fin);
      setTexte(nouveauTexte);
      setPlageFormuleLive(contenuAffiche ? { debut: plageFormuleLive.debut, fin: plageFormuleLive.debut + contenuAffiche.length } : null);
    } else if (contenuAffiche) {
      const ref = pleinEcranSaisie ? zoneTextePleinEcranRef : zoneTexteRef;
      const el = ref.current;
      const debut = el?.selectionStart ?? texte.length;
      const fin = el?.selectionEnd ?? texte.length;
      const nouveauTexte = texte.slice(0, debut) + contenuAffiche + texte.slice(fin);
      setTexte(nouveauTexte);
      setPlageFormuleLive({ debut, fin: debut + contenuAffiche.length });
    }
    setFormuleInitiale(undefined);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  // Arrête de suivre la portion en cours (changement d'onglet Maths<->
  // Chimie, ou fermeture du panneau) -- le texte déjà inséré reste tel
  // quel, mais une frappe suivante commencera une NOUVELLE formule
  // ailleurs plutôt que de continuer à réécrire par-dessus celle-ci.
  function finaliserFormuleLive() {
    setPlageFormuleLive(null);
  }

  function gererCollage(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const texteColleBrut = e.clipboardData.getData("text/plain");
    const langage = detecterLangageCode(texteColleBrut);

    // LaTeX (2026-07-27, corrige un conflit signalé par Bourama) : ne
    // part plus vers la pièce jointe "Formule collée" -- ça empêchait
    // l'aperçu en direct au-dessus du champ (segmenterTexteAvecFormules)
    // de jamais voir cette formule, puisqu'elle n'atteignait jamais
    // `texte`, les deux mécanismes se marchant dessus. Un collage LaTeX
    // s'insère maintenant normalement dans le champ, entouré de $$...$$
    // s'il ne l'était pas déjà, pour que l'aperçu le rende tout de suite.
    if (langage === "latex") {
      e.preventDefault();
      const contenuDelimite = /\$/.test(texteColleBrut) ? texteColleBrut : `$$${texteColleBrut.trim()}$$`;
      const ref = pleinEcranSaisie ? zoneTextePleinEcranRef : zoneTexteRef;
      const el = ref.current;
      const debut = el?.selectionStart ?? texte.length;
      const fin = el?.selectionEnd ?? texte.length;
      const nouveauTexte = texte.slice(0, debut) + contenuDelimite + texte.slice(fin);
      setTexte(nouveauTexte);
      requestAnimationFrame(() => {
        el?.focus();
        const pos = debut + contenuDelimite.length;
        el?.setSelectionRange(pos, pos);
        ajusterHauteurTexte();
      });
      return;
    }

    if (texteColleBrut.length > SEUIL_COLLAGE_LONG || langage) {
      e.preventDefault();
      // Chaque collage s'ajoute aux précédents, jamais ne les remplace.
      setTextesColles((prec) => [...prec, { id: crypto.randomUUID(), contenu: texteColleBrut, langage }]);
    }
  }

  function envoyer() {
    if ((!texte.trim() && textesColles.length === 0) || desactive) return;
    onEnvoyer(
      texte,
      longueur,
      fichiers.map((f) => f.fichier),
      localisation,
      textesColles.map((t) => t.contenu),
      rechercheForcee,
      sansEnseignant,
      // Zip(s) dont le dézipage a démarré dès la sélection (voir
      // ajouterFichiers) -- transmis tels quels, terminés ou pas :
      // core/main.py:chat() termine lui-même le travail restant si
      // besoin (voir zipsEnAttente dans le type onEnvoyer ci-dessus).
      fichiers.filter((f) => f.zipJobId).map((f) => f.zipJobId as string)
    );
    setTexte("");
    viderFichiers();
    setLocalisation(null);
    setTextesColles([]);
    setRechercheForcee(false);
    setSansEnseignant(false);
    requestAnimationFrame(ajusterHauteurTexte);
  }

  async function demarrerDictee() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((piste) => piste.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setTranscriptionEnCours(true);
        try {
          const fichierAudio = new File([blob], "dictee.webm", { type: blob.type });
          const { texte: transcrit } = await transcrireAudioChat(fichierAudio);
          setTexte((prec) => (prec.trim() ? `${prec} ${transcrit}` : transcrit));
          requestAnimationFrame(ajusterHauteurTexte);
        } catch (e) {
          // Message générique remplacé le 2026-07-20 : masquait la vraie
          // cause (non connecté / audio vide-silencieux / vraie erreur
          // serveur) derrière un seul texte, impossible à diagnostiquer
          // depuis le retour utilisateur.
          alert(messageErreur(e));
        } finally {
          setTranscriptionEnCours(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setDictant(true);
    } catch {
      alert("Micro indisponible ou refusé.");
    }
  }

  function arreterDictee() {
    mediaRecorderRef.current?.stop();
    setDictant(false);
  }

  function toggleLocalisation() {
    if (localisation) {
      setLocalisation(null);
      return;
    }
    if (!navigator.geolocation) {
      alert("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    setLocalisationEnCours(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocalisation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocalisationEnCours(false);
      },
      () => {
        alert("Position refusée ou indisponible.");
        setLocalisationEnCours(false);
      }
    );
  }

  // Entrées du menu "+" (01/10/2026), dans l'ordre : Joindre un fichier,
  // Prendre une photo, Mode vocal, Canal en direct, Application. Dicter et
  // Utilitaires ont leur bouton permanent à droite, Longueur / Mode
  // pédagogique sont dans Réglages et Plein écran est collé au coin de la
  // barre : aucun doublon ici. Photo et Mode vocal sont des entrées du
  // registre des utilitaires (lib/outils.ts) : elles ne sont proposées que si
  // l'agent les autorise, et ne figurent plus dans la liste d'Utilitaires.
  function entreesMenuPlus(): EntreeMenuPlus[] {
    const entrees: EntreeMenuPlus[] = [
      {
        cle: "fichier",
        Icone: Pin,
        libelle: "Joindre un fichier",
        onClick: () => inputFichierRef.current?.click(),
      },
    ];
    for (const nom of OUTILS_DU_MENU_PLUS) {
      const outil = outilsUtilitairesPourAgent.find((o) => o.nom === nom);
      if (!outil) continue;
      entrees.push({ cle: nom, Icone: outil.Icone, libelle: outil.label, onClick: () => executerActionOutil(nom) });
    }
    // Guide/Démo retirés du chat (25/09/2026, demande Bourama). Canal en
    // direct (chantier L, 19/09/2026) : contexte nullable, la barre peut être
    // montée hors AppShell.
    if (canalEnDirect) {
      entrees.push({
        cle: "canal",
        Icone: Radio,
        libelle: canalEnDirect.actif ? "Désactiver le canal en direct" : "Activer le canal en direct",
        onClick: () => {
          if (canalEnDirect.actif) canalEnDirect.desactiver();
          else canalEnDirect.activer();
        },
      });
    }
    // Plusieurs applications : une entrée qui ouvre leur liste. Une seule :
    // une entrée directe vers cette application.
    if (appliButtonVisible) {
      entrees.push({
        cle: "applications",
        Icone: LayoutGrid,
        libelle: "Applications",
        onClick: () => setMenuAppliOuvert(true),
      });
    }
    if (appliSlotUnique) {
      entrees.push({
        cle: "application",
        Icone: appliSlotUnique.Icone,
        libelle: appliSlotUnique.label,
        onClick: () => executerActionAppli(appliSlotUnique.nom),
        // Mêmes protections que l'ancien bouton dédié : dépôts GitHub en
        // cours de chargement, Google Drive en cours de connexion ou déjà
        // connecté (aucun choix à faire dans ce cas).
        desactive:
          (appliSlotUnique.nom === "github" && githubEnCours) ||
          (appliSlotUnique.nom === "google_drive" && (driveEnCours || !!driveConnecte)),
      });
    }
    return entrees;
  }

  function genreDeFichier(f: File): GenrePiece {
    if (f.type.startsWith("image/")) return "image";
    if (f.type.startsWith("video/")) return "video";
    if (f.type.startsWith("audio/")) return "audio";
    if (f.type === "application/zip" || f.type === "application/x-zip-compressed" || f.name.toLowerCase().endsWith(".zip")) return "zip";
    return "document";
  }

  const piecesApercu: PieceApercu[] = [
    ...fichiers.map(({ id, fichier, apercu, urlMedia }) => ({
      id,
      nom: fichier.name,
      genre: genreDeFichier(fichier),
      url: apercu ?? urlMedia ?? null,
    })),
    ...(localisation ? [{ id: "position", nom: "Position jointe", genre: "position" as const }] : []),
    ...textesColles.map((t) => ({
      id: `texte:${t.id}`,
      nom: "Texte collé",
      genre: "texte" as const,
      contenu: t.contenu,
      langage: t.langage,
    })),
  ];

  function ouvrirPiece(piece: PieceApercu) {
    if (piece.genre === "image") setImageAgrandieId(piece.id);
    else if (piece.genre === "texte") setTexteColleOuvertId(piece.id.slice("texte:".length));
    else if (piece.genre === "video" || piece.genre === "audio") setMediaOuvertId(piece.id);
    else {
      // Le blob local est intrinsèquement sûr (fichier choisi par
      // l'utilisateur, pas encore envoyé) : pas de vérification d'origine.
      const f = fichiers.find((x) => x.id === piece.id);
      if (f) ouvrirPosition({ url: URL.createObjectURL(f.fichier), titre: f.fichier.name, typeMime: f.fichier.type });
    }
  }

  function retirerPiece(id: string) {
    if (id === "position") setLocalisation(null);
    else if (id.startsWith("texte:")) {
      const idTexte = id.slice("texte:".length);
      setTextesColles((prec) => prec.filter((t) => t.id !== idTexte));
      setTexteColleOuvertId((prec) => (prec === idTexte ? null : prec));
    } else retirerFichier(id);
  }

  const mediaOuvert = mediaOuvertId ? fichiers.find((f) => f.id === mediaOuvertId) : undefined;
  const texteColleOuvert = texteColleOuvertId ? textesColles.find((t) => t.id === texteColleOuvertId) : undefined;

  return (
    <div className="w-full">
      {/* Mineur sans code enseignant : accès bloqué, le bandeau explique
          pourquoi (voir barre/BandeauAccesBloque.tsx). */}
      {modeActif.accesBloque && <BandeauAccesBloque />}

      {/* Ligne défilable des pièces jointes avant envoi (fichiers, position,
          texte collé), même composant que dans la bulle du message envoyé. */}
      {piecesApercu.length > 0 && (
        <div className="mb-2">
          <LigneApercuPieces
            pieces={piecesApercu}
            onOuvrir={ouvrirPiece}
            onRetirer={retirerPiece}
            renduSurCarre={(piece) =>
              // OCR ciblé formule (2026-07-26) : extrait le LaTeX de l'image et
              // l'ouvre dans EditeurFormule pour relecture avant insertion.
              // Cible toujours la première image du tableau (voir
              // extraireFormuleDeImage), donc affiché seulement sur cette
              // vignette pour ne pas laisser croire qu'il agit sur une image
              // précise parmi plusieurs.
              piece.genre === "image" && fichiers.find((f) => f.apercu)?.id === piece.id ? (
                <button
                  onClick={extraireFormuleDeImage}
                  disabled={extractionFormuleEnCours}
                  aria-label="Extraire la formule de cette image"
                  title="Extraire la formule"
                  className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-dj-surface-haute text-dj-texte disabled:opacity-60"
                >
                  <Sigma size={11} className={extractionFormuleEnCours ? "animate-pulse" : ""} />
                </button>
              ) : null
            }
          />
        </div>
      )}

      {/* Rectangle à coins arrondis (plus une pilule ovale complète), tous
          les éléments alignés en bas -- voir section 3.3.
          CORRECTIF (27/08) : bg-dj-surface-haute -> bg-dj-surface, la
          barre de saisie avait été oubliée quand les cartes sont
          repassées en blanc pur (--dj-surface), demande explicite de
          Bourama. */}
      <div
        // 18/09/2026, correctif Bourama (voir @container posé sur la
        // popup dans ChatFlottant.tsx) : bascule désormais sur la largeur
        // réellement disponible ICI (popup mini redimensionnable ou page
        // /chat) plutôt que sur la largeur de toute la fenêtre du
        // navigateur -- md: restait "desktop" même quand la popup était
        // rétrécie bien en dessous de 768px, coupant des morceaux de
        // cette barre. Seuil choisi (360px) : sous le défaut de la popup
        // (380px, inchangé), au-dessus de sa taille minimale (320px, voir
        // TAILLE_MIN) -- qui bascule donc vers la version compacte
        // ci-dessous (ligne ~2211), déjà pensée pour un espace étroit.
        className="relative hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 py-3 focus-within:border-dj-bordure-forte md:block"
      >
        {/* Plein écran (01/10/2026) : posé dehors, collé juste au-dessus du coin haut
            droit de la barre, petite flèche sans bulle. Ouvre la même
            zone d'écriture agrandie sur PC et mobile (pleinEcranSaisie). */}
        <button
          type="button"
          onClick={() => setPleinEcranSaisie(true)}
          aria-label="Agrandir en plein écran"
          title="Plein écran"
          className="absolute -top-6 right-0 z-10 flex h-6 w-6 items-center justify-center text-dj-texte-muet opacity-70 transition-opacity hover:text-dj-texte hover:opacity-100"
        >
          <ArrowUpRight size={12} strokeWidth={1.75} />
        </button>
        {/* Aperçu formules (2026-07-27) -- affiché seulement si le
            brouillon contient au moins un "$", pour ne pas dupliquer
            inutilement un simple message texte sans maths. Placé
            au-dessus du textarea (demande explicite de Bourama), lecture
            seule, pas de curseur/sélection ici -- seulement pour
            visualiser le rendu final avant envoi. */}
        {texte.includes("$") && (
          <div
            ref={apercuFormulesRef}
            className="mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2 text-[15px] leading-relaxed text-dj-texte"
          >
            {segmenterTexteAvecFormules(texte).map((s, i) =>
              s.formule ? (
                <span key={i} dangerouslySetInnerHTML={{ __html: rendreFormuleKatex(s.texte, !!s.bloc) }} />
              ) : (
                <span key={i}>{s.texte}</span>
              )
            )}
          </div>
        )}
        <div className="relative">
          {/* Calque de couleur -- lecture seule, non interactif
              (pointer-events-none), affiche EXACTEMENT le même texte que
              le textarea réel juste au-dessus dans le DOM (même police/
              taille/interligne/césure), avec les liens en gris souligné
              (dj-texte-muet, 24/08 : plus de couleur accent ici, réservée
              aux actions principales). Le vrai texte du textarea est rendu invisible
              (text-transparent, voir plus bas) -- c'est ce calque qui
              porte toute la couleur visible. */}
          <div
            ref={calqueRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 max-h-64 overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-normal text-dj-texte"
          >
            {texte
              ? segmenterTexteAvecLiens(texte).map((s, i) =>
                  s.lien ? (
                    <span key={i} className="text-dj-texte-muet underline">
                      {s.texte}
                    </span>
                  ) : (
                    <span key={i}>{s.texte}</span>
                  )
                )
              : null}
            {/* Espace de fin pour que le calque ait la même hauteur que le
                textarea même quand le texte se termine par un retour à la
                ligne (sinon scrollHeight des deux diverge légèrement). */}
            {texte.endsWith("\n") && "\u200b"}
          </div>
          <textarea
            ref={zoneTexteRef}
            value={texte}
            onChange={(e) => {
              setTexte(e.target.value);
              ajusterHauteurTexte();
            }}
            onPaste={gererCollage}
            onScroll={(e) => {
              if (calqueRef.current) calqueRef.current.scrollTop = e.currentTarget.scrollTop;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                envoyer();
              }
            }}
            placeholder={transcriptionEnCours ? "Transcription en cours..." : "Pose ta question..."}
            rows={1}
            className="relative max-h-64 w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-normal text-transparent caret-dj-texte outline-none placeholder:text-dj-texte-muet"
          />
        </div>

        {/* Éditeur maths/chimie fusionné (2026-07-27, demande Bourama :
            "plus de popup") -- s'ouvre SOUS le champ de texte, qui lui
            reste toujours en haut, fixe. Contrôlé par le seul bouton Σ
            de la barre d'outils ci-dessous (voir EditeurFormule.tsx pour
            le détail : onglets Maths/Chimie, champ MathLive + son
            clavier virtuel complet, palette chimie). */}
        {editeurFormuleOuvert && (
          <EditeurFormule
            onChangeLive={mettreAJourFormuleLive}
            onChangerOnglet={finaliserFormuleLive}
            onFermer={() => {
              setEditeurFormuleOuvert(false);
              setFormuleInitiale(undefined);
              finaliserFormuleLive();
            }}
            valeurInitiale={formuleInitiale}
          />
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* Bouton "+" (01/10/2026, refonte de la barre de saisie) : un
                seul bouton à gauche. Son menu contient Joindre un fichier,
                Prendre une photo, Mode vocal, Canal en direct et
                Application (voir barre/MenuPlus.tsx). Joindre un fichier
                n'a aucun filtre de type dans le sélecteur : un format
                refusé par le serveur s'affiche en erreur sur sa pièce
                après l'envoi. */}
            <MenuPlus
              variante="bureau"
              entrees={entreesMenuPlus()}
              enfantsAncres={
                <>
                  {/* Liste des applications (plusieurs applis actives),
                      ouverte depuis l'entrée "Applications" du menu "+". */}
                  {appliButtonVisible && (
                    <div
                      ref={menuAppliRef}
                      className={
                        "absolute bottom-full left-0 z-30 mb-2 max-h-72 w-56 origin-bottom-left overflow-y-auto rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-1 shadow-lg transition-all duration-150 ease-cgpt-doux " +
                        (menuAppliOuvert
                          ? "visible translate-y-0 scale-100 opacity-100"
                          : "invisible translate-y-1 scale-95 opacity-0")
                      }
                    >
                      {[...applisPourAgent]
                        .sort((a, b) => a.label.localeCompare(b.label, "fr"))
                        .map(({ nom, label, Icone }) => (
                          <button
                            key={nom}
                            onClick={() => {
                              executerActionAppli(nom);
                              setMenuAppliOuvert(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-dj-texte transition-colors hover:bg-dj-surface-haute"
                          >
                            <Icone size={14} />
                            <span className="flex-1">{label}</span>
                          </button>
                        ))}
                    </div>
                  )}
                  {/* Sélecteur de pages Notion : ouvert par cliquerNotion()
                      (via executerActionAppli), que Notion soit l'application
                      seule ou l'une de plusieurs. Le panneau mobile
                      (md:hidden, plus bas dans le fichier) couvre le petit
                      écran. */}
                  {selecteurNotionOuvert && (
                    <div
                      ref={selecteurNotionRef}
                      className="absolute bottom-full left-0 z-30 mb-2 hidden w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-dj-bordure bg-dj-surface-haute p-1 shadow-xl md:block"
                    >
                      {contenuSelecteurNotion("bg-dj-surface", "bg-dj-surface")}
                    </div>
                  )}
                  {/* Sélecteur de dépôts GitHub. */}
                  <div ref={selecteurRef}>
                  {selecteurOuvert && (
                    <div className="absolute bottom-full left-0 z-30 mb-2 max-h-64 w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-dj-bordure bg-dj-surface-haute p-1 shadow-xl">
                      {depots === null && (
                        <div className="space-y-1.5 px-3 py-2" aria-hidden>
                          <Skeleton className="h-3 w-3/4 rounded" />
                          <Skeleton className="h-3 w-1/2 rounded" style={{ animationDelay: "120ms" }} />
                          <Skeleton className="h-3 w-2/3 rounded" style={{ animationDelay: "240ms" }} />
                        </div>
                      )}
                      {depots?.length === 0 && (
                        <p className="px-3 py-2 text-xs text-dj-texte-muet">Aucun dépôt trouvé.</p>
                      )}
                      {depots?.map((d) => (
                        <button
                          key={d.nom_complet}
                          type="button"
                          onClick={() => choisirDepot(d.nom_complet)}
                          className="block w-full rounded-lg px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface"
                        >
                          <span className="flex items-center gap-1.5">
                            {d.nom_complet}
                            {d.prive && (
                              <span className="rounded bg-dj-surface px-1.5 py-0.5 text-[10px] text-dj-texte-muet">
                                privé
                              </span>
                            )}
                          </span>
                          {d.description && (
                            <span className="line-clamp-1 text-xs text-dj-texte-muet">{d.description}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  </div>
                </>
              }
            />
            <input
              ref={inputFichierRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                ajouterFichiers(Array.from(e.target.files ?? []));
                // Sans ça, choisir deux fois DE SUITE le(s) même(s)
                // fichier(s) (ex: retirer puis rejoindre le même) ne
                // redéclenche pas onChange, même valeur input.
                e.target.value = "";
              }}
            />

            {/* Input caché pour l'utilitaire ui_photo, déclenché depuis
                executerActionOutil (voir sa déclaration plus haut pour
                le détail de capture="environment"). */}
            <input
              ref={inputPhotoRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                ajouterFichiers(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />

            {/* Bouton "Sans enseignant" (06/08/2026, demande Bourama) --
                uniquement pour les agents à contenu dynamique par matière
                (Classinus) : force le prompt généraliste pour le prochain
                message, sans utiliser le contenu d'aucun enseignant même
                si l'étudiant a des matières débloquées. Même pattern
                d'icône que rechercheForcee juste au-dessus. */}
            {boutonSansEnseignant && (
              <button
                onClick={() => setSansEnseignant((v) => !v)}
                aria-label="Répondre sans utiliser le contenu d'un enseignant"
                title="Répondre sans utiliser le contenu d'un enseignant"
                className={
                  "relative rounded-cgpt-bouton p-1 transition-colors " +
                  (sansEnseignant
                    ? "bg-dj-accent-1/10 text-dj-accent-1-texte"
                    : "text-dj-texte-muet hover:text-dj-texte")
                }
              >
                <UserX size={18} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <BoutonReglages
              variante="bureau"
              modelesDisponibles={modelesDisponibles}
              modeleSelectionne={modeleSelectionne}
              onModeleChange={onModeleChange}
              longueur={longueur}
              onLongueurChange={setLongueur}
              eleveChoisitMode={modeActif.eleveChoisitMode}
              pedagogie={pedagogie}
              modeActif={modeActif}
            />
            {/* Bouton Utilitaires (2026-08-01, demande Bourama : "seront
                un autre bouton à part, plus dans outils") -- ex-onglet
                "utilitaires" du menu Outils, sorti dans son propre bouton
                dédié. MÊME logique de multi-sélection cumulative que le
                bouton Outils (estOutilActif/executerActionOutil déjà
                génériques, y compris pour les entrées "ui_" locales) --
                juste pas d'onglets ici, une seule liste plate. Masqué si
                l'agent n'a aucune entrée utilitaire autorisée. */}
            {utilitairesBouton.length > 0 && (
            <div className="relative">
              <button
                ref={boutonUtilitairesRef}
                onClick={() => setMenuUtilitairesOuvert((v) => !v)}
                aria-label="Choisir un ou plusieurs utilitaires"
                title="Choisir un ou plusieurs utilitaires"
                className={
                  "relative rounded-cgpt-bouton p-1 transition-colors " +
                  (menuUtilitairesOuvert || utilitairesBouton.some((o) => estOutilActif(o.nom))
                    ? "bg-dj-accent-1/10 text-dj-accent-1-texte"
                    : "text-dj-texte-muet hover:text-dj-texte")
                }
              >
                <SlidersHorizontal size={18} />
              </button>
              <div
                ref={menuUtilitairesRef}
                className={
                  "absolute bottom-full right-0 z-20 mb-2 max-h-64 w-56 max-w-[calc(100vw-2rem)] origin-bottom-right overflow-y-auto rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-1 shadow-lg transition-all duration-150 ease-cgpt-doux " +
                  (menuUtilitairesOuvert
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none translate-y-1 scale-95 opacity-0")
                }
              >
                {[...utilitairesBouton]
                  .sort((a, b) => a.label.localeCompare(b.label, "fr"))
                  .map(({ nom, label, Icone }) => {
                    const actif = estOutilActif(nom);
                    return (
                      <button
                        key={nom}
                        onClick={() => executerActionOutil(nom)}
                        disabled={nom === "ui_localisation" && localisationEnCours}
                        className={
                          "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-xs transition-colors " +
                          (actif ? "bg-dj-accent-1/10 text-dj-accent-1-texte" : "text-dj-texte hover:bg-dj-surface-haute")
                        }
                      >
                        <Icone size={14} />
                        <span className="flex-1">{label}</span>
                        {actif && <Check size={13} />}
                      </button>
                    );
                  })}
              </div>
            </div>
            )}

            {dictant ? (
              <button
                onClick={arreterDictee}
                aria-label="Arrêter la dictée"
                className="flex h-8 w-8 items-center justify-center rounded-cgpt-bouton bg-dj-accent-2 text-white"
              >
                <Square size={14} />
              </button>
            ) : genererEnCours ? (
              <button
                onClick={onArreter}
                aria-label="Arrêter la génération"
                className="flex h-8 w-8 items-center justify-center rounded-cgpt-bouton bg-dj-accent-1 text-[#1A0D02]"
              >
                <Square size={14} />
              </button>
            ) : texte.trim() || textesColles.length > 0 ? (
              <button
                onClick={envoyer}
                disabled={desactive}
                aria-label="Envoyer"
                className="flex h-8 w-8 items-center justify-center rounded-cgpt-bouton bg-dj-accent-1 text-[#1A0D02] disabled:opacity-60"
              >
                <ArrowUp size={16} />
              </button>
            ) : (
              <>
                {/* Micro = dictée vocale, branché le 2026-07-20 (voir
                    demarrerDictee/arreterDictee ci-dessus). Waveform = mode
                    vocal complet (conversation continue) -- PAS branché,
                    portée bien plus large qu'une simple dictée, laissé de
                    côté pour l'instant. */}
                <button
                  onClick={demarrerDictee}
                  disabled={transcriptionEnCours}
                  aria-label="Dictée vocale"
                  className="text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
                >
                  <Mic size={18} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Composeur mobile (2026-07-28, refonte demandée par Bourama) --
          une seule ligne : "+" (regroupe Joindre un fichier / Outils /
          Applications) / champ de texte / 2 boutons (Dictée + 1 slot
          variable "dernier outil utilisé"). Ref de textarea séparée
          (zoneTexteMobileRef) mais MÊME état `texte` que la version
          desktop -- les deux restent synchronisés même si un seul est
          visible à la fois (l'autre est juste caché en CSS, pas
          démonté). Pas de calque couleur/auto-agrandissement ici (v1
          volontairement plus simple sur mobile) : défilement interne au
          -delà de max-h. */}
      {/* Aperçu formules mobile (2026-07-30) -- même logique que la version
          desktop ci-dessus (segmenterTexteAvecFormules), juste dupliquée
          ici avec son propre ref car les deux composers restent montés
          en même temps (voir apercuFormulesMobileRef). */}
      {texte.includes("$") && (
        <div
          ref={apercuFormulesMobileRef}
          className="mb-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2 text-[15px] leading-relaxed text-dj-texte md:hidden"
        >
          {segmenterTexteAvecFormules(texte).map((s, i) =>
            s.formule ? (
              <span key={i} dangerouslySetInnerHTML={{ __html: rendreFormuleKatex(s.texte, !!s.bloc) }} />
            ) : (
              <span key={i}>{s.texte}</span>
            )
          )}
        </div>
      )}
      <div className="relative flex flex-col gap-1 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2.5 focus-within:border-dj-bordure-forte md:hidden">
        {/* Plein écran (01/10/2026) : posé dehors, collé juste au-dessus du coin haut
            droit de la barre, petite flèche sans bulle. Ouvre la même
            zone d'écriture agrandie sur PC et mobile (pleinEcranSaisie). */}
        <button
          type="button"
          onClick={() => setPleinEcranSaisie(true)}
          aria-label="Agrandir en plein écran"
          title="Plein écran"
          className="absolute -top-6 right-0 z-10 flex h-6 w-6 items-center justify-center text-dj-texte-muet opacity-70 transition-opacity hover:text-dj-texte hover:opacity-100"
        >
          <ArrowUpRight size={12} strokeWidth={1.75} />
        </button>
        <textarea
          ref={zoneTexteMobileRef}
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value);
            ajusterHauteurTexte();
          }}
          onPaste={gererCollage}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          onFocus={(e) => {
            // Correctif mobile (2026-07-30) : à l'ouverture du clavier,
            // iOS Safari met quelques centaines de ms à réduire le
            // viewport visible (voir lib/useHauteurVisuelle.ts) -- sans
            // ça le champ reste visuellement "sous" le clavier le temps
            // de l'animation. setTimeout laisse cette animation démarrer
            // avant de forcer le champ dans la zone désormais visible.
            const el = e.currentTarget;
            setTimeout(() => el.scrollIntoView({ block: "end", behavior: "smooth" }), 300);
          }}
          placeholder={transcriptionEnCours ? "Transcription en cours..." : "Pose ta question..."}
          rows={1}
          className="max-h-32 min-h-8 w-full resize-none overflow-y-auto bg-transparent px-1 py-1 text-base leading-normal text-dj-texte outline-none placeholder:text-dj-texte-muet"
        />


        {/* Deuxième ligne (14/08, demande Bourama : forme carte en deux
            lignes empilées comme la référence Claude fournie, au lieu
            d'une seule ligne "pilule" plate -- texte au-dessus, icônes
            actions en dessous, "+" à gauche / micro-envoi à droite).
            30/08/2026 (audit UX mobile, partie 5) : les 5 boutons
            d'action de cette barre mobile (+, dictée, arrêter dictée,
            envoyer, slot outil/appli) étaient tous en h-10 w-10 (40px),
            sous le minimum recommandé Material/Apple/WCAG pour une
            cible tactile principale (44-48px) -- relevés à h-11 w-11
            (44px), sans changer leur position ni leur icône. */}
        <div className="flex items-center justify-between gap-1">
          <MenuPlus variante="mobile" entrees={entreesMenuPlus()} />

        <div className="flex items-center gap-1">
        <BoutonReglages
          variante="mobile"
          modelesDisponibles={modelesDisponibles}
          modeleSelectionne={modeleSelectionne}
          onModeleChange={onModeleChange}
          longueur={longueur}
          onLongueurChange={setLongueur}
          eleveChoisitMode={modeActif.eleveChoisitMode}
          pedagogie={pedagogie}
          modeActif={modeActif}
        />
        {utilitairesBouton.length > 0 && (
          <button
            ref={boutonUtilitairesMobileRef}
            type="button"
            onClick={() => setMenuUtilitairesOuvert((v) => !v)}
            aria-label="Choisir un ou plusieurs utilitaires"
            title="Utilitaires"
            className={
              "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-cgpt-bouton transition-colors " +
              (menuUtilitairesOuvert || utilitairesBouton.some((o) => estOutilActif(o.nom))
                ? "bg-dj-accent-1/10 text-dj-accent-1-texte"
                : "text-dj-texte-muet hover:bg-dj-surface hover:text-dj-texte")
            }
          >
            <SlidersHorizontal size={18} />
          </button>
        )}
        {dictant ? (
          <button
            onClick={arreterDictee}
            aria-label="Arrêter la dictée"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-cgpt-bouton bg-dj-accent-2 text-white"
          >
            <Square size={14} />
          </button>
        ) : genererEnCours ? (
          <button
            onClick={onArreter}
            aria-label="Arrêter la génération"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-cgpt-bouton bg-dj-accent-1 text-[#1A0D02]"
          >
            <Square size={14} />
          </button>
        ) : texte.trim() || textesColles.length > 0 ? (
          <button
            onClick={envoyer}
            disabled={desactive}
            aria-label="Envoyer"
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-cgpt-bouton bg-dj-accent-1 text-[#1A0D02] disabled:opacity-60"
          >
            <ArrowUp size={16} />
          </button>
        ) : (
          <>
            <button
              onClick={demarrerDictee}
              disabled={transcriptionEnCours}
              aria-label="Dictée vocale"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-cgpt-bouton text-dj-texte-muet transition-colors hover:bg-dj-surface hover:text-dj-texte disabled:opacity-60"
            >
              <Mic size={16} />
            </button>
          </>
        )}
        </div>
        </div>
      </div>

      {/* Éditeur maths/chimie mobile (2026-07-30, bug signalé par Bourama :
          ce panneau n'existait qu'à l'intérieur du bloc "hidden ...
          md:block" (desktop), donc `editeurFormuleOuvert` passait bien à
          true au clic sur mobile mais rien ne s'affichait jamais --
          display:none masque aussi bien le rendu que l'interactivité de
          ses enfants. Même props que la version desktop plus haut. */}
      {editeurFormuleOuvert && (
        <div className="@[360px]:hidden">
          <EditeurFormule
            onChangeLive={mettreAJourFormuleLive}
            onChangerOnglet={finaliserFormuleLive}
            onFermer={() => {
              setEditeurFormuleOuvert(false);
              setFormuleInitiale(undefined);
              finaliserFormuleLive();
            }}
            valeurInitiale={formuleInitiale}
          />
        </div>
      )}

      {/* Panneau Utilitaires mobile (2026-08-01) -- sans onglets (liste
          plate). Panneau Outils mobile équivalent retiré le 2026-08-20
          (mort, kill-switch AFFICHER_BOUTON_OUTILS du 13/08 jamais
          réactivé).
          bottom-[calc(6rem+var(--safe-bottom))]
          (26/08/2026, correctif "boutons qui se cachent derrière" en app
          native) : ces 4 panneaux (celui-ci + les 3 qui suivent) étaient
          ancrés à 6rem du bas de la WebView, juste au-dessus de la
          barre de saisie en web, mais sous la barre d'onglets native
          (calque par-dessus la WebView, voir BarreOngletsNative.tsx) en
          app installée, qui les recouvrait partiellement.
          Correctif (05/09/2026, Bourama : "l'appli deborde en haut et en
          bas") : ces panneaux ne vivent que dans le chat, toujours plein
          écran sur natif (BarreOngletsNative.tsx masque alors la barre
          d'onglets) -- l'ancienne variable --cap-native-navigation-bottom
          y valait donc toujours 0px (voir explication complète dans
          app/globals.css), le besoin réel ici est juste la barre système/
          de gestes du bas, couverte par --safe-bottom. Vaut 0px sur le
          web (hors encoche/île), donc purement additif ailleurs. */}
      {menuUtilitairesOuvert && (
        <div
          ref={menuUtilitairesMobileRef}
          className="fixed bottom-[calc(6rem+var(--safe-bottom))] right-4 z-40 flex max-h-[45vh] w-64 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface shadow-xl md:hidden"
        >
          <div className="flex items-center justify-between border-b border-dj-bordure px-3 py-1.5">
            <span className="text-xs font-medium text-dj-texte-muet">Utilitaires</span>
            <button
              onClick={() => setMenuUtilitairesOuvert(false)}
              aria-label="Fermer"
              className="flex-shrink-0 text-dj-texte-muet hover:text-dj-texte"
            >
              <X size={16} />
            </button>
          </div>
          <div className="overflow-y-auto p-1">
            {[...utilitairesBouton]
              .sort((a, b) => a.label.localeCompare(b.label, "fr"))
              .map(({ nom, label, Icone }) => {
                const actif = estOutilActif(nom);
                return (
                  <button
                    key={nom}
                    onClick={() => executerActionOutil(nom)}
                    disabled={nom === "ui_localisation" && localisationEnCours}
                    className={
                      "flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[13px] transition-colors " +
                      (actif ? "bg-dj-accent-1/10 text-dj-accent-1-texte" : "text-dj-texte hover:bg-dj-surface-haute")
                    }
                  >
                    <Icone size={15} />
                    <span className="flex-1">{label}</span>
                    {actif && <Check size={14} />}
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Panneau Applications mobile (2026-07-28) -- même principe,
          même état `menuAppliOuvert` que l'icône desktop. */}
      {menuAppliOuvert && (
        <div
          ref={menuAppliMobileRef}
          className="fixed inset-x-4 bottom-[calc(6rem+var(--safe-bottom))] z-40 max-h-[60vh] overflow-y-auto rounded-2xl border border-dj-bordure bg-dj-surface p-1 shadow-xl md:hidden"
        >
          {[...applisPourAgent]
            .sort((a, b) => a.label.localeCompare(b.label, "fr"))
            .map(({ nom, label, Icone }) => (
              <button
                key={nom}
                onClick={() => {
                  executerActionAppli(nom);
                  setMenuAppliOuvert(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface-haute"
              >
                <Icone size={16} />
                <span className="flex-1">{label}</span>
              </button>
            ))}
        </div>
      )}

      {/* Sélecteur de dépôts GitHub mobile (2026-07-30, bug signalé par
          Bourama, même famille que les deux précédents : `cliquerGithub()`
          bascule bien `selecteurOuvert` et charge la liste des dépôts sur
          mobile aussi (executerActionAppli -> cliquerGithub, commun aux
          deux plateformes), mais le rendu de cette liste n'existait qu'à
          l'intérieur du bloc desktop (ligne ~1073, "hidden ... md:block")
          -- ici, taper sur GitHub dans le panneau Applications refermait
          ce panneau (setMenuAppliOuvert(false)) sans jamais rien afficher
          à la place. Indépendant de menuAppliOuvert : ce sélecteur doit
          rester ouvert même après la fermeture de ce panneau. */}
      {selecteurOuvert && (
        <div
          ref={selecteurMobileRef}
          className="fixed inset-x-4 bottom-[calc(6rem+var(--safe-bottom))] z-40 max-h-[60vh] overflow-y-auto rounded-2xl border border-dj-bordure bg-dj-surface p-1 shadow-xl md:hidden"
        >
          {depots === null && (
            <div className="space-y-1.5 px-3 py-2" aria-hidden>
              <Skeleton className="h-3 w-3/4 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" style={{ animationDelay: "120ms" }} />
              <Skeleton className="h-3 w-2/3 rounded" style={{ animationDelay: "240ms" }} />
            </div>
          )}
          {depots?.length === 0 && (
            <p className="px-3 py-2 text-xs text-dj-texte-muet">Aucun dépôt trouvé.</p>
          )}
          {depots?.map((d) => (
            <button
              key={d.nom_complet}
              type="button"
              onClick={() => choisirDepot(d.nom_complet)}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface-haute"
            >
              <span className="flex items-center gap-1.5">
                {d.nom_complet}
                {d.prive && (
                  <span className="rounded bg-dj-surface-haute px-1.5 py-0.5 text-[10px] text-dj-texte-muet">
                    privé
                  </span>
                )}
              </span>
              {d.description && (
                <span className="line-clamp-1 text-xs text-dj-texte-muet">{d.description}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Sélecteur de pages Notion mobile (01/08) -- même raison d'être que
          le sélecteur de dépôts GitHub mobile juste au-dessus : le rendu
          desktop du panneau (bloc "hidden ... md:block") ne suffit pas sur
          mobile, où l'entrée "Notion" est tapée depuis le panneau
          Applications (menuAppliOuvert) plutôt que depuis appliSlotUnique. */}
      {selecteurNotionOuvert && (
        <div
          ref={selecteurNotionMobileRef}
          className="fixed inset-x-4 bottom-[calc(6rem+var(--safe-bottom))] z-40 max-h-[60vh] overflow-y-auto rounded-2xl border border-dj-bordure bg-dj-surface p-1 shadow-xl md:hidden"
        >
          {contenuSelecteurNotion("bg-dj-surface-haute", "bg-dj-surface-haute")}
        </div>
      )}

      {texteColleOuvert && (
        <FenetreTexteColle
          texte={texteColleOuvert.contenu}
          langage={texteColleOuvert.langage}
          onFermer={() => setTexteColleOuvertId(null)}
        />
      )}

      {mediaOuvert?.urlMedia && (
        <FenetreMedia
          href={mediaOuvert.urlMedia}
          nom={mediaOuvert.fichier.name}
          type={mediaOuvert.fichier.type.startsWith("video/") ? "video" : "audio"}
          onFermer={() => setMediaOuvertId(null)}
        />
      )}

      {imageAgrandieId && fichiers.find((f) => f.id === imageAgrandieId)?.apercu && (
        // Consolidé (audit 25/08/2026) dans VisionneuseImage.tsx -- corrige
        // au passage le bouton "Fermer" qui n'avait aucun onClick propre.
        <VisionneuseImage
          src={fichiers.find((f) => f.id === imageAgrandieId)?.apercu ?? ""}
          onFermer={() => setImageAgrandieId(null)}
        />
      )}

      {canvasOuvert && (
        <CanvasDessin
          enSortie={canvasEnSortie}
          onFermer={() => fermerCanvasAnime(() => setCanvasOuvert(false))}
          onValider={(fichier) => {
            // Rejoint le pipeline "Joindre un fichier" existant -- le
            // dessin est traité en tout point comme une image uploadée
            // (aperçu + vision Gemini côté backend, aucun code séparé).
            // S'AJOUTE aux fichiers déjà joints depuis le 17/08 (upload
            // multiple), ne les remplace plus.
            ajouterFichiers([fichier]);
            fermerCanvasAnime(() => setCanvasOuvert(false));
          }}
        />
      )}

      {editeurMathsRicheOuvert && (
        <EditeurMathsRiche
          enSortie={editeurMathsEnSortie}
          onFermer={() => fermerEditeurMathsAnime(() => setEditeurMathsRicheOuvert(false))}
          onInserer={(texteSerialise) => {
            // Seul point de contact avec le composer existant : on
            // rejoint `texte` exactement comme la dictée classique
            // (demarrerDictee) ou le collage -- rien d'autre du textarea
            // n'est modifié.
            setTexte((prec) => (prec.trim() ? `${prec} ${texteSerialise}` : texteSerialise));
            fermerEditeurMathsAnime(() => setEditeurMathsRicheOuvert(false));
            requestAnimationFrame(ajusterHauteurTexte);
          }}
        />
      )}

      {pleinEcranSaisie && (
        // Plein écran de la saisie : même état `texte`/`onEnvoyer` que le
        // composer normal (pas de duplication de logique), juste une zone
        // d'écriture plus grande + bouton envoyer intégré pour ne pas avoir
        // à fermer le plein écran avant d'envoyer (demande de Bourama,
        // 2026-07-23). Coloration des liens reprise ici aussi (2026-07-23,
        // suite) via le même calque que le composer compact, juste sur des
        // refs séparées.
        // 24/09/2026 (bug remonté par Bourama : le cadre de la saisie agrandie
        // ne montrait que deux lignes, plus petit que la saisie normale) :
        // PanneauFlottant est une carte à hauteur de contenu (max-h), donc la
        // zone de texte en flex-1/h-full n'avait aucune hauteur définie et
        // s'écrasait ; en plus, rendue dans le chat flottant animé, elle y
        // restait enfermée. PleinEcranApercu est un vrai plein écran dans
        // <body> (hauteur définie), comme pour les blocs de code et les aperçus.
        <PleinEcranApercu
          titre="Écris ton message"
          onFerme={() => fermerPleinEcranSaisieAnime(() => setPleinEcranSaisie(false))}
          enSortie={pleinEcranSaisieEnSortie}
          entete={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-dj-texte-muet">Écris ton message</span>
              <button
                onClick={() => fermerPleinEcranSaisieAnime(() => setPleinEcranSaisie(false))}
                aria-label="Rétrécir"
                className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <Minimize2 size={14} /> Rétrécir
              </button>
            </div>
          }
        >
          <div className="relative min-h-0 flex-1 overflow-hidden">
            {/* Même technique de calque que le composer compact (voir plus
                haut, segmenterTexteAvecLiens) -- coloration des liens
                pendant la frappe, demande de Bourama (2026-07-23) : le
                plein écran ne doit pas perdre cette fonctionnalité. */}
            <div
              ref={calquePleinEcranRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-base leading-relaxed text-dj-texte"
            >
              {texte
                ? segmenterTexteAvecLiens(texte).map((s, i) =>
                    s.lien ? (
                      <span key={i} className="text-dj-texte-muet underline">
                        {s.texte}
                      </span>
                    ) : (
                      <span key={i}>{s.texte}</span>
                    )
                  )
                : null}
              {texte.endsWith("\n") && "\u200b"}
            </div>
            <textarea
              ref={zoneTextePleinEcranRef}
              autoFocus
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onPaste={gererCollage}
              onScroll={(e) => {
                if (calquePleinEcranRef.current) calquePleinEcranRef.current.scrollTop = e.currentTarget.scrollTop;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyer();
                  fermerPleinEcranSaisieAnime(() => setPleinEcranSaisie(false));
                }
              }}
              placeholder="Pose ta question..."
              className="relative h-full w-full resize-none overflow-y-auto bg-transparent text-base leading-relaxed text-transparent caret-dj-texte outline-none placeholder:text-dj-texte-muet"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                envoyer();
                fermerPleinEcranSaisieAnime(() => setPleinEcranSaisie(false));
              }}
              disabled={(!texte.trim() && textesColles.length === 0) || desactive}
              aria-label="Envoyer"
              className="flex items-center gap-2 rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
            >
              Envoyer <ArrowUp size={16} />
            </button>
          </div>
        </PleinEcranApercu>
      )}
    </div>
  );
}
