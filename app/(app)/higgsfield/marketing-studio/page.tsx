import { SectionPage } from "@/components/SectionPage";
import { groupeHiggsfield } from "@/lib/sectionsHiggsfield";
import { SectionMarketingStudio } from "@/components/higgsfield/SectionMarketingStudio";

export default function PageMarketingStudio() {
  return (
    <SectionPage title="Marketing Studio" groupe={groupeHiggsfield()}>
      <SectionMarketingStudio />
    </SectionPage>
  );
}
