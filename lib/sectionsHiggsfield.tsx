import { IconeHiggsfield } from "@/components/icons/IconeHiggsfield";
import { ROUTES_HIGGSFIELD } from "./routesHiggsfield";
import { construireGroupe, type SectionDeGroupe } from "./groupeSections";

export const SECTIONS_HIGGSFIELD: SectionDeGroupe[] = [
  {
    href: ROUTES_HIGGSFIELD.accueil,
    label: "Catalogue Higgsfield",
    description: "Tous les effets Higgsfield — clique et genere depuis le chat",
    Icone: IconeHiggsfield as unknown as SectionDeGroupe["Icone"],
  },
];

export function groupeHiggsfield() {
  return construireGroupe("Higgsfield", ROUTES_HIGGSFIELD.accueil, SECTIONS_HIGGSFIELD);
}
