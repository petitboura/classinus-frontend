// Couche du haut, réservée à l'agent (28/09/2026, demande Bourama) : le
// bouton du canal en direct, le bouton du journal et le curseur virtuel
// doivent rester au dessus de TOUT, plein écran et popups compris.
//
// Règle de base pour la suite : aucun autre élément de l'application ne
// doit dépasser COUCHE_MAX_APPLICATION. Tout ce qui s'ajoute (popup,
// plein écran, menu, bandeau) reste en dessous, sans avoir à revérifier
// ces trois éléments à chaque ajout.
//
// Source unique : ces valeurs sont aussi exposées comme classes Tailwind
// (z-agent-bulle, z-agent-controles, z-agent-curseur) via tailwind.config.ts.

export const COUCHE_MAX_APPLICATION = 9989;
export const COUCHE_AGENT_BULLE = 9990;
export const COUCHE_AGENT_CONTROLES = 9995;
export const COUCHE_AGENT_CURSEUR = 10000;
