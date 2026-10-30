import { SectionPage } from "@/components/SectionPage";
import { ParametresPreferences } from "@/components/ParametresPreferences";
import { DemarrageAutomatiqueCarte } from "@/components/DemarrageAutomatiqueCarte";
import { MiseAJourPcCarte } from "@/components/MiseAJourPcCarte";
import { RelaisPcCarte } from "@/components/RelaisPcCarte";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresPreferences() {
  return (
    <SectionPage title="Préférences" groupe={groupeParametres()}>
      <ParametresPreferences />
      <DemarrageAutomatiqueCarte />
      <MiseAJourPcCarte />
      <RelaisPcCarte />
    </SectionPage>
  );
}
