// Créé le 12/10/2026, demande Bourama : « arrêter c'est arrêter ». Couper la connexion du
// flux de /api/chat ne suffisait pas : côté serveur, les outils en cours et la boucle
// d'agent continuaient. Cet appel lève le signal d'arrêt de tous les tours en cours du
// compte (POST /api/chat/arreter, api/chat.py). Sans attente et sans erreur visible : si
// l'appel échoue (hors ligne), la connexion du flux est de toute façon coupée.
import { appelerApi } from "./api";

export function demanderArretServeur() {
  void appelerApi("/api/chat/arreter", { method: "POST" }).catch(() => {});
}
