import { SectionPage } from "@/components/SectionPage";
import { GestionPermissionsOutils } from "@/components/GestionPermissionsOutils";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageGestionOutils() {
  return (
    <SectionPage title="Gestion des outils" groupe={groupeParametres()}>
      <GestionPermissionsOutils />
    </SectionPage>
  );
}
