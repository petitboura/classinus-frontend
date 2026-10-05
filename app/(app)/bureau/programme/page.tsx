import { SectionPageBureau } from "@/components/SectionPageBureau";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 19/09/2026, demande Bourama : ancien onglet "Programme" de Bureau,
// devenu une vraie page.
// 22/09/2026, demande Bourama : ajout de l'onglet "Catalogue public"
// (partager/récupérer un Programme entier), voir ProgrammeAvecCatalogue.tsx.
export default function PageBureauProgramme() {
  const cle = ROUTES_BUREAU.programme;
  return (
    <SectionPageBureau title={titreSection(cle)}>
      {contenuSection(cle)}
    </SectionPageBureau>
  );
}
