import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

// 19/09/2026, demande Bourama : ancien onglet "Public" de Mes skills,
// devenu une vraie page.
export default function PageSkillsPublics() {
  const cle = ROUTES_PERSONNALISER.skillsPublics;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupePersonnaliser()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
