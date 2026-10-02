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
// Voix en direct, onde en plein écran (02/10/2026) : au dessus de tout le reste
// de l'application, mais sous les éléments de l'agent ci dessous, pour que le
// curseur de Classinus reste visible.
export const COUCHE_VOIX_PLEIN_ECRAN = 9985;
export const COUCHE_AGENT_BULLE = 9990;
export const COUCHE_AGENT_CONTROLES = 9995;
export const COUCHE_AGENT_CURSEUR = 10000;
