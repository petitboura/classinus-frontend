"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageAffiche } from "@/components/chat/BulleMessage";
import { appelerApi, lireOutilsChatAgent } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { supabase } from "@/lib/supabase";
// Chantier "demo + guide visuel" (20/09/2026) : le Guide visuel et la
// Demo tournent tous deux sur le canal en direct, voir useOuvrirDecouverteCanal
// plus bas dans ce fichier.
import { useCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { envoyerMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { ROUTES_APP } from "@/lib/routesApp";
import { useConversationEnCoursMemorisee } from "@/lib/conversationEnCoursMemorisee";

// "plein_ecran" retiré du type le 07/09/2026 (chantier "chat plein écran
// = vraie section", étape 5) : /chat est désormais une route comme les
// autres, plus un état de ce contexte -- ChatFlottant.tsx ne gère plus
// que la bulle fermée et le popup mini.
export type EtatChat = "fermee" | "mini";

const AGENT_INVITE_ID = "clovis";

// Étape 1 (07/09/2026, chantier "chat plein écran = vraie section") :
// types + état de la conversation (agent, messages, historique...)
// déplacés ici depuis ChatFlottant.tsx, où ils vivaient en state local.
// Comportement inchangé -- ChatFlottant.tsx reste le seul composant qui
// les lit/écrit pour l'instant, seule leur adresse mémoire change, pour
// qu'une future route /chat (étape 2) puisse un jour lire exactement la
// même conversation sans que ChatFlottant.tsx reste monté en permanence.
export type AgentDetail = {
  id: string;
  nom: string;
  icone_url: string | null;
  titre_accueil: string;
  sous_titre_accueil: string;
  modeles_disponibles?: { modele_id: string; label: string; distributeur: string; palier: string }[];
  modele_choisi?: string | null;
  bouton_sans_enseignant?: boolean;
  section_mes_comportements?: boolean;
};

export type FilConversation = {
  conversation_id: string | null;
  titre: string;
  derniere_activite: string;
  // Historique epingle (01/10/2026). Absent ou false = fil normal.
  epingle?: boolean;
};

// Reponse de GET /api/historique/{agent}/fils (une page de l'historique).
type PageFilsApi = {
  epingles: { conversation_id: string | null; cle: string; titre: string; derniere_activite: string; epingle: boolean }[];
  fils: { conversation_id: string | null; cle: string; titre: string; derniere_activite: string; epingle: boolean }[];
  suivant: { avant_activite: string; avant_cle: string } | null;
};
type CurseurHistorique = { avant_activite: string; avant_cle: string };

// Nombre de conversations chargees par page de l'historique.
const TAILLE_PAGE_HISTORIQUE = 20;

function cleFil(fil: { conversation_id: string | null }): string {
  return fil.conversation_id ?? "legacy";
}

// Cache local de la premiere page de l'historique : la liste s'affiche
// instantanement a l'ouverture de l'appli, puis le serveur la remet a jour
// en arriere-plan. Range par utilisateur (jamais montre a un autre compte).
const CLE_CACHE_HISTORIQUE = "classinus.historique.v1";

type CacheHistorique = { uid: string; fils: FilConversation[]; suivant: CurseurHistorique | null };

function lireCacheHistorique(uid: string): CacheHistorique | null {
  try {
    const brut = window.localStorage.getItem(CLE_CACHE_HISTORIQUE);
    if (!brut) return null;
    const cache = JSON.parse(brut) as CacheHistorique;
    return cache.uid === uid && Array.isArray(cache.fils) ? cache : null;
  } catch {
    return null;
  }
}

function ecrireCacheHistorique(cache: CacheHistorique) {
  try {
    window.localStorage.setItem(CLE_CACHE_HISTORIQUE, JSON.stringify(cache));
  } catch {
    // Stockage plein ou indisponible : le cache est facultatif.
  }
}

function versFilConversation(f: PageFilsApi["fils"][number]): FilConversation {
  return {
    conversation_id: f.conversation_id,
    titre: f.titre,
    derniere_activite: f.derniere_activite,
    epingle: f.epingle,
  };
}

type ContexteChatValeur = {
  etat: EtatChat;
  setEtat: (etat: EtatChat) => void;
  // Étape 1 -- état de la conversation, avant local à ChatFlottant.tsx.
  chargement: "chargement" | "pret" | "erreur";
  setChargement: (v: "chargement" | "pret" | "erreur") => void;
  erreur: string | null;
  setErreur: (v: string | null) => void;
  agent: AgentDetail | null;
  setAgent: (v: AgentDetail | null) => void;
  cle: string;
  setCle: (v: string) => void;
  messagesInitiaux: MessageAffiche[];
  setMessagesInitiaux: (v: MessageAffiche[]) => void;
  nbMessages: number;
  setNbMessages: (v: number) => void;
  chargementFilConversation: boolean;
  setChargementFilConversation: (v: boolean) => void;
  outilsActifsAgent: { outils: string[]; actions_locales: string[] } | null;
  setOutilsActifsAgent: (v: { outils: string[]; actions_locales: string[] } | null) => void;
  historique: FilConversation[];
  setHistorique: (v: FilConversation[]) => void;
  // Historique par pages (01/10/2026) : `historique` ne contient que les
  // pages deja chargees (plus les epingles). chargerPlusHistorique ajoute la
  // page suivante, appelee par le defilement de la liste (ListeHistorique.tsx).
  historiqueAPlus: boolean;
  chargementPlusHistorique: boolean;
  erreurPlusHistorique: boolean;
  chargerPlusHistorique: () => Promise<void>;
  // Epingler / renommer / supprimer : la liste change TOUT DE SUITE, le
  // serveur suit en arriere-plan ; si le serveur refuse, la liste revient
  // en arriere et erreurActionHistorique affiche pourquoi.
  epinglerFil: (fil: FilConversation, epingle: boolean) => void;
  renommerFil: (fil: FilConversation, titre: string) => void;
  supprimerFil: (fil: FilConversation) => void;
  erreurActionHistorique: string | null;
  texteInitialConversation: string | null;
  setTexteInitialConversation: (v: string | null) => void;
  // Fondu de fermeture (18/08/2026, demande Bourama : "le popup disparaît
  // ... brut, j'aime pas"). Remonté ici depuis ChatFlottant.tsx le
  // 30/08/2026 (audit "fermeture brutale du chat depuis le tiroir mobile")
  // -- AVANT, cette logique vivait uniquement en local dans ChatFlottant
  // (son propre bouton Fermer), et useFermerChat ci-dessous appelait
  // directement setEtat("fermee") sans fondu : deux comportements
  // différents pour fermer le même chat selon le déclencheur. Maintenant
  // partagée ici, les deux (bouton Fermer du chat ET useFermerChat)
  // passent par exactement le même mécanisme.
  enFermeture: boolean;
  fermerAvecFondu: () => void;
  // Préremplissage d'une NOUVELLE conversation (Partie 5, chantier
  // "confiance pédagogique", 06/09/2026) : un texte à déposer dans la
  // barre de saisie dès l'ouverture, sans l'envoyer -- utilisé par le
  // flux "corriger un signalement" (voir ListeCorrectionsProf.tsx et
  // useOuvrirChatAvecTexte plus bas), qui prépare le contexte pour que
  // le prof n'ait plus qu'à taper ou dicter sa correction. Consommé une
  // seule fois par ChatFlottant.tsx (setDemandePrefill(null) juste
  // après l'avoir lu), jamais réappliqué à une conversation suivante.
  demandePrefill: string | null;
  setDemandePrefill: (texte: string | null) => void;
  // 07/09/2026, bug signalé Bourama : cliquer sur une conversation
  // récente (EcranAccueil.tsx, "Activité récente") ouvrait bien le chat
  // mais ne chargeait jamais cette conversation précise -- rien ne
  // transmettait son conversation_id jusqu'à ChatFlottant.tsx (seul
  // composant qui sait charger un fil via selectionnerConversation).
  // Même esprit que demandePrefill ci-dessus, pour sélectionner une
  // conversation EXISTANTE plutôt que d'en préremplir une nouvelle.
  // Distinguer une conversation "legacy" (conversationId: null, sans
  // conversation_id réel) d'une absence de demande (pas d'objet du
  // tout) exige un objet ici plutôt qu'un simple string | null.
  demandeOuvrirConversation: { conversationId: string | null } | null;
  setDemandeOuvrirConversation: (v: { conversationId: string | null } | null) => void;
  // Guide de decouverte, etape 4 (16/09/2026, demande Bourama, voir
  // specs-guide-decouverte.md) : meme esprit que demandePrefill
  // ci-dessus, mais avec un conversation_id CHOISI PAR L'APPELANT plutot
  // qu'un id genere au hasard par ChatFlottant -- necessaire pour que
  // useOuvrirGuide() puisse activer le mode guide cote serveur (PUT
  // .../guide-actif) AVANT que ce fil existe reellement, avec le meme id
  // que celui que ChatFlottant adoptera a l'ouverture. Sans ca, le tout
  // premier message de cette conversation partirait sans guide_actif
  // encore connu du backend.
  demandeGuide: { conversationId: string; texte: string } | null;
  setDemandeGuide: (v: { conversationId: string; texte: string } | null) => void;
  // Canal en direct (19/09/2026) : messages ecrits ou dictes par l'etudiant
  // qui doivent partir comme un VRAI message du chat (aucun tour de Clovis
  // en cours pour les recevoir). File, car deux messages peuvent arriver
  // avant que le chat soit pret. Le chat monte (ChatIA) en prend un a la
  // fois via prendreMessageEnAttente, atomique (un ref, pas un state) pour
  // qu'un message ne parte jamais deux fois si deux chats sont montes.
  // nbMessagesEnAttente ne sert qu'a declencher l'effet du chat.
  nbMessagesEnAttente: number;
  deposerMessageEnAttente: (texte: string) => void;
  prendreMessageEnAttente: () => string | null;
  // Voix en direct (02/10/2026, demande Bourama) : la voix est un
  // interprète, elle ne doit pas travailler en cachette. Sa demande part
  // comme un vrai message du chat (visible en direct dans la conversation)
  // et la réponse écrite de Clovis revient à la voix, qui la résume. Un
  // chat monté se déclare prêt avec enregistrerChatPourVoix ; sans chat
  // prêt, la voix garde son ancien chemin direct vers le serveur.
  // La demande n'est confiée qu'au chat qui affiche la MÊME conversation que
  // la voix, pour ne jamais écrire dans une autre conversation.
  chatPretPourVoix: (conversationId: string) => boolean;
  // Un chat est-il à l'écran, et sur quelle conversation (null = pas encore créée).
  etatChatAffiche: () => { visible: boolean; conversationId: string | null };
  enregistrerChatPourVoix: (conversationId: string | null) => () => void;
  nbDemandesVoixEnAttente: number;
  deposerDemandeVoix: (texte: string, conversationId: string) => Promise<string>;
  prendreDemandeVoix: (conversationId: string | null) => DemandeVoixEnAttente | null;
};

// Levée quand le chat qui devait recevoir une demande de la voix disparaît
// avant de l'avoir prise (page quittée, popup fermé).
export class ChatIndisponiblePourVoix extends Error {
  constructor() {
    super("Le chat n'est plus disponible pour la voix.");
    this.name = "ChatIndisponiblePourVoix";
  }
}

// Vrai quand l'écran de l'utilisateur affiche vraiment l'appli : onglet
// visible (onglet ou fenêtre ni réduit ni masqué).
//
// Sur l'appli PC (04/10/2026, demande Bourama : la réponse ne s'affichait nulle
// part quand il parlait à Classinus depuis une autre application) : la fenêtre
// de Classinus peut rester "visible" pour le navigateur alors qu'elle est
// cachée derrière une autre application. Elle doit aussi avoir le focus, sinon
// le message ne passe pas par le chat (que personne ne regarde) et la réponse
// s'affiche dans la bulle.
function surAppliPC(): boolean {
  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  return capacitor?.getPlatform?.() === "electron";
}

function ecranVisible(): boolean {
  if (typeof document === "undefined") return true;
  if (document.visibilityState !== "visible") return false;
  return !surAppliPC() || document.hasFocus();
}

export type DemandeVoixEnAttente = {
  texte: string;
  conversationId: string;
  resoudre: (reponse: string) => void;
  rejeter: (erreur: Error) => void;
};

// L'état du chat flottant (fermee/mini/plein_ecran) vivait auparavant
// dans ChatFlottant.tsx lui-même. Remonté ici, au niveau du layout racine (InteractionGlobale.tsx), pour
// pouvoir être piloté depuis d'autres écrans (ex: bouton "Ouvrir le
// chat" sur l'écran d'accueil, 16/08/2026) -- ChatFlottant devient un
// composant contrôlé (etat + setEtat reçus en props).
export const ContexteChat = createContext<ContexteChatValeur | null>(null);

// Durée du fondu de fermeture -- doit rester synchronisée avec la
// transition CSS (duration-200) appliquée dans ChatFlottant.tsx sur les
// classes de sortie (opacity-0 scale-95).
const DUREE_FERMETURE_MS = 200;

// Fournisseur de la valeur de contexte, monté une seule fois dans
// InteractionGlobale.tsx (même esprit que useFournirFenetres dans
// contexteFenetres.tsx) -- centralise l'état ET le mécanisme de fondu de
// fermeture, pour que tout composant sous ContexteChat.Provider (chat
// lui-même, tiroir mobile, popups de sections) ferme le chat exactement
// de la même façon.
// Lecture du détail public de l'agent et de la liste de ses outils : même
// séquence au montage et après un changement de session (voir plus bas).
async function lireAgentEtOutils() {
  const detail: AgentDetail = await appelerApi(`/api/agents/${AGENT_INVITE_ID}`);
  const outils = await lireOutilsChatAgent(AGENT_INVITE_ID).catch(() => ({ outils: [], actions_locales: [] }));
  return { detail, outils };
}

export function useFournirContexteChat(): ContexteChatValeur {
  const [etat, setEtat] = useState<EtatChat>("fermee");
  const [enFermeture, setEnFermeture] = useState(false);
  const [demandePrefill, setDemandePrefill] = useState<string | null>(null);
  const [demandeOuvrirConversation, setDemandeOuvrirConversation] = useState<{ conversationId: string | null } | null>(
    null
  );
  // Guide de decouverte, etape 4 -- voir le type ci-dessus.
  const [demandeGuide, setDemandeGuide] = useState<{ conversationId: string; texte: string } | null>(null);
  const messagesEnAttenteRef = useRef<string[]>([]);
  const [nbMessagesEnAttente, setNbMessagesEnAttente] = useState(0);
  const deposerMessageEnAttente = useCallback((texte: string) => {
    messagesEnAttenteRef.current.push(texte);
    setNbMessagesEnAttente(messagesEnAttenteRef.current.length);
  }, []);
  const prendreMessageEnAttente = useCallback((): string | null => {
    const texte = messagesEnAttenteRef.current.shift() ?? null;
    setNbMessagesEnAttente(messagesEnAttenteRef.current.length);
    return texte;
  }, []);

  // Voix en direct : file des demandes de la voix, même principe que la
  // file des messages du canal (un ref atomique, le state ne sert qu'à
  // réveiller l'effet du chat).
  const demandesVoixRef = useRef<DemandeVoixEnAttente[]>([]);
  const chatsPretsVoixRef = useRef<(string | null)[]>([]);
  const [nbDemandesVoixEnAttente, setNbDemandesVoixEnAttente] = useState(0);
  // Un chat n'est prêt pour la voix que s'il est monté sur cette conversation
  // ET réellement à l'écran (onglet visible, fenêtre non réduite ni masquée).
  // Sinon la voix prend le chemin direct et la réponse reste à la voix.
  const chatPretPourVoix = useCallback(
    (conversationId: string) => chatsPretsVoixRef.current.includes(conversationId) && ecranVisible(),
    []
  );
  const etatChatAffiche = useCallback(() => {
    const ids = chatsPretsVoixRef.current;
    return { visible: ids.length > 0 && ecranVisible(), conversationId: ids.find((id) => id) ?? null };
  }, []);
  const enregistrerChatPourVoix = useCallback((conversationId: string | null) => {
    chatsPretsVoixRef.current.push(conversationId);
    return () => {
      const i = chatsPretsVoixRef.current.indexOf(conversationId);
      if (i >= 0) chatsPretsVoixRef.current.splice(i, 1);
      // Dernier chat de cette conversation parti : les demandes de la voix qui
      // l'attendaient ne seront jamais prises. On les rend à la voix, qui
      // reprend alors le chemin direct au lieu de rester bloquée.
      if (!conversationId || chatsPretsVoixRef.current.includes(conversationId)) return;
      const orphelines = demandesVoixRef.current.filter((d) => d.conversationId === conversationId);
      if (orphelines.length === 0) return;
      demandesVoixRef.current = demandesVoixRef.current.filter((d) => d.conversationId !== conversationId);
      setNbDemandesVoixEnAttente(demandesVoixRef.current.length);
      orphelines.forEach((d) => d.rejeter(new ChatIndisponiblePourVoix()));
    };
  }, []);
  const deposerDemandeVoix = useCallback((texte: string, conversationId: string) => {
    return new Promise<string>((resoudre, rejeter) => {
      demandesVoixRef.current.push({ texte, conversationId, resoudre, rejeter });
      setNbDemandesVoixEnAttente(demandesVoixRef.current.length);
    });
  }, []);
  const prendreDemandeVoix = useCallback((conversationId: string | null): DemandeVoixEnAttente | null => {
    const i = demandesVoixRef.current.findIndex((d) => d.conversationId === conversationId);
    if (i < 0) return null;
    const [demande] = demandesVoixRef.current.splice(i, 1);
    setNbDemandesVoixEnAttente(demandesVoixRef.current.length);
    return demande;
  }, []);

  // Étape 1 -- état de la conversation, avant local à ChatFlottant.tsx.
  const [chargement, setChargement] = useState<"chargement" | "pret" | "erreur">("chargement");
  const [erreur, setErreur] = useState<string | null>(null);
  const [agent, setAgent] = useState<AgentDetail | null>(null);
  const [cle, setCle] = useState(() => crypto.randomUUID());
  const [messagesInitiaux, setMessagesInitiaux] = useState<MessageAffiche[]>([]);
  const [nbMessages, setNbMessages] = useState(0);
  const [chargementFilConversation, setChargementFilConversation] = useState(false);
  const [outilsActifsAgent, setOutilsActifsAgent] = useState<{
    outils: string[];
    actions_locales: string[];
  } | null>(null);
  const [historique, setHistorique] = useState<FilConversation[]>([]);
  const [curseurHistorique, setCurseurHistorique] = useState<CurseurHistorique | null>(null);
  const [chargementPlusHistorique, setChargementPlusHistorique] = useState(false);
  const [erreurPlusHistorique, setErreurPlusHistorique] = useState(false);
  // Garde-fou contre deux chargements simultanes (le defilement peut
  // declencher plusieurs fois la meme page avant la reponse).
  const chargementPlusEnCours = useRef(false);
  const [erreurActionHistorique, setErreurActionHistorique] = useState<string | null>(null);
  const minuteurErreurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Copie a jour de la liste, pour memoriser l'ordre avant une action
  // (annulation si le serveur refuse) sans dependre d'un rendu.
  const historiqueRef = useRef<FilConversation[]>([]);
  historiqueRef.current = historique;
  const uidHistoriqueRef = useRef<string | null>(null);
  const historiqueSynchroniseRef = useRef(false);
  const [texteInitialConversation, setTexteInitialConversation] = useState<string | null>(null);

  // 04/10/2026 : la conversation affichée est retenue pour la durée de
  // l'onglet et rechargée après un rafraîchissement de page (voir
  // lib/conversationEnCoursMemorisee.ts).
  useConversationEnCoursMemorisee({
    agentId: agent?.id ?? null,
    chargement,
    cle,
    nbMessages,
    demandeEnCours:
      demandeOuvrirConversation !== null ||
      demandeGuide !== null ||
      demandePrefill !== null ||
      texteInitialConversation !== null,
    setCle,
    setMessagesInitiaux,
    setNbMessages,
    setChargementFilConversation,
  });

  // Étape 2 (07/09/2026, chantier "chat plein écran = vraie section") :
  // ce chargement initial (détail agent + outils + historique) vivait
  // avant dans ChatFlottant.tsx, monté une seule fois au niveau du
  // layout. Déplacé ici, dans le fournisseur de contexte lui-même
  // (également monté une seule fois dans InteractionGlobale.tsx), pour qu'il ne
  // se déclenche qu'UNE FOIS quel que soit le nombre de composants qui
  // liront ce contexte ensuite (ChatFlottant.tsx aujourd'hui, la future
  // route /chat demain) -- sans ce déplacement, une future page /chat
  // montée EN PLUS de ChatFlottant (toujours présent au niveau du
  // layout) aurait redéclenché son propre fetch en double.
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const { detail, outils } = await lireAgentEtOutils();
        if (!annule) {
          setAgent(detail);
          setOutilsActifsAgent(outils);
          setChargement("pret");
        }
      } catch (e) {
        if (!annule) {
          setErreur(messageErreur(e));
          setChargement("erreur");
        }
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  // Historique charge a part, en parallele du reste (avant, il attendait
  // le detail de l'agent puis les outils : liste lente a apparaitre).
  // 1) le cache local s'affiche tout de suite ; 2) la premiere page du
  // serveur le remplace des qu'elle arrive.
  useEffect(() => {
    let annule = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user.id ?? null;
      if (annule || !uid) return;
      uidHistoriqueRef.current = uid;
      const cache = lireCacheHistorique(uid);
      if (cache && !historiqueSynchroniseRef.current) {
        setHistorique(cache.fils);
        setCurseurHistorique(cache.suivant);
      }
      try {
        const page: PageFilsApi = await appelerApi(`/api/historique/${AGENT_INVITE_ID}/fils?limite=${TAILLE_PAGE_HISTORIQUE}`);
        if (annule) return;
        historiqueSynchroniseRef.current = true;
        setHistorique([...page.epingles, ...page.fils].map(versFilConversation));
        setCurseurHistorique(page.suivant);
      } catch (e) {
        console.error("Erreur chargement historique conversations:", e);
      }
    })();
    return () => {
      annule = true;
    };
  }, []);

  // Garde le cache a jour : epingles + 20 plus recents.
  useEffect(() => {
    const uid = uidHistoriqueRef.current;
    if (!uid || !historiqueSynchroniseRef.current) return;
    const recents = historique
      .filter((f) => !f.epingle)
      .sort((a, b) => Date.parse(b.derniere_activite) - Date.parse(a.derniere_activite))
      .slice(0, TAILLE_PAGE_HISTORIQUE);
    ecrireCacheHistorique({
      uid,
      fils: [...historique.filter((f) => f.epingle), ...recents],
      // Le curseur du cache designe la fin des 20 recents gardes.
      suivant:
        recents.length > 0 && (curseurHistorique !== null || historique.filter((f) => !f.epingle).length > recents.length)
          ? { avant_activite: recents[recents.length - 1].derniere_activite, avant_cle: cleFil(recents[recents.length - 1]) }
          : null,
    });
  }, [historique, curseurHistorique]);

  // Changement de session (connexion, déconnexion, changement de compte).
  // Ce fournisseur vit au niveau du layout racine : il n'est plus remonté
  // à neuf quand on passe par /connexion, donc les chargements de montage
  // ci-dessus (faits une seule fois, souvent en visiteur) ne se
  // reproduisent plus tout seuls. Sans ce relais, après une connexion sans
  // rechargement de page l'historique resterait vide et la liste d'outils
  // serait celle d'un visiteur ; après une déconnexion, l'historique et la
  // conversation de l'ancien compte resteraient visibles. Seul un vrai
  // changement d'identifiant déclenche ce relais (un simple rafraîchissement
  // de jeton ou un retour sur l'onglet ne change pas l'identifiant).
  useEffect(() => {
    let annule = false;
    let uidCourant: string | null | undefined;

    const surChangementSession = async (uid: string | null) => {
      if (annule) return;
      // Première lecture : déjà couverte par les chargements de montage.
      if (uidCourant === undefined) {
        uidCourant = uid;
        return;
      }
      if (uid === uidCourant) return;
      uidCourant = uid;

      // Tout ce qui appartenait à l'ancien compte est retiré tout de suite.
      uidHistoriqueRef.current = uid;
      historiqueSynchroniseRef.current = false;
      chargementPlusEnCours.current = false;
      setHistorique([]);
      setCurseurHistorique(null);
      setChargementPlusHistorique(false);
      setErreurPlusHistorique(false);
      setCle(crypto.randomUUID());
      setMessagesInitiaux([]);
      setNbMessages(0);
      setChargementFilConversation(false);
      setTexteInitialConversation(null);

      // Détail de l'agent (public) et outils (qui dépendent de la personne).
      try {
        const { detail, outils } = await lireAgentEtOutils();
        if (annule || uidCourant !== uid) return;
        setAgent(detail);
        setOutilsActifsAgent(outils);
        setErreur(null);
        setChargement("pret");
      } catch (e) {
        if (annule || uidCourant !== uid) return;
        setErreur(messageErreur(e));
        setChargement("erreur");
      }

      if (!uid) return;
      const cache = lireCacheHistorique(uid);
      if (cache && !historiqueSynchroniseRef.current) {
        setHistorique(cache.fils);
        setCurseurHistorique(cache.suivant);
      }
      try {
        const page: PageFilsApi = await appelerApi(`/api/historique/${AGENT_INVITE_ID}/fils?limite=${TAILLE_PAGE_HISTORIQUE}`);
        if (annule || uidCourant !== uid) return;
        historiqueSynchroniseRef.current = true;
        setHistorique([...page.epingles, ...page.fils].map(versFilConversation));
        setCurseurHistorique(page.suivant);
      } catch (e) {
        console.error("Erreur chargement historique conversations:", e);
      }
    };

    supabase.auth
      .getSession()
      .then(({ data }) => surChangementSession(data.session?.user.id ?? null))
      .catch(() => {});
    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
      void surChangementSession(session?.user.id ?? null);
    });
    return () => {
      annule = true;
      abonnement.subscription.unsubscribe();
    };
  }, []);

  const chargerPlusHistorique = useCallback(async () => {
    if (!curseurHistorique || chargementPlusEnCours.current) return;
    chargementPlusEnCours.current = true;
    setChargementPlusHistorique(true);
    setErreurPlusHistorique(false);
    try {
      const params = new URLSearchParams({
        limite: String(TAILLE_PAGE_HISTORIQUE),
        avant_activite: curseurHistorique.avant_activite,
        avant_cle: curseurHistorique.avant_cle,
      });
      const page: PageFilsApi = await appelerApi(`/api/historique/${AGENT_INVITE_ID}/fils?${params.toString()}`);
      setHistorique((precedent) => {
        // Un fil deja present (cree localement, ou desepingle entre deux
        // pages) ne doit jamais apparaitre deux fois.
        const deja = new Set(precedent.map(cleFil));
        return [...precedent, ...page.fils.map(versFilConversation).filter((f) => !deja.has(cleFil(f)))];
      });
      setCurseurHistorique(page.suivant);
    } catch (e) {
      console.error("Erreur chargement de la suite de l'historique:", e);
      setErreurPlusHistorique(true);
    } finally {
      chargementPlusEnCours.current = false;
      setChargementPlusHistorique(false);
    }
  }, [curseurHistorique]);

  function signalerErreurAction(e: unknown) {
    setErreurActionHistorique(messageErreur(e));
    if (minuteurErreurRef.current) clearTimeout(minuteurErreurRef.current);
    minuteurErreurRef.current = setTimeout(() => setErreurActionHistorique(null), 6000);
  }

  // Remet un fil a sa place d'avant une action refusee par le serveur.
  function restaurerFil(original: FilConversation, indexOriginal: number) {
    setHistorique((precedent) => {
      const sansLui = precedent.filter((f) => cleFil(f) !== cleFil(original));
      sansLui.splice(Math.min(indexOriginal, sansLui.length), 0, original);
      return sansLui;
    });
  }

  const epinglerFil = useCallback(
    (fil: FilConversation, epingle: boolean) => {
      const index = historiqueRef.current.findIndex((f) => cleFil(f) === cleFil(fil));
      const original = index >= 0 ? historiqueRef.current[index] : null;
      if (!original) return;
      setHistorique((precedent) => {
        const autres = precedent.filter((f) => cleFil(f) !== cleFil(fil));
        // Un fil qu'on vient d'epingler passe en tete des epingles.
        if (epingle) return [{ ...original, epingle: true }, ...autres];
        // Desepingle plus ancien que tout ce qui est deja charge, alors
        // qu'il reste des pages : il reapparaitra en faisant defiler, a sa
        // vraie place (sinon il serait charge en double).
        if (curseurHistorique) {
          const dates = autres.filter((f) => !f.epingle).map((f) => Date.parse(f.derniere_activite));
          if (dates.length > 0 && Date.parse(original.derniere_activite) < Math.min(...dates)) return autres;
        }
        return [...autres, { ...original, epingle: false }];
      });
      appelerApi(`/api/historique/${AGENT_INVITE_ID}/fils/${cleFil(fil)}`, {
        method: "PATCH",
        body: JSON.stringify({ epingle }),
      }).catch((e) => {
        restaurerFil(original, index);
        signalerErreurAction(e);
      });
    },
    [curseurHistorique]
  );

  const renommerFil = useCallback((fil: FilConversation, titre: string) => {
    const ancienTitre = historiqueRef.current.find((f) => cleFil(f) === cleFil(fil))?.titre ?? fil.titre;
    setHistorique((precedent) => precedent.map((f) => (cleFil(f) === cleFil(fil) ? { ...f, titre } : f)));
    appelerApi(`/api/historique/${AGENT_INVITE_ID}/fils/${cleFil(fil)}`, {
      method: "PATCH",
      body: JSON.stringify({ titre }),
    }).catch((e) => {
      setHistorique((precedent) => precedent.map((f) => (cleFil(f) === cleFil(fil) ? { ...f, titre: ancienTitre } : f)));
      signalerErreurAction(e);
    });
  }, []);

  // Le fil disparait tout de suite ; la suppression definitive se fait
  // cote serveur en arriere-plan (et revient si elle echoue).
  const supprimerFil = useCallback((fil: FilConversation) => {
    const index = historiqueRef.current.findIndex((f) => cleFil(f) === cleFil(fil));
    const original = index >= 0 ? historiqueRef.current[index] : null;
    setHistorique((precedent) => precedent.filter((f) => cleFil(f) !== cleFil(fil)));
    appelerApi(`/api/historique/${AGENT_INVITE_ID}/fils/${cleFil(fil)}`, { method: "DELETE" }).catch((e) => {
      if (original) restaurerFil(original, index);
      signalerErreurAction(e);
    });
  }, []);

  const fermerAvecFondu = useCallback(() => {
    setEnFermeture(true);
    window.setTimeout(() => {
      setEtat("fermee");
      setEnFermeture(false);
    }, DUREE_FERMETURE_MS);
  }, []);

  // 07/09/2026, même correctif préventif que useFournirContexteRetour
  // (lib/contexteRetour.tsx) : cet objet était recréé à chaque re-rendu
  // d'InteractionGlobale.tsx (qui fournit ce contexte), même quand rien ici n'avait
  // réellement changé -- les fonctions setState/fermerAvecFondu sont déjà
  // stables, seules les valeurs d'état ci-dessous changent vraiment.
  // Mémoiser évite que du code dépendant de l'identité de cet objet (dans
  // un useEffect par exemple) se redéclenche pour une mauvaise raison,
  // comme ça a causé le bug corrigé dans contexteRetour.tsx.
  return useMemo(
    () => ({
      etat,
      setEtat,
      enFermeture,
      fermerAvecFondu,
      demandePrefill,
      setDemandePrefill,
      demandeOuvrirConversation,
      setDemandeOuvrirConversation,
      demandeGuide,
      setDemandeGuide,
      nbMessagesEnAttente,
      deposerMessageEnAttente,
      prendreMessageEnAttente,
      chatPretPourVoix,
      etatChatAffiche,
      enregistrerChatPourVoix,
      nbDemandesVoixEnAttente,
      deposerDemandeVoix,
      prendreDemandeVoix,
      chargement,
      setChargement,
      erreur,
      setErreur,
      agent,
      setAgent,
      cle,
      setCle,
      messagesInitiaux,
      setMessagesInitiaux,
      nbMessages,
      setNbMessages,
      chargementFilConversation,
      setChargementFilConversation,
      outilsActifsAgent,
      setOutilsActifsAgent,
      historique,
      setHistorique,
      historiqueAPlus: curseurHistorique !== null,
      chargementPlusHistorique,
      erreurPlusHistorique,
      chargerPlusHistorique,
      epinglerFil,
      renommerFil,
      supprimerFil,
      erreurActionHistorique,
      texteInitialConversation,
      setTexteInitialConversation,
    }),
    [
      etat,
      enFermeture,
      fermerAvecFondu,
      demandePrefill,
      demandeOuvrirConversation,
      demandeGuide,
      nbMessagesEnAttente,
      deposerMessageEnAttente,
      prendreMessageEnAttente,
      chatPretPourVoix,
      etatChatAffiche,
      enregistrerChatPourVoix,
      nbDemandesVoixEnAttente,
      deposerDemandeVoix,
      prendreDemandeVoix,
      chargement,
      erreur,
      agent,
      cle,
      messagesInitiaux,
      nbMessages,
      chargementFilConversation,
      outilsActifsAgent,
      historique,
      curseurHistorique,
      chargementPlusHistorique,
      erreurPlusHistorique,
      chargerPlusHistorique,
      epinglerFil,
      renommerFil,
      supprimerFil,
      erreurActionHistorique,
      texteInitialConversation,
    ]
  );
}

