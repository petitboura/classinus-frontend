// Créé le 02/10/2026, Bourama : le canal en direct, la voix et le chat
// continuent UNE seule conversation. Ce module garde ce que les tours lancés
// sans chat monté (tour direct du canal, voix sans chat) doivent savoir sur
// cette conversation : où elle en est (historique, dernier message) et laquelle
// est la bonne. Le serveur reprend l'historique envoyé par le client : sans cet
// état partagé, un tour direct repartait de zéro et, faute de parent_id,
// chaque échange devenait une "version" navigable au lieu de la suite du
// précédent.

export type MessageHistorique = {
  role: "user" | "assistant";
  content: string;
  outils?: { nomOutil: string; nomLisible: string; resultat: unknown }[];
};

// Identifiant d'un message sauvegardé, tel que le serveur le renvoie.
export type IdMessage = number | string;

type MessageDuChat = {
  id: IdMessage | null;
  role: "user" | "assistant";
  content: string;
  outilsResultats?: { nomOutil: string; nomLisible: string; resultat: unknown }[];
};

type EtatConversation = { historique: MessageHistorique[]; dernierMessageId: IdMessage | null };

export type EtatChatAffiche = { visible: boolean; conversationId: string | null };

const etats = new Map<string, EtatConversation>();
let lecteurChat: (() => EtatChatAffiche) | null = null;
let idCanal: string | null = null;
// Conversation imposée à l'activation (guide de découverte : mode activé côté
// serveur pour cet id précis) : le canal ne suit alors pas le chat.
let conversationImposee = false;
// Dernière conversation de chat vue à l'écran pendant cette session du canal :
// le canal la garde quand le chat se ferme ou se masque.
let idSuivi: string | null = null;

export function enregistrerLecteurChat(lecteur: (() => EtatChatAffiche) | null) {
  lecteurChat = lecteur;
}

// Appelé à chaque activation ou désactivation du canal : une nouvelle session
// du canal ne reprend jamais la conversation vue pendant la précédente.
export function definirConversationCanal(id: string | null, imposee = false) {
  idCanal = id;
  conversationImposee = imposee;
  idSuivi = null;
}

export function etatChatAffiche(): EtatChatAffiche {
  return lecteurChat?.() ?? { visible: false, conversationId: null };
}

// La conversation que le canal et la voix doivent continuer en ce moment :
// celle du chat affiché, sinon la dernière vue, sinon celle du canal lui même.
export function conversationActive(): string | null {
  if (conversationImposee) return idCanal;
  const chat = etatChatAffiche();
  if (chat.visible && chat.conversationId) idSuivi = chat.conversationId;
  return idSuivi ?? idCanal;
}

// Le message écrit doit-il passer par le chat ? Oui quand un chat est à
// l'écran sur la conversation qu'on continue. Une conversation imposée (guide)
// ne passe par le chat que si c'est justement celle qu'il affiche.
export function messagePasseParLeChat(): boolean {
  const chat = etatChatAffiche();
  if (!chat.visible) return false;
  return conversationImposee ? chat.conversationId === idCanal : true;
}

// Pour la voix : tant que le canal est actif, elle suit la conversation
// partagée ; sinon elle garde celle sur laquelle elle a été ouverte.
export function conversationPourVoix(conversationIdSession: string): string {
  return idCanal ? (conversationActive() ?? conversationIdSession) : conversationIdSession;
}

// Le chat recopie ici sa conversation à chaque changement, pour que les tours
// directs (chat masqué ou fermé) la poursuivent à l'identique.
export function ecrireEtatDepuisChat(conversationId: string, messages: MessageDuChat[]) {
  etats.set(conversationId, {
    historique: messages.map((m) => ({
      role: m.role,
      content: m.content,
      outils:
        m.role === "assistant" && m.outilsResultats?.length
          ? m.outilsResultats.map((r) => ({ nomOutil: r.nomOutil, nomLisible: r.nomLisible, resultat: r.resultat }))
          : undefined,
    })),
    dernierMessageId: messages[messages.length - 1]?.id ?? null,
  });
}

export function lireEtatConversation(conversationId: string): EtatConversation {
  return etats.get(conversationId) ?? { historique: [], dernierMessageId: null };
}

// Ajoute un tour direct terminé. idAssistant devient le parent du tour suivant,
// ce qui garde la conversation continue (jamais une version alternative).
export function ajouterTourDirect(
  conversationId: string,
  question: string,
  reponse: string,
  idUser: IdMessage | null,
  idAssistant: IdMessage | null
) {
  const etat = lireEtatConversation(conversationId);
  etats.set(conversationId, {
    historique: [...etat.historique, { role: "user", content: question }, { role: "assistant", content: reponse }],
    dernierMessageId: idAssistant ?? idUser ?? etat.dernierMessageId,
  });
}
