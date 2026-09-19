import { SectionPage } from "@/components/SectionPage";
import { ListeSections } from "@/components/ListeSections";
import { SECTIONS_CONCENTRATION } from "@/lib/sectionsConcentration";

// 19/09/2026, demande Bourama : Concentration fonctionne comme
// Personnaliser Clovis, la Bibliothèque et Bureau. Cette page n'est plus
// un écran à deux onglets avec un état en mémoire mais la page d'accueil
// en liste de Concentration ; ses deux écrans sont de vraies pages filles
// (voir lib/sectionsConcentration.tsx pour la liste et
// lib/routesConcentration.ts pour les adresses). Le composant à onglets
// EspaceConcentration reste utilisé par la fenêtre flottante du chat.
export default function PageControleSession() {
  return (
    <SectionPage title="Concentration">
      <ListeSections sections={SECTIONS_CONCENTRATION} />
    </SectionPage>
  );
}