// Partie 5 (06/09/2026) : ouvre le chat plein écran sur une NOUVELLE
// conversation préremplie avec `texte` -- seul point d'entrée de ce
// mécanisme, pour que tout futur appelant (pas seulement
// ListeCorrectionsProf.tsx) passe par le même chemin plutôt que de
// manipuler etat/demandePrefill séparément et risquer de les désynchroniser.
export function useOuvrirChatAvecTexte() {
  const ctx = useContext(ContexteChat);
  const router = useRouter();
  // 07/09/2026 (chantier "chat plein écran = vraie section", étape 5,
  // demande Bourama : "tout va vers /chat tout") : navigue vers la
  // vraie route /chat au lieu de passer etat sur "plein_ecran" (état
  // retiré, voir EtatChat ci-dessus). fermerAvecFondu d'abord : si un
  // popup mini était déjà ouvert, il ne doit pas rester affiché
  // par-dessus la page /chat, même mécanique que fermerMiniAvantNavigation
  // (ChatFlottant.tsx) et l'action Cmd+K (PaletteCommandes.tsx).
  return (texte: string) => {
    ctx?.setDemandePrefill(texte);
    ctx?.fermerAvecFondu();
    router.push(ROUTES_APP.chat);
  };
}

// Guide de decouverte, etape 4 (16/09/2026, demande Bourama, voir
// specs-guide-decouverte.md dans ce depot). Toujours une NOUVELLE
// conversation dediee (meme choix que useOuvrirChatAvecTexte
// ci-dessus, pour la meme raison : un parcours du guide n'a rien a
// faire mele au fil de devoirs en cours) -- id genere ICI plutot que
// laisse a nouvelleConversation() de ChatFlottant.tsx, pour pouvoir
// activer le mode guide cote serveur (PUT .../guide-actif) AVANT que
// ChatFlottant.tsx n'adopte ce meme id (voir demandeGuide plus haut).
// Le mode guide reste actif sur cette conversation cote serveur tant
// que rien ne le desactive explicitement (aucun mecanisme de
// desactivation encore construit a cette etape -- voir
// specs-guide-decouverte.md, "ce qui n'est pas encore traite").
export function useOuvrirGuide() {
  const ctx = useContext(ContexteChat);
  const router = useRouter();
  return async () => {
    const conversationId = crypto.randomUUID();
    try {
      await appelerApi(`/api/conversations/${conversationId}/guide-actif`, {
        method: "PUT",
        body: JSON.stringify({ actif: true }),
      });
    } catch (e) {
      // Un utilisateur non connecte (chat anonyme, voir 02-chat.md de la
      // base de connaissance) n'a pas de session -- la route exige un
      // utilisateur authentifie (meme limite que persona_pedagogique).
      // On ouvre quand meme le chat normalement plutot que de bloquer le
      // clic : Classinus repondra sans le mode guide actif dans ce cas.
      console.error("Erreur activation guide de decouverte:", e);
    }
    ctx?.setDemandeGuide({ conversationId, texte: "Lance le guide de découverte de Classinus." });
    ctx?.fermerAvecFondu();
    router.push(ROUTES_APP.chat);
  };
}

