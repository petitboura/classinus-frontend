import { SectionPage } from "@/components/SectionPage";
import { EspaceAccessibilite } from "@/components/EspaceAccessibilite";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresAccessibilite() {
  return (
    <SectionPage title="Accessibilité" groupe={groupeParametres()}>
      <EspaceAccessibilite />
    </SectionPage>
  );
}
