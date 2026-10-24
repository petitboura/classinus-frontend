"use client";

// Crayon du canal PC, lot 3 (11/10/2026, demande Bourama) : ce que l'étudiant a entouré.
// Demande au processus principal d'Electron de lire la fenêtre au premier plan avec la
// lecture d'écran existante. Tous les éléments lus sont rendus, ceux qui tombent dans les
// zones des traits étant marqués `entoure`. Le résultat sert à la phrase envoyée au grand
// modèle (lib/phraseCrayon.ts).

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
  // Vrai si l'élément tombe dans une zone entourée ; les autres sont le reste de la fenêtre.
  entoure?: boolean;
  // Texte exact lu sous le trait, pour un champ ou un document dont le texte est lisible.
  texte_entoure?: string;
};

export type LectureEntouree = {
  titre_fenetre_active: string | null;
  application: string | null;
  // Vrai si la fenêtre au premier plan est celle de Classinus : rien n'est lu (lot 5).
  fenetre_classinus: boolean;
  // Tout ce que la lecture de la fenêtre a trouvé, les éléments entourés étant marqués.
  elements: ElementEntoure[];
  // Zones entourées, en pixels d'écran.
  zones: ZonePage[];
  coupe: boolean;
  mode: "uia" | "titre_seul";
  menu_ouvert?: boolean;
  texte_long_ignore?: boolean;
};

// Codes d'erreur stables : le détail natif reste dans la console pour le diagnostic,
// il n'est pas transporté vers le modèle ni affiché à l'étudiant.
export type ErreurLectureEntouree = { erreur: "aucun_trait" | "indisponible" };

type PontNatifEntoure = { lireElementsEntoures(options: { zones: ZonePage[] }): Promise<LectureEntouree | { erreur: string }> };

let pont: PontNatifEntoure | null = null;

export async function lireCeQuiEstEntoure(): Promise<LectureEntouree | ErreurLectureEntouree> {
  const zones = zonesDesTraits(lireEtatCrayon().traits);
  if (zones.length === 0) return { erreur: "aucun_trait" };
  try {
    pont ??= registerPlugin<PontNatifEntoure>("PontNatif");
    const resultat = await pont.lireElementsEntoures({ zones });
    if ("erreur" in resultat) {
      console.warn("Le pont natif n’a pas pu lire ce qui est entouré :", resultat.erreur);
      return { erreur: "indisponible" };
    }
    return resultat;
  } catch (e) {
    console.warn("Échec de lecture du crayon PC :", e);
    return { erreur: "indisponible" };
  }
}
