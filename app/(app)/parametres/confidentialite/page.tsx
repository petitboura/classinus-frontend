import { SectionPage } from "@/components/SectionPage";
import { ParametresConfidentialite } from "@/components/ParametresConfidentialite";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresConfidentialite() {
  return (
    <SectionPage title="Confidentialité et sécurité" groupe={groupeParametres()}>
      <ParametresConfidentialite />
    </SectionPage>
  );
}
