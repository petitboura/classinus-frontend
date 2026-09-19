import { ScrollText, Download, Brain } from "lucide-react";
import { ROUTES_PERSONNALISER } from "./routesPersonnaliser";
import { construireGroupe, type SectionDeGroupe } from "./groupeSections";

// 19/09/2026, demande Bourama : Personnaliser Classinus fonctionne
// maintenant comme Bureau/Bibliothèque/Concentration (voir
// lib/routesPersonnaliser.ts et lib/groupeSections.tsx). L'ancien onglet
// "Public" de Mes skills (OngletsSegment dans MesComportements.tsx)
// devient sa propre ligne ici. Icône Download reprise de celle déjà
// utilisée pour désigner "vient du public" ailleurs dans le même écran
// (filtre d'origine des skills, voir MesComportements.tsx).
export const SECTIONS_PERSONNALISER: SectionDeGroupe[] = [
  {
    href: ROUTES_PERSONNALISER.comportements,
    label: "Mes skills",
    description: "Des instructions personnalisées que Classinus suit dans le chat",
    Icone: ScrollText,
  },
  {
    href: ROUTES_PERSONNALISER.skillsPublics,
    label: "Skills publics",
    description: "Le catalogue de skills publiés par les autres étudiants",
    Icone: Download,
  },
  {
    href: ROUTES_PERSONNALISER.memoire,
    label: "Ma mémoire",
    description: "Ce que Classinus retient de toi entre les conversations",
    Icone: Brain,
  },
];

// Valeur à passer au prop `groupe` de SectionPage sur chaque page fille.
export function groupePersonnaliser() {
  return construireGroupe("Personnaliser Classinus", ROUTES_PERSONNALISER.accueil, SECTIONS_PERSONNALISER);
}
