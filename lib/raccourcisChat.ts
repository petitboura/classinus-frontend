import { Brain, Code, Hourglass, Library, Smartphone, type LucideIcon } from "lucide-react";
import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";
import { ROUTES_BUREAU } from "@/lib/routesBureau";
import { ROUTES_CONCENTRATION } from "@/lib/routesConcentration";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";

// 01/10/2026, demande Bourama : raccourcis directs vers des sous-sections
// utiles, affichés autour de la barre de saisie sur l'écran vide du chat
// (voir components/chat/RaccourcisChat.tsx). Liste et noms choisis par
// lui : "Perso" (juste ce mot), "Dossier du phone", "Temps d'écran",
// "Éditeur", "Ma mémoire". Les adresses viennent des fichiers de routes
// de chaque section, jamais écrites en dur ici.
export type RaccourciChat = {
  id: string;
  label: string;
  href: string;
  Icone: LucideIcon;
};

export const RACCOURCIS_CHAT: readonly RaccourciChat[] = [
  { id: "perso", label: "Perso", href: ROUTES_BIBLIOTHEQUE.perso, Icone: Library },
  { id: "dossier-phone", label: "Dossier du phone", href: ROUTES_BIBLIOTHEQUE.telephone, Icone: Smartphone },
  { id: "temps-ecran", label: "Temps d'écran", href: ROUTES_CONCENTRATION.tempsEcran, Icone: Hourglass },
  { id: "editeur", label: "Éditeur", href: ROUTES_BUREAU.editeur, Icone: Code },
  { id: "memoire", label: "Ma mémoire", href: ROUTES_PERSONNALISER.memoire, Icone: Brain },
];
