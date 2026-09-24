import { SectionPage } from "@/components/SectionPage";
import { ProgrammeAvecCatalogue } from "@/components/ProgrammeAvecCatalogue";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Programme" de Bureau,
// devenu une vraie page.
// 22/09/2026, demande Bourama : ajout de l'onglet "Catalogue public"
// (partager/récupérer un Programme entier), voir ProgrammeAvecCatalogue.tsx.
export default function PageBureauProgramme() {
  return (
    <SectionPage title="Programme" groupe={groupeBureau()}>
      <DefinirInfoSection id="programme-notions" />
      <ProgrammeAvecCatalogue />
    </SectionPage>
  );
}
