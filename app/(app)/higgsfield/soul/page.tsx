import { SectionPage } from "@/components/SectionPage";
import { groupeHiggsfield } from "@/lib/sectionsHiggsfield";
import { CatalogueHiggsfield } from "@/components/higgsfield/CatalogueHiggsfield";

export default function PageSoul() {
  return (
    <SectionPage title="Soul" groupe={groupeHiggsfield()}>
      <CatalogueHiggsfield famille="soul" />
    </SectionPage>
  );
}