// Démo (20/09/2026, décision Bourama : "la démo se passe dans le chat
// normal et ouvre le canal seulement quand il est temps de lui démontrer
// lui") : même mécanisme que useOuvrirGuide ci-dessus (nouvelle
// conversation dédiée, mode activé côté serveur avant que le chat
// n'adopte le même id, texte initial envoyé dans le chat normal), avec
// sous_mode "demo". Le canal en direct n'est PAS activé ici : c'est
// Clovis qui le demande plus tard (outil ouvrir_canal_en_direct côté
// backend, reçu par lib/canalAgentApplicatif.ts).
export function useOuvrirDemo() {
  const ctx = useContext(ContexteChat);
  const router = useRouter();
  return async () => {
    const conversationId = crypto.randomUUID();
    try {
      await appelerApi(`/api/conversations/${conversationId}/guide-actif`, {
        method: "PUT",
        body: JSON.stringify({ actif: true, sous_mode: "demo" }),
      });
    } catch (e) {
      // Même choix que useOuvrirGuide : un utilisateur non connecté n'a
      // pas de session, on ouvre quand même le chat plutôt que de
      // bloquer le clic (Classinus répondra sans le mode démo).
      console.error("Erreur activation démo:", e);
    }
    ctx?.setDemandeGuide({ conversationId, texte: "Lance la démo de Classinus." });
    ctx?.fermerAvecFondu();
    router.push(ROUTES_APP.chat);
  };
}

