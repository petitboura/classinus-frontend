import { SectionPage } from "@/components/SectionPage";
import { MesCodes } from "@/components/MesCodes";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Mes codes" de Bureau,
// devenu une vraie page. sansEnTete : le titre et le bouton "i" sont
// portés par cette page, pas répétés dans la carte.
export default function PageBureauCodes() {
  return (
    <SectionPage title="Mes codes" groupe={groupeBureau()}>
      <DefinirInfoSection id="mes-codes" />
      <MesCodes sansEnTete />
    </SectionPage>
  );
}
