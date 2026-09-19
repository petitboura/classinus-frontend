import { SectionPage } from "@/components/SectionPage";
import { MaMemoire } from "@/components/MaMemoire";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

export default function PageMemoire() {
  return (
    <SectionPage title="Ma mémoire" groupe={groupePersonnaliser()}>
      <MaMemoire />
    </SectionPage>
  );
}
