import { SectionPage } from "@/components/SectionPage";
import { ParametresAPropos } from "@/components/ParametresAPropos";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresAPropos() {
  return (
    <SectionPage title="À propos" groupe={groupeParametres()}>
      <ParametresAPropos />
    </SectionPage>
  );
}