// Chantier "demo + guide visuel" (20/09/2026, demande Bourama, voir
// specs-demo-decouverte.md dans clovis-frontend) : ouvre le Guide visuel,
// porté par le canal en direct (curseur + bulle par-dessus l'appli, voir
// lib/contexteCanalEnDirect.tsx) plutôt que par le panneau de chat
// classique -- même raison technique que le canal en direct "assistant
// autonome" : canal_en_direct doit valoir true dès le tout premier
// message pour que les outils de clic soient forcés (voir core/main.py,
// condition `if canal_en_direct:`), ce que seule une session du canal
// sait faire, pas une conversation de chat normale. D'où ce hook séparé
// de useOuvrirGuide ci-dessus (qui, lui, reste sur le chat classique
// pour le guide textuel -- comportement inchangé). La Démo n'utilise
// plus ce hook (voir useOuvrirDemo ci-dessus).
//
// Même id choisi AVANT activation que useOuvrirGuide, pour pouvoir
// activer le mode découverte côté serveur (PUT .../guide-actif, avec
// sous_mode cette fois) avec ce même id avant que le canal envoie son
// tout premier message (canal.activer(conversationId), puis
// envoyerMessageEtudiant déclenche ce premier message, voir
// lib/canalAgentApplicatif.ts).
export function useOuvrirDecouverteCanal() {
  const canal = useCanalEnDirect();
  return async (sousMode: "visuel") => {
    const conversationId = crypto.randomUUID();
    try {
      await appelerApi(`/api/conversations/${conversationId}/guide-actif`, {
        method: "PUT",
        body: JSON.stringify({ actif: true, sous_mode: sousMode }),
      });
    } catch (e) {
      // Même choix que useOuvrirGuide ci-dessus : un utilisateur non
      // connecté n'a pas de session, la route exige un utilisateur
      // authentifié. On active quand même le canal plutôt que de
      // bloquer le clic -- Classinus répondra sans le mode découverte
      // actif dans ce cas (comportement normal du canal en direct).
      console.error("Erreur activation découverte (canal):", e);
    }
    canal.activer(conversationId);
    const texte = "Lance le guide de découverte visuel de Classinus.";
    // setTimeout(0) volontaire, pas un oubli : canal.activer() ci-dessus
    // ne fait que programmer les setState (actif, conversationId) --
    // envoyerMessageEtudiant lit conversationId via obtenirConversationIdCanal
    // (lib/canalAgentApplicatif.ts), qui lit le pont canalGlobal, lui-même
    // mis à jour par l'effet enregistrerCanalEnDirect de InteractionGlobale.tsx
    // (déclenché par ce même setState). Un appel synchrone ici lirait
    // encore l'ancienne valeur (null) et échouerait silencieusement. Le
    // report d'un tick (après le prochain rendu + effets passifs de
    // React, garanti avant tout setTimeout(0)) laisse le pont se mettre
    // à jour avant l'envoi du tout premier message.
    setTimeout(() => envoyerMessageEtudiant(texte), 0);
  };
}

