import { BarChart3, BellOff } from "lucide-react";
import { ROUTES_CONCENTRATION } from "./routesConcentration";
import { construireGroupe, type SectionDeGroupe } from "./groupeSections";

// 19/09/2026, demande Bourama : Concentration fonctionne comme
// Personnaliser Clovis (voir lib/routesConcentration.ts et
// lib/groupeSections.tsx). Cette liste garde l'ordre et les noms des
// anciens onglets. Un nom ou une icône changés ici changent d'un coup la
// page d'accueil et le menu des pages voisines.
//
// Icônes choisies parmi celles qui ne servent encore nulle part ailleurs
// dans l'app.
export const SECTIONS_CONCENTRATION: SectionDeGroupe[] = [
  {
    href: ROUTES_CONCENTRATION.session,
    label: "Contrôle de session",
    description: "Couper les sonneries et les notifications pendant ton travail",
    Icone: BellOff,
  },
  {
    href: ROUTES_CONCENTRATION.tempsEcran,
    label: "Temps d'écran",
    description: "Le temps passé chaque jour dans chaque app",
    Icone: BarChart3,
  },
];

// Valeur à passer au prop `groupe` de SectionPage sur chaque page fille.
export function groupeConcentration() {
  return construireGroupe("Concentration", ROUTES_CONCENTRATION.accueil, SECTIONS_CONCENTRATION);
}
