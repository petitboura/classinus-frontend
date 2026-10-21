import { Brain, ClipboardList, Code, Hourglass, Smartphone, type LucideIcon } from "lucide-react";
import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";
import { ROUTES_BUREAU } from "@/lib/routesBureau";
import { ROUTES_CONCENTRATION } from "@/lib/routesConcentration";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { GROUPES_RAIL } from "@/lib/groupesRail";

// Les raccourcis du bureau reprennent automatiquement toutes les sous-sections
// définies pour le rail : une seule source de vérité, aucun élément oublié.
export type RaccourciChat = {
  id: string;
  label: string;
  href: string;
  Icone: LucideIcon;
};

export const RACCOURCIS_CHAT_BUREAU: readonly RaccourciChat[] = GROUPES_RAIL.flatMap(
  (groupe) =>
    groupe.sections.map(({ href, label, Icone }) => ({
      id: href,
      label,
      href,
      Icone,
    }))
);

// Sur mobile, on conserve les cinq raccourcis adaptés à ce format.
export const RACCOURCIS_CHAT_MOBILE: readonly RaccourciChat[] = [
  { id: "configuration", label: "Configuration", href: ROUTES_BUREAU.configuration, Icone: ClipboardList },
  { id: "dossier-phone", label: "Dossier du téléphone", href: ROUTES_BIBLIOTHEQUE.telephone, Icone: Smartphone },
  { id: "temps-ecran", label: "Temps d'écran", href: ROUTES_CONCENTRATION.tempsEcran, Icone: Hourglass },
  { id: "editeur", label: "Éditeur", href: ROUTES_BUREAU.editeur, Icone: Code },
  { id: "memoire", label: "Ma mémoire", href: ROUTES_PERSONNALISER.memoire, Icone: Brain },
];