export function useOuvrirChat() {
  const ctx = useContext(ContexteChat);
  // 30/08/2026, demande Bourama : sur mobile (natif et web), l'onglet
  // "Chat" de la barre du bas doit ouvrir directement le plein écran,
  // plus de petit popup "mini" intermédiaire, ce format n'a plus de sens
  // maintenant que les deux plateformes ont leur propre onglet dédié
  // (voir BarreOngletsNative.tsx/BarreOngletsWeb.tsx). Reste "mini" par
  // défaut pour les autres déclencheurs (bulle flottante desktop,
  // bouton "Ouvrir le chat" de EcranAccueil.tsx), non concernés par
  // cette demande.
  return (etat: EtatChat = "mini") => ctx?.setEtat(etat);
}

// 07/09/2026, bug signalé Bourama : cliquer sur une conversation
// récente dans "Activité récente" (EcranAccueil.tsx) ouvrait le chat
// mais ne chargeait rien -- ouvrirChat() ci-dessus n'a jamais eu de
// notion de QUELLE conversation ouvrir. Dépose l'id demandé dans le
// contexte partagé (demandeOuvrirConversation) puis ouvre le chat en
// mini (même format que le bouton "Ouvrir le chat" de EcranAccueil) --
// consommé par ChatFlottant.tsx, seul composant qui sait charger un fil
// via selectionnerConversation, une fois l'agent chargé.
export function useOuvrirConversation() {
  const ctx = useContext(ContexteChat);
  return (conversationId: string | null) => {
    ctx?.setDemandeOuvrirConversation({ conversationId });
    ctx?.setEtat("mini");
  };
}

