import type { LucideIcon } from "lucide-react";

// 19/09/2026, demande Bourama : la Bibliothèque puis Bureau fonctionnent
// comme Personnaliser Clovis. Chaque section en groupe décrit ses pages
// par la même liste (adresse, nom, phrase, icône), qui sert deux fois :
// de contenu à la page d'accueil en liste (ListeSections) et de menu des
// pages voisines sur chaque page fille (prop `groupe` de SectionPage).
// Ce fichier porte la forme commune et la fabrication du prop `groupe`,
// pour ne pas la recopier dans chaque section.
export type SectionDeGroupe = {
  href: string;
  label: string;
  description: string;
  Icone: LucideIcon;
};

// Les icônes sont des éléments déjà construits, pas des références de
// composant : les pages sont des Server Components et SectionPage est un
// Client Component, une fonction ne peut pas traverser cette frontière
// (même règle que dans SectionPage.tsx, correctif du 24/08).
export function construireGroupe(label: string, href: string, sections: SectionDeGroupe[]) {
  return {
    label,
    href,
    soeurs: sections.map((s) => ({
      href: s.href,
      label: s.label,
      icone: <s.Icone size={16} className="flex-shrink-0" />,
    })),
  };
}
