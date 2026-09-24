import {
  MapPin,
  FileText,
  Search,
  Code,
  PenLine,
  FileSearch,
  Globe,
  Map,
  BookOpen,
  FileType,
  FileSpreadsheet,
  Presentation,
  Package,
  Archive,
  Download,
  Image as IconImage,
  Bell,
  Edit3,
  Sigma,
  AudioLines,
  Github,
  Calculator,
  Divide,
  Paperclip,
  FilePlus,
  Move,
  Copy,
  Database,
  Settings2,
  MessageSquare,
  MessagesSquare,
  Clock,
  Users,
  UserCog,
  Table2,
  LayoutGrid,
  StickyNote,
  PanelsTopLeft,
  SlidersHorizontal,
  Library,
  Wrench,
  HardDrive,
} from "lucide-react";
import { IconeNotion } from "@/components/icons/IconeNotion";
import { useEffect, useState } from "react";
import * as IconesLucide from "lucide-react";
import { lireRegistreOutils } from "@/lib/api";

// Extrait de components/chat/BarreDeSaisie.tsx le 01/08 (Bourama : "est-ce
// que ça varie en fonction de quel outil est ajouté ou enlevé" --
// app/dashboard/applications/page.tsx dupliquait cette liste à la main,
// donc désynchronisée dès qu'un outil/appli est ajouté ou enlevé ici).
// Source UNIQUE désormais pour BarreDeSaisie.tsx, BulleMessage.tsx,
// OutilResultatBulle.tsx et app/dashboard/applications/page.tsx -- ne
// jamais redéfinir ces listes ailleurs, toujours importer d'ici.
//
// Classement en onglets (2026-07-28, demande Bourama) :
// - "generer" -> Générer
// - "rechercher" -> Rechercher / Explorer
// - "action_app" -> Action dans l'app -- outils qui passent par un service
//   tiers CONNECTÉ (GitHub, Notion) ; le champ `appli` (nom d'une entrée
//   de APPLIS_DISPONIBLES) les regroupe sous l'icône+nom de leur appli
//   dans cet onglet, en accordéon.
// - "utilitaires" -> Utilitaires -- tout le reste, y compris les 4
//   anciennes icônes autonomes (préfixe "ui_", voir plus bas)
export type OngletOutil = "generer" | "rechercher" | "action_app" | "utilitaires";

// onglet optionnel (17/08, demande Bourama) : un outil peut n'appartenir
// à AUCUN menu (ex. outils d'édition de programme, appelés par le modèle
// en autonomie) tout en gardant son icône/label ici pour la bulle
// "résultat d'outil" (OutilResultatBulle.tsx) -- absent/null plutôt
// qu'une valeur "utilitaires" par défaut qui les rendrait cliquables à
// tort.
export type OutilAffichage = { nom: string; label: string; Icone: typeof Search; onglet?: OngletOutil | null; appli?: string };

// Résolution icône (2026-08-15) -- le backend (core/registre_outils.py:
// REGISTRE_AFFICHAGE_OUTILS) envoie un nom d'export lucide-react en
// chaîne (ex. "FileText"). "notion-logo" est le seul cas spécial (pas un
// export lucide-react, voir IconeNotion.tsx). Wrench en tout dernier
// repli si jamais le backend référence un nom introuvable dans la
// version de lucide-react installée ici (désynchronisation possible,
// mais rare -- vérifié à la main lors de l'ajout d'un outil).
function resoudreIcone(nomIcone: string): typeof Search {
  if (nomIcone === "notion-logo") return IconeNotion;
  const composant = (IconesLucide as unknown as Record<string, typeof Search>)[nomIcone];
  return composant ?? Wrench;
}

type OutilBrut = { nom: string; label: string; icone: string; onglet?: OngletOutil | null; appli?: string };

// Verbe d'action -> petite icône (24/09/2026, demande Bourama : regroupement
// des outils qui s'enchaînent et petite icône d'action posée sur l'icône de
// l'outil). Servi par le backend (core/registre_outils.py:VERBES_ACTIONS,
// clé "verbes_actions" de GET /api/outils/registre) : un nouveau verbe = une
// ligne côté backend, rien à toucher ici.
export type VerbesActions = Record<string, typeof Search>;

