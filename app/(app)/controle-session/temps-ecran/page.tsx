import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_CONCENTRATION } from "@/lib/routesConcentration";
import { groupeConcentration } from "@/lib/sectionsConcentration";

// 19/09/2026, demande Bourama : ancien onglet "Temps d'écran" de
// Concentration, devenu une vraie page. sansEnTete : le titre et le
// bouton "i" sont portés par cette page, pas répétés dans l'écran.
export default function PageConcentrationTempsEcran() {
  const cle = ROUTES_CONCENTRATION.tempsEcran;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupeConcentration()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
