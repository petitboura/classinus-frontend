import { CalendarCheck, KeyRound, ListChecks, MessageSquareWarning, School, TextCursorInput } from "lucide-react";
import { ROUTES_BUREAU } from "./routesBureau";
import { construireGroupe, type SectionDeGroupe } from "./groupeSections";

// 19/09/2026, demande Bourama : Bureau fonctionne comme Personnaliser
// Clovis (voir lib/routesBureau.ts et lib/groupeSections.tsx). Cette liste
// garde l'ordre et les noms des anciens onglets. Un nom ou une icône
// changés ici changent d'un coup la page d'accueil et le menu des pages
// voisines.
//
// Icônes choisies parmi celles qui ne servent encore nulle part ailleurs
// dans l'app.
export const SECTIONS_BUREAU: SectionDeGroupe[] = [
  {
    href: ROUTES_BUREAU.audit,
    label: "Audit hebdomadaire",
    description: "Un résumé chaque semaine des signalements de tes élèves",
    Icone: CalendarCheck,
  },
  {
    href: ROUTES_BUREAU.codes,
    label: "Mes codes",
    description: "Les codes que tu as créés et que tu partages",
    Icone: KeyRound,
  },
  {
    href: ROUTES_BUREAU.programme,
    label: "Programme",
    description: "Les notions à enseigner pour chaque code, avec leur avancement",
    Icone: ListChecks,
  },
  {
    href: ROUTES_BUREAU.entrerCode,
    label: "Entrer un code",
    description: "Recevoir ce que quelqu'un a partagé avec toi grâce à un code",
    Icone: TextCursorInput,
  },
  {
    href: ROUTES_BUREAU.etablissements,
    label: "Établissements",
    description: "Suivre un établissement et demander l'accès à son contenu",
    Icone: School,
  },
  {
    href: ROUTES_BUREAU.signalements,
    label: "Signalements",
    description: "Les problèmes que tes élèves ont signalés sur une réponse",
    Icone: MessageSquareWarning,
  },
];

// Valeur à passer au prop `groupe` de SectionPage sur chaque page fille.
export function groupeBureau() {
  return construireGroupe("Bureau", ROUTES_BUREAU.accueil, SECTIONS_BUREAU);
}
