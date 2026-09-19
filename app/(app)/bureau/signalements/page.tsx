import { SectionPage } from "@/components/SectionPage";
import { ListeCorrectionsProf } from "@/components/ListeCorrectionsProf";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Signalements" de Bureau,
// devenu une vraie page. Cette adresse ne gêne ni /signalements/[id]
// (page d'un signalement reçu par lien) ni /admin/signalements
// (modération), ce sont d'autres branches.
export default function PageBureauSignalements() {
  return (
    <SectionPage title="Signalements" groupe={groupeBureau()}>
      <DefinirInfoSection id="signalements-prof" />
      <ListeCorrectionsProf />
    </SectionPage>
  );
}
