import { Briefcase, Hourglass, Library, Wand2, type LucideIcon } from "lucide-react";
import { ROUTES_BUREAU } from "./routesBureau";
import { ROUTES_BIBLIOTHEQUE } from "./routesBibliotheque";
import { ROUTES_CONCENTRATION } from "./routesConcentration";
import { ROUTES_PERSONNALISER } from "./routesPersonnaliser";
import { SECTIONS_BUREAU, sectionsBureauVisibles } from "./sectionsBureau";
import { SECTIONS_BIBLIOTHEQUE } from "./sectionsBibliotheque";
import { SECTIONS_CONCENTRATION } from "./sectionsConcentration";
import { SECTIONS_PERSONNALISER } from "./sectionsPersonnaliser";
import type { SectionDeGroupe } from "./groupeSections";

// Les quatre sections du rail qui ont des sous-sections (Bureau,
// Bibliothèque, Concentration, Personnaliser Classinus). Une seule
// définition, lue par le rail, par ses menus au survol et par les fenêtres
// flottantes du chat : les sous-sections viennent des mêmes listes que les
// vraies pages (lib/sections*.tsx), jamais d'une copie.
export type GroupeRail = {
  id: "bureau" | "bibliotheque" | "controle-session" | "personnaliser";
  href: string;
  label: string;
  Icone: LucideIcon;
  sections: SectionDeGroupe[];
};

export const GROUPE_BUREAU: GroupeRail = {
  id: "bureau",
  href: ROUTES_BUREAU.accueil,
  label: "Bureau",
  Icone: Briefcase,
  sections: SECTIONS_BUREAU,
};

export const GROUPE_BIBLIOTHEQUE: GroupeRail = {
  id: "bibliotheque",
  href: ROUTES_BIBLIOTHEQUE.accueil,
  label: "Bibliothèque",
  Icone: Library,
  sections: SECTIONS_BIBLIOTHEQUE,
};

export const GROUPE_CONCENTRATION: GroupeRail = {
  id: "controle-session",
  href: ROUTES_CONCENTRATION.accueil,
  label: "Concentration",
  Icone: Hourglass,
  sections: SECTIONS_CONCENTRATION,
};

export const GROUPE_PERSONNALISER: GroupeRail = {
  id: "personnaliser",
  href: ROUTES_PERSONNALISER.accueil,
  label: "Personnaliser Classinus",
  Icone: Wand2,
  sections: SECTIONS_PERSONNALISER,
};

/** Ordre du rail desktop (hors chat : les quatre dans le rail). */
export const GROUPES_RAIL: GroupeRail[] = [GROUPE_BUREAU, GROUPE_BIBLIOTHEQUE, GROUPE_CONCENTRATION, GROUPE_PERSONNALISER];

/** Les sections à montrer dans le menu d'un groupe, selon le statut prof. */
export function sectionsVisiblesDuGroupe(groupe: GroupeRail, estProfesseur: boolean | null): SectionDeGroupe[] {
  return groupe.id === "bureau" ? sectionsBureauVisibles(estProfesseur) : groupe.sections;
}

/** Retrouve une sous-section (libellé, icône) à partir de son adresse. */
export function trouverSection(href: string): (SectionDeGroupe & { groupe: GroupeRail }) | undefined {
  for (const groupe of GROUPES_RAIL) {
    const section = groupe.sections.find((s) => s.href === href);
    if (section) return { ...section, groupe };
  }
  return undefined;
}
