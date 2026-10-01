import { EcranAccueil } from "@/components/EcranAccueil";

// Ancienne "vraie page d'accueil" (16/08/2026, demande Bourama),
// devenue le tableau de bord le 30/09/2026 : le chat a pris l'adresse de
// départ "/" (voir app/(app)/page.tsx et lib/routesApp.ts), cet écran
// n'est donc plus l'accueil. Placée à l'intérieur du groupe (app) (voir
// app/(app)/layout.tsx) pour hériter de la nav persistante et du chat
// flottant.
export default function PageTableauDeBord() {
  return <EcranAccueil />;
}
