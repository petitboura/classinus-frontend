import { SectionPage } from "@/components/SectionPage";
import { EspaceTempsEcran } from "@/components/EspaceTempsEcran";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeConcentration } from "@/lib/sectionsConcentration";

// 19/09/2026, demande Bourama : ancien onglet "Temps d'écran" de
// Concentration, devenu une vraie page. sansEnTete : le titre et le
// bouton "i" sont portés par cette page, pas répétés dans l'écran.
export default function PageConcentrationTempsEcran() {
  return (
    <SectionPage title="Temps d'écran" groupe={groupeConcentration()}>
      <DefinirInfoSection id="temps-ecran" />
      <EspaceTempsEcran sansEnTete />
    </SectionPage>
  );
}