// 27/09/2026, chantier "éditeur de code du Bureau", pont retour éditeur
// -> chat (voir components/bureau/EditeurCode.tsx) : équivalents plein
// écran (route /chat) des deux hooks ci-dessus/de nouvelleConversation()
// -- ceux du dessus ouvrent la popup mini (Activité récente), pas
// utilisables ici puisque l'éditeur est une vraie page à part, pas montée
// sous ChatFlottant.tsx. Consommés par l'effet ajouté dans
// ChatSection.tsx (même esprit que celui de ChatFlottant.tsx un peu plus
// haut dans ce fichier pour demandeOuvrirConversation).
export function useOuvrirConversationPleinEcran() {
  const ctx = useContext(ContexteChat);
  const router = useRouter();
  // 27/09/2026, demande Bourama : depuis l'éditeur, le code doit arriver
  // comme BROUILLON dans la conversation d'origine (pas envoyé) --
  // texteInitial optionnel, lu par la barre de saisie au montage (voir
  // ChatSection.tsx, qui le vide en quittant la page).
  return (conversationId: string | null, texteInitial?: string) => {
    ctx?.setTexteInitialConversation(texteInitial ?? null);
    ctx?.setDemandeOuvrirConversation({ conversationId });
    router.push(ROUTES_APP.chat);
  };
}

