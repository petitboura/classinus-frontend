"use client";

// Appels de l'avatar Napster vers le relais du backend (api/avatar_napster.py). Le navigateur ne
// connaît jamais la clé de Napster : le serveur lui donne seulement un jeton valable quelques
// secondes, avec les textes à donner à l'avatar.
// Interrupteur côté serveur : variable AVATAR_NAPSTER_ACTIF. Éteint, lireEtatAvatarNapster()
// répond « non disponible » et le mode vocal reste celui d'avant.

import { appelerApi } from "./api";

export type EtatAvatarNapster = { disponible: boolean };

export type ReglagesAvatarNapster = {
  nom_outil: string;
  consignes: string;
  description_outil: string;
  accueil: string;
  annonce_reponse: string;
  annonce_bulle: string;
  attente: string;
  suite_demande: string;
};

export type JetonAvatarNapster = ReglagesAvatarNapster & { token: string };

const ETAT_PAR_DEFAUT: EtatAvatarNapster = { disponible: false };
// Mémoire courte : l'interrupteur doit se faire sentir vite, sans retarder chaque ouverture.
const DUREE_MEMOIRE_MS = 15_000;
let memoire: { valeur: EtatAvatarNapster; lu_a: number } | null = null;

/** Dit si l'avatar peut être proposé. Toute erreur compte pour « non disponible » (sans être retenue). */
export async function lireEtatAvatarNapster(): Promise<EtatAvatarNapster> {
  if (memoire && Date.now() - memoire.lu_a < DUREE_MEMOIRE_MS) return memoire.valeur;
  try {
    const brut = (await appelerApi("/api/avatar-napster/etat")) as Partial<EtatAvatarNapster> | null;
    const valeur: EtatAvatarNapster = { disponible: brut?.disponible === true };
    memoire = { valeur, lu_a: Date.now() };
    return valeur;
  } catch {
    return ETAT_PAR_DEFAUT;
  }
}

function texte(valeur: unknown, repli: string): string {
  return typeof valeur === "string" ? valeur : repli;
}

/** Demande un jeton de connexion à usage unique et les textes de l'avatar. Lève l'erreur de l'API telle quelle. */
export async function demanderJetonAvatarNapster(): Promise<JetonAvatarNapster> {
  const brut = (await appelerApi("/api/avatar-napster/jeton", { method: "POST" })) as Partial<JetonAvatarNapster> | null;
  if (!brut || typeof brut.token !== "string" || !brut.token) throw new Error("Jeton de l'avatar absent");
  return {
    token: brut.token,
    nom_outil: texte(brut.nom_outil, "demander_a_classinus"),
    consignes: texte(brut.consignes, ""),
    description_outil: texte(brut.description_outil, ""),
    accueil: texte(brut.accueil, ""),
    annonce_reponse: texte(brut.annonce_reponse, ""),
    annonce_bulle: texte(brut.annonce_bulle, ""),
    attente: texte(brut.attente, ""),
    suite_demande: texte(brut.suite_demande, ""),
  };
}
