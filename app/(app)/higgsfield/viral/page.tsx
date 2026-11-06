import { SectionPage } from "@/components/SectionPage";
import { groupeHiggsfield } from "@/lib/sectionsHiggsfield";
import { CatalogueHiggsfield } from "@/components/higgsfield/CatalogueHiggsfield";

export default function PageViral() {
  return (
    <SectionPage title="Viral" groupe={groupeHiggsfield()}>
      <CatalogueHiggsfield famille="viral" />
    </SectionPage>
  );
}
