import { SectionPage } from "@/components/SectionPage";
import { groupeHiggsfield } from "@/lib/sectionsHiggsfield";
import { CatalogueHiggsfield } from "@/components/higgsfield/CatalogueHiggsfield";
import { SectionMarketingStudio } from "@/components/higgsfield/SectionMarketingStudio";

export default function PageHiggsfield() {
  return (
    <SectionPage title="Higgsfield" groupe={groupeHiggsfield()}>
      <CatalogueHiggsfield />
      <SectionMarketingStudio />
    </SectionPage>
  );
}
