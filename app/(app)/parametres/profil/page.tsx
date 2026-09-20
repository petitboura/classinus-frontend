import { SectionPage } from "@/components/SectionPage";
import { ParametresProfil } from "@/components/ParametresProfil";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresProfil() {
  return (
    <SectionPage title="Profil" groupe={groupeParametres()}>
      <ParametresProfil />
    </SectionPage>
  );
}
