import { SectionPage } from "@/components/SectionPage";
import { groupeHiggsfield } from "@/lib/sectionsHiggsfield";
import { CatalogueHiggsfield } from "@/components/higgsfield/CatalogueHiggsfield";

export default function PageHiggsfield() {
  return (
    <SectionPage title="Higgsfield" groupe={groupeHiggsfield()}>
      <CatalogueHiggsfield />
    </SectionPage>
  );
}
