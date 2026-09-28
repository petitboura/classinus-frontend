import { SectionPage } from "@/components/SectionPage";
import { MaMemoire } from "@/components/MaMemoire";
import { MaProgression } from "@/components/MaProgression";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

export default function PageMemoire() {
  return (
    <SectionPage title="Ma mémoire" groupe={groupePersonnaliser()}>
      <MaMemoire />
      <h2 className="mb-3 mt-8 text-sm font-bold text-dj-texte">Ma progression</h2>
      <MaProgression />
    </SectionPage>
  );
}