// 27/09/2026, demande Bourama (retour de test du chantier "pont
// éditeur -> chat") : "Vers le chat" n'emmenait jamais le code, seule la
// navigation avait lieu. `texteInitial` optionnel dépose le texte dans
// texteInitialConversation (même champ lu par ChatIA via demandePrefill/
// ChatFlottant.tsx, voir plus haut) avant la navigation -- ce hook fait
// déjà lui-même la réinitialisation de conversation, pas besoin de
// passer par demandePrefill + son effet (ChatFlottant uniquement).
export function useNouvelleConversationPleinEcran() {
  const ctx = useContext(ContexteChat);
  const router = useRouter();
  return (texteInitial?: string) => {
    ctx?.setCle(crypto.randomUUID());
    ctx?.setMessagesInitiaux([]);
    ctx?.setNbMessages(0);
    ctx?.setTexteInitialConversation(texteInitial ?? null);
    router.push(ROUTES_APP.chat);
  };
}

// 30/08/2026, tiroir mobile du chat plein écran (AppSidebar.tsx,
// contexteChat=true) : les liens du "Plus" repris de BlocsMenuPlus qui
// n'ont pas d'id de section (Accueil, Paramètres, Rappels -- pas
// d'équivalent OngletId, donc pas de fenêtre flottante possible via
// ouvrirFenetre) doivent fermer le chat avant de naviguer, sinon la
// page cible se charge derrière le chat toujours ouvert (fixed inset-0
// z-[110]) et reste invisible.
//
// Correctif (01/09/2026, signalé Bourama : "la section s'ouvre mais le
// chat est par dessus, rien ne bouge") : le fondu de fermerAvecFondu
// prend 200ms avant de basculer etat sur "fermee", pendant lesquelles le
// chat plein écran (fixed inset-0 z-[110]) reste affiché par dessus la
// page de destination, déjà chargée derrière lui par router.push.
//
// Correctif (05/09/2026, demande Bourama : "faut qu'il ne se ferme pas
// brutement") : le choix ci-dessus (fermeture instantanée, sans fondu)
// est abandonné pour fermerChatEtNaviguer (voir AppSidebar.tsx) au
// profit de useFermerChatAvecFondu juste en dessous -- pendant les 200ms
// de fondu, le chat plein écran reste affiché (opacité décroissante)
// PAR-DESSUS la page de destination déjà chargée derrière lui, ce qui
// est maintenant le comportement recherché plutôt qu'un défaut à éviter.
// useFermerChat (fermeture instantanée) reste utilisé ailleurs (ex:
// démontage sans navigation associée) là où aucun fondu n'est nécessaire.
export function useFermerChat() {
  const ctx = useContext(ContexteChat);
  return () => ctx?.setEtat("fermee");
}

// 05/09/2026, demande Bourama (voir commentaire ci-dessus) : variante
// avec fondu de useFermerChat, pour tout appelant qui ferme le chat en
// réaction à une vraie navigation déjà déclenchée (fermerChatEtNaviguer)
// -- même mécanisme que le bouton "Fermer" du chat plein écran
// (ChatFlottant.tsx), qui utilise déjà directement ctx.fermerAvecFondu.
export function useFermerChatAvecFondu() {
  const ctx = useContext(ContexteChat);
  return () => ctx?.fermerAvecFondu();
}
