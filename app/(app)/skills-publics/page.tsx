import { SectionPage } from "@/components/SectionPage";
import { SkillsPublics } from "@/components/SkillsPublics";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

// 19/09/2026, demande Bourama : ancien onglet "Public" de Mes skills,
// devenu une vraie page.
export default function PageSkillsPublics() {
  return (
    <SectionPage title="Skills publics" groupe={groupePersonnaliser()}>
      <SkillsPublics />
    </SectionPage>
  );
}
