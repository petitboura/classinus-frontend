import { Earth, FolderLock, TabletSmartphone } from "lucide-react";
import { ROUTES_BIBLIOTHEQUE } from "./routesBibliotheque";
import { construireGroupe, type SectionDeGroupe } from "./groupeSections";

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
export const SECTIONS_BIBLIOTHEQUE: SectionDeGroupe[] = [
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

// Valeur à passer au prop `groupe` de SectionPage sur chaque page fille
// (la fabrication est commune à toutes les sections en groupe, voir
// lib/groupeSections.tsx).
export function groupeBibliotheque() {
  return construireGroupe("Bibliothèque", ROUTES_BIBLIOTHEQUE.accueil, SECTIONS_BIBLIOTHEQUE);
}
