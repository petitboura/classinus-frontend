import { SectionPage } from "@/components/SectionPage";
import { EspaceControleSession } from "@/components/EspaceControleSession";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeConcentration } from "@/lib/sectionsConcentration";

// 19/09/2026, demande Bourama : ancien onglet "Contrôle de session" de
// Concentration, devenu une vraie page. sansEnTete : le titre et le
// bouton "i" sont portés par cette page, pas répétés dans l'écran.
export default function PageConcentrationSession() {
  return (
    <SectionPage title="Contrôle de session" groupe={groupeConcentration()}>
      <DefinirInfoSection id="controle-session" />
      <EspaceControleSession sansEnTete />
    </SectionPage>
  );
}
