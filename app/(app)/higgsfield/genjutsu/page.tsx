import { SectionPage } from "@/components/SectionPage";
import { groupeHiggsfield } from "@/lib/sectionsHiggsfield";
import { CatalogueHiggsfield } from "@/components/higgsfield/CatalogueHiggsfield";

export default function PageGenjutsu() {
  return (
    <SectionPage title="Genjutsu" groupe={groupeHiggsfield()}>
      <CatalogueHiggsfield famille="genjutsu" />
    </SectionPage>
  );
}
