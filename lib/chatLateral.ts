"use client";

import { useSyncExternalStore } from "react";
import { correspondARoute, estPageChat } from "@/lib/routesApp";

// Chat collé à droite des pages (28/11/2026, demande de Bourama : sur les
// pages de l'app, sauf les paramètres, le chat ne flotte plus, il se place à
// droite, pousse la page, et on l'élargit en tirant sa barre).
//
// Ce module est la seule source de vérité de ces règles : quand le chat est
// collé, quelle largeur il a, quelles pages sont concernées. Le composant qui
// l'affiche est components/chat/CadreChatLateral.tsx, branché par
// ChatFlottant.tsx.

export const LARGEUR_CHAT_LATERAL_DEFAUT = 420;
export const LARGEUR_CHAT_LATERAL_MIN = 340;
// La page garde toujours au moins cette largeur quand on élargit le chat.
export const LARGEUR_PAGE_MIN = 360;
// Doit rester synchronisée avec la durée de fermeture du chat
// (DUREE_FERMETURE_MS dans lib/contexteChat.tsx, 200 ms) : l'ouverture est un
// peu plus lente que la fermeture, comme le volet lecteur.
export const DUREE_OUVERTURE_CHAT_MS = 280;
export const DUREE_FERMETURE_CHAT_MS = 200;

// Les éléments fixés à droite de l'écran (cloche, minuteurs, boutons de la
// bibliothèque...) se décalent de cette largeur pour ne pas passer sous le
// chat : right-[calc(1rem+var(--dj-chat-lateral,0px))]. Valeur posée sur
// <html> par ColonneChatLateral, 0 quand le chat n'est pas collé.
export const VARIABLE_LARGEUR_CHAT = "--dj-chat-lateral";
// Posé sur <html> pendant que la barre est tirée : les décalages suivent le
// doigt sans retard (voir .dj-decale-chat dans app/globals.css).
export const ATTRIBUT_CHAT_TIRE = "data-chat-glisse";

// Sous cette largeur de fenêtre (téléphone, petite fenêtre), le chat garde sa
// fenêtre flottante : une colonne collée prendrait presque tout l'écran.
const REQUETE_GRAND_ECRAN = "(min-width: 768px)";

/**
 * Vrai pour les pages où le chat peut se coller à droite : toutes celles de
 * l'app, sauf le chat lui-même (qui a sa propre interface), les paramètres et la
 * page des abonnements (où le chat reste flottant ; abonnements : demande de
 * Bourama du 28/11/2026).
 */
export function pageAccepteChatLateral(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (estPageChat(pathname)) return false;
  return !correspondARoute(pathname, "/parametres") && !correspondARoute(pathname, "/abonnements");
}

// Arrivée du chat plein écran vers une page de l'app (28/11/2026, demande de
// Bourama : quand on clique une section depuis le chat plein écran, la section
// s'ouvre à gauche et le chat est repoussé vers la droite). La barre latérale
// pose ce repère juste avant de naviguer ; le chat collé le lit à son
// apparition pour partir de toute la largeur de la fenêtre et rétrécir vers la
// droite, au lieu de sortir de 0. Un simple repère en mémoire, sans état React :
// il est posé et lu dans deux composants éloignés, à quelques instants d'écart.
// Il expire vite, pour qu'un repère resté sans suite (page qui n'accepte pas le
// chat collé, navigation annulée) ne déclenche jamais cette animation plus tard.
const DELAI_ARRIVEE_MS = 6000;
let arriveeDepuisChatLe = 0;

export function marquerArriveeDepuisChat() {
  arriveeDepuisChatLe = Date.now();
}

/** Vrai une seule fois après marquerArriveeDepuisChat (puis le repère est effacé). */
export function consommerArriveeDepuisChat(): boolean {
  const recent = arriveeDepuisChatLe > 0 && Date.now() - arriveeDepuisChatLe < DELAI_ARRIVEE_MS;
  arriveeDepuisChatLe = 0;
  return recent;
}

function abonnerEcran(rappel: () => void) {
  const media = window.matchMedia(REQUETE_GRAND_ECRAN);
  media.addEventListener("change", rappel);
  return () => media.removeEventListener("change", rappel);
}

/** Vrai quand la fenêtre est assez large pour coller le chat (suit le redimensionnement). */
export function useGrandEcranChat(): boolean {
  return useSyncExternalStore(
    abonnerEcran,
    () => window.matchMedia(REQUETE_GRAND_ECRAN).matches,
    () => false
  );
}

// Largeur choisie : gardée aussi sur l'appareil pour s'afficher tout de suite,
// avant que le profil du compte n'ait répondu. La valeur du compte (colonne
// volet_chat_largeur du profil) la remplace dès qu'elle arrive. Le stockage
// peut être indisponible (navigation privée, données bloquées) : toute lecture
// ou écriture est protégée.
const CLE_LARGEUR = "classinus.chat.largeur";

export function lireLargeurChatLocale(): number | null {
  try {
    const brut = window.localStorage.getItem(CLE_LARGEUR);
    const valeur = brut ? parseInt(brut, 10) : NaN;
    return Number.isFinite(valeur) && valeur >= LARGEUR_CHAT_LATERAL_MIN ? valeur : null;
  } catch {
    return null;
  }
}

export function ecrireLargeurChatLocale(largeur: number) {
  try {
    window.localStorage.setItem(CLE_LARGEUR, String(Math.round(largeur)));
  } catch {
    // Sans stockage, la largeur reste mémorisée par le compte seulement.
  }
}
