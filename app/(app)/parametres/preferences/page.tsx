import { SectionPage } from "@/components/SectionPage";
import { ParametresPreferences } from "@/components/ParametresPreferences";
import { DemarrageAutomatiqueCarte } from "@/components/DemarrageAutomatiqueCarte";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresPreferences() {
  return (
    <SectionPage title="Préférences" groupe={groupeParametres()}>
      <ParametresPreferences />
      <DemarrageAutomatiqueCarte />
    </SectionPage>
  );
}
