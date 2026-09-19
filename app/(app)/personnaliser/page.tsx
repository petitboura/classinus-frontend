import { SectionPage } from "@/components/SectionPage";
import { ListeSections } from "@/components/ListeSections";
import { SECTIONS_PERSONNALISER } from "@/lib/sectionsPersonnaliser";

// 19/09/2026, demande Bourama : cette page n'a plus sa propre liste de
// sections en dur -- elle vient de lib/sectionsPersonnaliser.tsx, réutilisée
// aussi par le menu des pages voisines sur chaque page fille (même principe
// que Bureau/Bibliothèque/Concentration).
export default function PagePersonnaliser() {
  return (
    <SectionPage title="Personnaliser Classinus">
      <ListeSections sections={SECTIONS_PERSONNALISER} />
    </SectionPage>
  );
}
