// Créé le 12/10/2026, demande Bourama : « arrêter c'est arrêter ». Couper la connexion du
// flux de /api/chat ne suffisait pas : côté serveur, les outils en cours et la boucle
// d'agent continuaient. Cet appel lève le signal d'arrêt des tours en cours du
// compte (POST /api/chat/arreter, api/chat.py). Sans attente et sans erreur visible : si
// l'appel échoue (hors ligne), la connexion du flux est de toute façon coupée.
//
// 28/10/2026 : avec `conversationId`, seul le tour de CETTE conversation est arrêté. Un travail
// qui continue en arrière plan dans une autre conversation n'est plus coupé par ce bouton.
import { appelerApi } from "./api";

export function demanderArretServeur(conversationId?: string) {
  const chemin = conversationId
    ? `/api/chat/arreter?conversation_id=${encodeURIComponent(conversationId)}`
    : "/api/chat/arreter";
  void appelerApi(chemin, { method: "POST" }).catch(() => {});
}
