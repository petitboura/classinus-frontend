import { SectionPage } from "@/components/SectionPage";
import { ProgrammeNotions } from "@/components/ProgrammeNotions";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Programme" de Bureau,
// devenu une vraie page.
export default function PageBureauProgramme() {
  return (
    <SectionPage title="Programme" groupe={groupeBureau()}>
      <DefinirInfoSection id="programme-notions" />
      <ProgrammeNotions />
    </SectionPage>
  );
}
