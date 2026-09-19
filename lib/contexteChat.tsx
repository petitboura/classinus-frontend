"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageAffiche } from "@/components/chat/BulleMessage";
import { appelerApi, lireOutilsChatAgent } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";

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
};

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
};

// L'état du chat flottant (fermee/mini/plein_ecran) vivait auparavant
// dans ChatFlottant.tsx lui-même. Remonté ici dans AppShell.tsx pour
// pouvoir être piloté depuis d'autres écrans (ex: bouton "Ouvrir le
// chat" sur l'écran d'accueil, 16/08/2026) -- ChatFlottant devient un
// composant contrôlé (etat + setEtat reçus en props).
export const ContexteChat = createContext<ContexteChatValeur | null>(null);

// Durée du fondu de fermeture -- doit rester synchronisée avec la
// transition CSS (duration-200) appliquée dans ChatFlottant.tsx sur les
// classes de sortie (opacity-0 scale-95).
const DUREE_FERMETURE_MS = 200;

// Fournisseur de la valeur de contexte, monté une seule fois dans
// AppShell.tsx (même esprit que useFournirFenetres dans
// contexteFenetres.tsx) -- centralise l'état ET le mécanisme de fondu de
// fermeture, pour que tout composant sous ContexteChat.Provider (chat
// lui-même, tiroir mobile, popups de sections) ferme le chat exactement
// de la même façon.
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
  const [texteInitialConversation, setTexteInitialConversation] = useState<string | null>(null);

  // Étape 2 (07/09/2026, chantier "chat plein écran = vraie section") :
  // ce chargement initial (détail agent + outils + historique) vivait
  // avant dans ChatFlottant.tsx, monté une seule fois au niveau du
  // layout. Déplacé ici, dans le fournisseur de contexte lui-même
  // (également monté une seule fois dans AppShell.tsx), pour qu'il ne
  // se déclenche qu'UNE FOIS quel que soit le nombre de composants qui
  // liront ce contexte ensuite (ChatFlottant.tsx aujourd'hui, la future
  // route /chat demain) -- sans ce déplacement, une future page /chat
  // montée EN PLUS de ChatFlottant (toujours présent au niveau du
  // layout) aurait redéclenché son propre fetch en double.
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const detail: AgentDetail = await appelerApi(`/api/agents/${AGENT_INVITE_ID}`);
        const [outils, fils] = await Promise.all([
          lireOutilsChatAgent(AGENT_INVITE_ID).catch(() => ({ outils: [], actions_locales: [] })),
          appelerApi(`/api/historique/${AGENT_INVITE_ID}/conversations`).catch((e) => {
            console.error("Erreur chargement historique conversations:", e);
            return [] as FilConversation[];
          }),
        ]);
        if (!annule) {
          setAgent(detail);
          setOutilsActifsAgent(outils);
          setHistorique(fils as FilConversation[]);
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

  const fermerAvecFondu = useCallback(() => {
    setEnFermeture(true);
    window.setTimeout(() => {
      setEtat("fermee");
      setEnFermeture(false);
    }, DUREE_FERMETURE_MS);
  }, []);

  // 07/09/2026, même correctif préventif que useFournirContexteRetour
  // (lib/contexteRetour.tsx) : cet objet était recréé à chaque re-rendu
  // d'AppShell.tsx (qui fournit ce contexte), même quand rien ici n'avait
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
      chargement,
      erreur,
      agent,
      cle,
      messagesInitiaux,
      nbMessages,
      chargementFilConversation,
      outilsActifsAgent,
      historique,
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
    router.push("/chat");
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
    router.push("/chat");
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