type RegistreOutils = { outils: OutilAffichage[]; verbes: VerbesActions };

// Comme resoudreIcone, mais sans repli sur Wrench : une petite icône
// inconnue ne s'affiche pas du tout plutôt que d'afficher une clé à molette
// trompeuse dans le coin (la règle est "pas de petite icône si le sens n'est
// pas reconnu").
function resoudreSousIcone(nomIcone: string): typeof Search | null {
  return (IconesLucide as unknown as Record<string, typeof Search>)[nomIcone] ?? null;
}

let promesseRegistre: Promise<RegistreOutils> | null = null;

async function chargerRegistreOutilsAvecRepli(): Promise<RegistreOutils> {
  const NB_TENTATIVES = 3;
  for (let tentative = 0; tentative < NB_TENTATIVES; tentative++) {
    try {
      const reponse = (await lireRegistreOutils()) as {
        outils: OutilBrut[];
        verbes_actions?: Record<string, { icone: string }>;
      };
      const verbes: VerbesActions = {};
      for (const [verbe, { icone }] of Object.entries(reponse.verbes_actions ?? {})) {
        const composant = resoudreSousIcone(icone);
        if (composant) verbes[verbe] = composant;
      }
      return {
        outils: reponse.outils.map((o) => ({
          nom: o.nom,
          label: o.label,
          Icone: resoudreIcone(o.icone),
          onglet: o.onglet,
          appli: o.appli,
        })),
        verbes,
      };
    } catch {
      if (tentative < NB_TENTATIVES - 1) {
        await new Promise((resoudre) => setTimeout(resoudre, 400 * (tentative + 1)));
      }
    }
  }
  // Secours (2026-08-15) : si le backend reste injoignable après 3
  // tentatives au chargement du chat, on retombe sur cette liste figée
  // ci-dessous plutôt que de casser le menu Outils -- un outil ajouté
  // depuis ce figeage manquerait juste d'icône/libellé ce jour-là, rien
  // d'autre ne casse. Voir OUTILS_DISPONIBLES plus bas dans ce fichier.
  // Sans le backend, aucune petite icône d'action (verbes vide).
  return { outils: OUTILS_DISPONIBLES, verbes: {} };
}

/**
 * Source vivante des outils (nom, label, icône, onglet, appli), chargée
 * une seule fois depuis le backend (core/registre_outils.py) et partagée
 * entre tous les composants qui l'appellent (BarreDeSaisie.tsx,
 * OutilResultatBulle.tsx) -- `promesseRegistre` ci-dessus est un cache
 * au niveau du module, pas par composant : un seul appel réseau pour
 * toute la session, quel que soit le nombre de composants qui utilisent
 * ce hook. Ajouter un outil = une seule ligne dans le registre backend,
 * plus rien à toucher ici (c'est tout le sens de ce hook).
 */
export function useOutilsRegistre(): { outils: OutilAffichage[]; verbes: VerbesActions; charge: boolean } {
  const [outils, setOutils] = useState<OutilAffichage[]>(OUTILS_DISPONIBLES);
  const [verbes, setVerbes] = useState<VerbesActions>({});
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    let actif = true;
    if (!promesseRegistre) promesseRegistre = chargerRegistreOutilsAvecRepli();
    promesseRegistre.then((registre) => {
      if (actif) {
        setOutils(registre.outils);
        setVerbes(registre.verbes);
        setCharge(true);
      }
    });
    return () => {
      actif = false;
    };
  }, []);

  return { outils, verbes, charge };
}

// Petite icône d'action d'une ligne d'outil (24/09/2026, demande Bourama).
// Deux sources, dans cet ordre :
// - l'action de l'appel (outil à actions : bibliothèque, dossiers, skills...),
//   ex. "chercher_par_contenu" -> loupe ;
// - sinon, seulement pour un outil d'appli connectée (champ `appli` du
//   registre : Notion, GitHub, Drive), le verbe lu dans son nom, ex.
//   "notion-search" -> loupe, "create_file" -> plus.
// Premier mot reconnu l'emporte. Aucun mot reconnu, ou verbes pas encore
// chargés : null, donc pas de petite icône (jamais une icône devinée).
export function sousIconePour(
  action: string | undefined,
  nomOutil: string | undefined,
  appli: string | undefined,
  verbes: VerbesActions,
): typeof Search | null {
  const texte = action || (appli ? nomOutil : undefined);
  if (!texte) return null;
  for (const mot of texte.replace(/-/g, "_").split("_")) {
    if (verbes[mot]) return verbes[mot];
  }
  return null;
}

