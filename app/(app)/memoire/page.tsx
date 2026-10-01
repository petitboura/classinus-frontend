import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

export default function PageMemoire() {
  const cle = ROUTES_PERSONNALISER.memoire;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupePersonnaliser()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
