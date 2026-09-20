import { SectionPage } from "@/components/SectionPage";
import { ConnecteurNotionCarte } from "@/components/ConnecteurNotionCarte";
import { MiseAJourCarte } from "@/components/MiseAJourCarte";
import { NomAppareilCarte } from "@/components/NomAppareilCarte";
import { groupeParametres } from "@/lib/sectionsParametres";

export default function PageParametresCapacitesTelephone() {
  return (
    <SectionPage title="Capacités du téléphone" groupe={groupeParametres()}>
      <ConnecteurNotionCarte />
      <MiseAJourCarte />
      <NomAppareilCarte />
    </SectionPage>
  );
}
