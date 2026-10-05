// Créé le 03/10/2026 (demande Bourama : Réglages du canal en direct partagés avec la
// barre de saisie). Le mode pédagogique, le mode ressources et le mode actif d'une
// conversation sont enregistrés côté serveur, mais chaque bouton Réglages garde sa
// propre copie à l'écran (components/chat/barre/useReglagesPedagogiques.ts et
// useModeActif.ts). Quand le chat et le canal sont affichés en même temps, ce petit
// canal de diffusion prévient les autres copies dès qu'un choix est confirmé par le
// serveur, pour qu'ils affichent tous la même chose sans recharger.

export type ChangementReglageConversation =
  | { conversationId: string; type: "persona"; valeur: string | null }
  | { conversationId: string; type: "mode_source"; valeur: string | null }
  | { conversationId: string; type: "mode_actif"; valeur: string | null; verrouille: boolean };

type Ecouteur = (changement: ChangementReglageConversation) => void;

const ecouteurs = new Set<Ecouteur>();

export function diffuserChangementReglageConversation(changement: ChangementReglageConversation) {
  ecouteurs.forEach((ecouteur) => ecouteur(changement));
}

export function ecouterChangementsReglageConversation(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => {
    ecouteurs.delete(ecouteur);
  };
}
