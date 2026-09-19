import { SectionPage } from "@/components/SectionPage";
import { EspaceEntrerCode } from "@/components/EspaceEntrerCode";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Entrer un code" de Bureau,
// devenu une vraie page. sansEnTete : le titre et le bouton "i" sont
// portés par cette page, pas répétés dans la carte.
export default function PageBureauEntrerCode() {
  return (
    <SectionPage title="Entrer un code" groupe={groupeBureau()}>
      <DefinirInfoSection id="entrer-code" />
      <EspaceEntrerCode sansEnTete />
    </SectionPage>
  );
}
