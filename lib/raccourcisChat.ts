import { Brain, ClipboardList, Code, Hourglass, Library, ScrollText, Smartphone, type LucideIcon } from "lucide-react";
import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";
import { ROUTES_BUREAU } from "@/lib/routesBureau";
import { ROUTES_CONCENTRATION } from "@/lib/routesConcentration";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";

// 01/10/2026, demande Bourama : raccourcis directs vers des sous-sections
// utiles, affichés autour de la barre de saisie sur l'écran vide du chat
// (voir components/chat/RaccourcisChat.tsx). Les adresses viennent des
// fichiers de routes de chaque section, jamais écrites en dur ici.
//
// Deux listes, car les deux appareils n'ont pas les mêmes besoins (demande
// de Bourama) : "Temps d'écran" et "Dossier du phone" n'ont pas d'intérêt
// sur PC, et sur mobile "Configuration" prend la place de "Perso".
export type RaccourciChat = {
  id: string;
  label: string;
  href: string;
  Icone: LucideIcon;
};

// PC : une seule ligne de petits rectangles arrondis sous la barre de saisie.
export const RACCOURCIS_CHAT_BUREAU: readonly RaccourciChat[] = [
  { id: "perso", label: "Perso", href: ROUTES_BIBLIOTHEQUE.perso, Icone: Library },
  { id: "editeur", label: "Éditeur", href: ROUTES_BUREAU.editeur, Icone: Code },
  { id: "memoire", label: "Ma mémoire", href: ROUTES_PERSONNALISER.memoire, Icone: Brain },
  { id: "configuration", label: "Configuration", href: ROUTES_BUREAU.configuration, Icone: ClipboardList },
  { id: "mes-skills", label: "Mes skills", href: ROUTES_PERSONNALISER.comportements, Icone: ScrollText },
];

// Mobile : liste au-dessus de la barre de saisie.
export const RACCOURCIS_CHAT_MOBILE: readonly RaccourciChat[] = [
  { id: "configuration", label: "Configuration", href: ROUTES_BUREAU.configuration, Icone: ClipboardList },
  { id: "dossier-phone", label: "Dossier du phone", href: ROUTES_BIBLIOTHEQUE.telephone, Icone: Smartphone },
  { id: "temps-ecran", label: "Temps d'écran", href: ROUTES_CONCENTRATION.tempsEcran, Icone: Hourglass },
  { id: "editeur", label: "Éditeur", href: ROUTES_BUREAU.editeur, Icone: Code },
  { id: "memoire", label: "Ma mémoire", href: ROUTES_PERSONNALISER.memoire, Icone: Brain },
];
