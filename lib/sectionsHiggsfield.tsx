import { IconeHiggsfield } from "@/components/icons/IconeHiggsfield";
import { ROUTES_HIGGSFIELD } from "./routesHiggsfield";
import { Flame, Megaphone, Sparkles, Wand2 } from "lucide-react";
import { construireGroupe, type SectionDeGroupe } from "./groupeSections";

export const SECTIONS_HIGGSFIELD: SectionDeGroupe[] = [
  {
    href: ROUTES_HIGGSFIELD.accueil,
    label: "Catalogue Higgsfield",
    description: "Tous les effets Higgsfield — clique et genere depuis le chat",
    Icone: IconeHiggsfield as unknown as SectionDeGroupe["Icone"],
  },
  {
    href: ROUTES_HIGGSFIELD.genjutsu,
    label: "Genjutsu",
    description: "Les effets Genjutsu Higgsfield",
    Icone: Wand2,
  },
  {
    href: ROUTES_HIGGSFIELD.viral,
    label: "Viral",
    description: "Les effets viraux Higgsfield",
    Icone: Flame,
  },
  {
    href: ROUTES_HIGGSFIELD.soul,
    label: "Soul",
    description: "Les styles d'image Soul Higgsfield",
    Icone: Sparkles,
  },
  {
    href: ROUTES_HIGGSFIELD.marketingStudio,
    label: "Marketing Studio",
    description: "Les presets Marketing Studio Higgsfield",
    Icone: Megaphone,
  },
];

export function groupeHiggsfield() {
  return construireGroupe("Higgsfield", ROUTES_HIGGSFIELD.accueil, SECTIONS_HIGGSFIELD);
}
