import { SectionPage } from "@/components/SectionPage";
import { titreSection } from "@/lib/contenuSections";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";
import { EspaceConnexions } from "@/components/connexions/EspaceConnexions";

export default function PageApplicationsConnectees() {
  const cle = ROUTES_PERSONNALISER.connexions;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupePersonnaliser()}>
      <EspaceConnexions />
    </SectionPage>
  );
}
