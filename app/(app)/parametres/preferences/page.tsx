import { SectionPage } from "@/components/SectionPage";
import { ParametresPreferences } from "@/components/ParametresPreferences";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresPreferences() {
  return (
    <SectionPage title="Préférences" groupe={groupeParametres()}>
      <ParametresPreferences />
    </SectionPage>
  );
}