// Icône principale d'une ligne d'outil. Un outil d'appli connectée porte
// l'icône de son appli (Notion, GitHub, Drive), c'est la petite icône qui dit
// ce qu'il y fait ; tous les autres gardent l'icône de leur entrée du
// registre. Pour un outil à actions, l'entrée composite "outil:action"
// (ex. "Catalogue public") prime sur l'entrée de l'outil, comme pour le
// libellé côté backend.
export function iconePrincipalePour(
  outils: OutilAffichage[],
  nomOutil: string | undefined,
  action: string | undefined,
): { Icone: typeof Search; appli?: string } {
  const entree =
    (action ? outils.find((o) => o.nom === `${nomOutil}:${action}`) : undefined) ??
    outils.find((o) => o.nom === nomOutil);
  if (entree?.appli) {
    const appli = APPLIS_DISPONIBLES.find((a) => a.nom === entree.appli);
    if (appli) return { Icone: appli.Icone, appli: entree.appli };
  }
  return { Icone: entree?.Icone ?? Wrench, appli: entree?.appli };
}

export const OUTILS_DISPONIBLES: { nom: string; label: string; Icone: typeof Search; onglet: OngletOutil; appli?: string }[] = [
  { nom: "generer_document", label: "Générer un PDF/texte", Icone: FileText, onglet: "generer" },
  { nom: "generer_document_word", label: "Générer un Word", Icone: FileType, onglet: "generer" },
  { nom: "generer_document_excel", label: "Générer un Excel", Icone: FileSpreadsheet, onglet: "generer" },
  { nom: "generer_document_powerpoint", label: "Générer un PowerPoint", Icone: Presentation, onglet: "generer" },
  { nom: "generer_code", label: "Générer du code", Icone: Code, onglet: "generer" },
  { nom: "generer_site_zip", label: "Générer un site (zip)", Icone: Package, onglet: "generer" },
  { nom: "generer_bundle", label: "Générer une archive", Icone: Archive, onglet: "generer" },
  { nom: "generer_image", label: "Générer une image", Icone: IconImage, onglet: "generer" },
  { nom: "calculer_symbolique", label: "Calcul symbolique (résoudre, dériver, intégrer)", Icone: Divide, onglet: "generer" },

  { nom: "tavily_search", label: "Recherche web", Icone: Search, onglet: "rechercher" },
  { nom: "tavily_extract", label: "Extraire une page", Icone: FileSearch, onglet: "rechercher" },
  { nom: "tavily_crawl", label: "Explorer un site", Icone: Globe, onglet: "rechercher" },
  { nom: "tavily_map", label: "Cartographier un site", Icone: Map, onglet: "rechercher" },
  { nom: "tavily_research", label: "Recherche approfondie", Icone: BookOpen, onglet: "rechercher" },
  // "chercher_fichier" retiré le 14/09/2026 (outil backend cassé,
  // remplacé par gerer_fichier_conversation, non cliquable)
  // gerer_document_bibliotheque (2026-08-01, nouvelle section "Mon espace" ->
  // Bibliothèque ; consolidé le 26/08, ex consulter_bibliotheque + 11
  // autres outils fusionnés en un seul avec un paramètre `action`, voir
  // serveur_mcp_generation.py côté backend) -- contrairement à tous les
  // autres outils de ce fichier, toujours autorisé pour n'importe quel
  // agent dès qu'un utilisateur est connecté (voir core/mcp_tools.py côté
  // backend, PAS configurable par le créateur d'agent) : la bibliothèque
  // est personnelle à l'utilisateur, pas liée à un agent précis.
  { nom: "gerer_document_bibliotheque", label: "Consulter ma bibliothèque", Icone: Library, onglet: "rechercher" },
  // gerer_fichier_conversation (14/09/2026) volontairement absent d'ici :
  // pas cliquable manuellement, son icône/label vient du registre vivant
  // chargé depuis le backend (voir OutilResultatBulle.tsx, useOutilsRegistre),
  // comme tout autre outil onglet=None -- OUTILS_DISPONIBLES est réservé
  // aux outils déclenchables à la main dans BarreDeSaisie.

  { nom: "gerer_depot_github", label: "Dépôt GitHub", Icone: Github, onglet: "action_app", appli: "github" },
  // Notion activé à 100% côté backend (01/08, demande Bourama, voir
  // registre_outils.py) -- une icône PAR outil désormais (01/08, demande
  // Bourama : "regarde comment pour github ça fonctionne"), même
  // granularité 1:1 que les 3 entrées GitHub ci-dessus, plutôt qu'un
  // point d'entrée unique. Sans ça, le bouton Outils ne pouvait jamais
  // envoyer au LLM que notion-search : une entrée = un vrai nom d'outil
  // du serveur MCP Notion (voir liste dans core/registre_outils.py),
  // c'est cette correspondance exacte qui rend l'outil sélectionnable.
  { nom: "notion-search", label: "Rechercher dans Notion", Icone: IconeNotion, onglet: "action_app", appli: "notion" },
  { nom: "notion-fetch", label: "Ouvrir une page/base Notion", Icone: FileSearch, onglet: "action_app", appli: "notion" },
  { nom: "notion-query-data-sources", label: "Interroger une base Notion (SQL)", Icone: Table2, onglet: "action_app", appli: "notion" },
  { nom: "notion-query-database-view", label: "Interroger une vue Notion", Icone: LayoutGrid, onglet: "action_app", appli: "notion" },
  { nom: "notion-query-meeting-notes", label: "Chercher dans mes notes de réunion", Icone: StickyNote, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-comments", label: "Lire les commentaires Notion", Icone: MessagesSquare, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-async-task", label: "Suivre une tâche Notion en cours", Icone: Clock, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-teams", label: "Lister les équipes Notion", Icone: Users, onglet: "action_app", appli: "notion" },
  { nom: "notion-get-users", label: "Lister les utilisateurs Notion", Icone: UserCog, onglet: "action_app", appli: "notion" },
  { nom: "notion-download-attachment", label: "Télécharger une pièce jointe Notion", Icone: Download, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-pages", label: "Créer une page Notion", Icone: FilePlus, onglet: "action_app", appli: "notion" },
  { nom: "notion-update-page", label: "Modifier une page Notion", Icone: Edit3, onglet: "action_app", appli: "notion" },
  { nom: "notion-move-pages", label: "Déplacer une page Notion", Icone: Move, onglet: "action_app", appli: "notion" },
  { nom: "notion-duplicate-page", label: "Dupliquer une page Notion", Icone: Copy, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-database", label: "Créer une base Notion", Icone: Database, onglet: "action_app", appli: "notion" },
  { nom: "notion-update-data-source", label: "Modifier le schéma d'une base Notion", Icone: Settings2, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-comment", label: "Commenter dans Notion", Icone: MessageSquare, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-attachment", label: "Joindre un fichier dans Notion", Icone: Paperclip, onglet: "action_app", appli: "notion" },
  { nom: "notion-create-view", label: "Créer une vue Notion", Icone: PanelsTopLeft, onglet: "action_app", appli: "notion" },
  { nom: "notion-update-view", label: "Modifier une vue Notion", Icone: SlidersHorizontal, onglet: "action_app", appli: "notion" },

  { nom: "planifier_rappel", label: "Planifier un rappel", Icone: Bell, onglet: "utilitaires" },
  // Actions locales (2026-07-28, refonte barre de saisie demandée par
  // Bourama) -- ces 4 entrées ne sont PAS des outils envoyés au backend
  // pour le tool-calling du modèle (contrairement à tout ce qui précède
  // dans cette liste) : ce sont d'anciennes icônes autonomes de la barre
  // (localisation, éditeur formule, recherche web forcée, dessin) qui
  // rejoignent désormais la même liste "Outils" pour libérer de la place.
  // Préfixe "ui_" utilisé comme marqueur de traitement spécial -- voir
  // estOutilActif/executerActionOutil dans BarreDeSaisie.tsx, qui
  // interceptent ce préfixe pour un traitement local (dessin, formule...)
  // au lieu d'un vrai appel outil backend.
  { nom: "ui_localisation", label: "Joindre ma position", Icone: MapPin, onglet: "utilitaires" },
  { nom: "ui_formule", label: "Insérer une formule / réaction chimique", Icone: Sigma, onglet: "utilitaires" },
  // Éditeur riche à part (01/08, demande Bourama : "un vrai éditeur latex
  // live, comme barre de saisie à part, pas touche au clavier existant")
  // -- distinct de ui_formule ci-dessus (popup une seule formule) : un
  // vrai document TipTap mélangeant texte et plusieurs formules live à la
  // suite, voir components/chat/EditeurMathsRiche.tsx.
  { nom: "ui_editeur_maths", label: "Éditeur maths live (texte + formules)", Icone: Calculator, onglet: "utilitaires" },
  { nom: "ui_recherche", label: "Forcer une recherche web", Icone: Search, onglet: "utilitaires" },
  { nom: "ui_dessin", label: "Dessiner (géométrie, graphe, croquis)", Icone: PenLine, onglet: "utilitaires" },
  // Retiré de la barre comme bouton dédié le 28/07 (Bourama) : n'était
  // pas branché ("Pas disponible pour le moment" au clic), déplacé ici
  // en attendant une vraie implémentation.
  { nom: "ui_mode_vocal", label: "Mode vocal (bientôt disponible)", Icone: AudioLines, onglet: "utilitaires" },
];

// "utilitaires" retiré de cette liste le 01/08 (demande Bourama : "les
// utilitaires seront un autre bouton à part, plus dans outils") -- ces 9
// entrées (onglet: "utilitaires" dans OUTILS_DISPONIBLES ci-dessus)
// n'apparaissent donc plus comme onglet du menu Outils, mais sont
// rendues par leur propre bouton dédié dans BarreDeSaisie.tsx (filtre
// direct sur onglet === "utilitaires"). Le type OngletOutil et le champ
// onglet de OUTILS_DISPONIBLES restent la source unique partagée avec
// BulleMessage.tsx / OutilResultatBulle.tsx / app/dashboard/applications/page.tsx,
// même après la suppression du tableau ONGLETS_OUTILS ci-dessous
// (2026-08-20, nettoyage) : ce tableau ne servait qu'à afficher la barre
// d'onglets du menu Outils manuel, retiré entièrement (mort depuis le
// kill-switch AFFICHER_BOUTON_OUTILS du 13/08, remplacé par le routeur
// automatique côté backend pour l'agent clovis).

// Liste "Appli" (2026-07-28) -- pendant symétrique à OUTILS_DISPONIBLES,
// mais réservée à ce qui nécessite une connexion/authentification
// utilisateur (OAuth, session tierce...). Notion ajouté le 01/08 (deuxième
// entrée) -- la structure était déjà prête à en accueillir d'autres sans
// retoucher la logique de récence/slot variable de BarreDeSaisie.tsx. Sert
// aussi de source pour les en-têtes de groupe (icône + nom) de l'onglet
// "Action dans l'app" ci-dessus, via le champ `appli` des entrées de
// OUTILS_DISPONIBLES -- et pour app/dashboard/applications/page.tsx (liste
// des applis connectables).
export const APPLIS_DISPONIBLES: { nom: string; label: string; Icone: typeof Github }[] = [
  { nom: "github", label: "GitHub", Icone: Github },
  // BookOpen (icône générique) remplacée par le vrai logo Notion (01/08,
  // demande Bourama) -- même logique que Github juste au-dessus : le
  // trait suit la couleur du bouton (text-dj-accent-1 / text-dj-texte-muet),
  // jamais une couleur de marque figée. Voir components/icons/IconeNotion.tsx.
  { nom: "notion", label: "Notion", Icone: IconeNotion },
  // Ajouté 01/09 (demande Bourama) -- icône générique HardDrive plutôt
  // qu'un logo Drive redessiné à la main (pas de moyen de vérifier
  // visuellement un tracé SVG avant mise en prod) : à remplacer par un
  // vrai logo (même logique que IconeNotion.tsx) si besoin plus tard.
  { nom: "google_drive", label: "Google Drive", Icone: HardDrive },
];
