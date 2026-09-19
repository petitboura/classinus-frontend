import { Earth, FolderLock, TabletSmartphone, type LucideIcon } from "lucide-react";
import { ROUTES_BIBLIOTHEQUE } from "./routesBibliotheque";

// 19/09/2026, demande Bourama : la Bibliothèque fonctionne comme
// Personnaliser Clovis (voir lib/routesBibliotheque.ts). Cette liste sert
// deux fois : de contenu à la page d'accueil /bibliotheque (ListeSections)
// et de menu des pages voisines sur chaque page fille (voir
// groupeBibliotheque plus bas). Un libellé ou une icône changés ici
// changent donc les deux endroits d'un coup.
//
// Icônes choisies parmi celles qui ne servent encore nulle part ailleurs
// dans l'app : un cadenas sur un dossier pour le perso, la Terre pour le
// public, une tablette et un téléphone pour les dossiers du téléphone.
export const SECTIONS_BIBLIOTHEQUE: {
  href: string;
  label: string;
  description: string;
  Icone: LucideIcon;
}[] = [
  {
    href: ROUTES_BIBLIOTHEQUE.perso,
    label: "Perso",
    description: "Tes documents personnels, que Classinus peut consulter dans le chat",
    Icone: FolderLock,
  },
  {
    href: ROUTES_BIBLIOTHEQUE.publique,
    label: "Publique",
    description: "Le catalogue de documents partagé par tout le monde",
    Icone: Earth,
  },
  {
    href: ROUTES_BIBLIOTHEQUE.telephone,
    label: "Dossiers du téléphone",
    description: "Les dossiers de ton téléphone, uniquement depuis l'appli mobile",
    Icone: TabletSmartphone,
  },
];

// Valeur à passer au prop `groupe` de SectionPage sur chaque page fille.
// Les icônes sont des éléments déjà construits, pas des références de
// composant : les pages sont des Server Components et SectionPage est un
// Client Component, une fonction ne peut pas traverser cette frontière
// (même règle que dans SectionPage.tsx, correctif du 24/08).
export function groupeBibliotheque() {
  return {
    label: "Bibliothèque",
    href: ROUTES_BIBLIOTHEQUE.accueil,
    soeurs: SECTIONS_BIBLIOTHEQUE.map((s) => ({
      href: s.href,
      label: s.label,
      icone: <s.Icone size={16} className="flex-shrink-0" />,
    })),
  };
}
