"use client";

// Crayon du canal PC, lot 3 (11/10/2026, demande Bourama) : ce que l'étudiant a entouré.
// Demande au processus principal d'Electron de lire la fenêtre au premier plan avec la
// lecture d'écran existante, et de ne garder que les éléments qui tombent dans les zones
// des traits. Le résultat sert au lot 4 (phrase envoyée au grand modèle).

import { registerPlugin } from "@capacitor/core";
import { lireEtatCrayon } from "@/lib/crayonEcran";
import { zonesDesTraits, type ZonePage } from "@/lib/zonesCrayon";

export type ElementEntoure = {
  type: string;
  nom: string;
  valeur: string | null;
  valeur_masquee: boolean;
  etats: string[];
  x: number;
  y: number;
  gauche: number;
  haut: number;
  largeur: number;
  hauteur: number;
  // "menu ouvert" pour un élément d'un menu ouvert au-dessus de la fenêtre.
  zone?: string;
};

export type LectureEntouree = {
  titre_fenetre_active: string | null;
  application: string | null;
  // Vrai si la fenêtre au premier plan est celle de Classinus : rien n'est lu (lot 5).
  fenetre_classinus: boolean;
  // Seulement les éléments qui tombent dans une zone entourée.
  elements: ElementEntoure[];
  // Zones entourées, en pixels d'écran.
  zones: ZonePage[];
  coupe: boolean;
  mode: "uia" | "titre_seul";
  menu_ouvert?: boolean;
  texte_long_ignore?: boolean;
};

// Codes d'erreur : le texte montré à l'étudiant est choisi par l'appelant (traduisible).
export type ErreurLectureEntouree = { erreur: "aucun_trait" | "indisponible"; detail?: string };

type PontNatifEntoure = { lireElementsEntoures(options: { zones: ZonePage[] }): Promise<LectureEntouree | { erreur: string }> };

let pont: PontNatifEntoure | null = null;

export async function lireCeQuiEstEntoure(): Promise<LectureEntouree | ErreurLectureEntouree> {
  const zones = zonesDesTraits(lireEtatCrayon().traits);
  if (zones.length === 0) return { erreur: "aucun_trait" };
  try {
    pont ??= registerPlugin<PontNatifEntoure>("PontNatif");
    const resultat = await pont.lireElementsEntoures({ zones });
    if ("erreur" in resultat) return { erreur: "indisponible", detail: resultat.erreur };
    return resultat;
  } catch (e) {
    return { erreur: "indisponible", detail: e instanceof Error ? e.message : String(e) };
  }
}
