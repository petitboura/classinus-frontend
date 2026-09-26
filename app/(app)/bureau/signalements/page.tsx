import { SectionPageBureau } from "@/components/SectionPageBureau";
import { ListeCorrectionsProf } from "@/components/ListeCorrectionsProf";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";

// 19/09/2026, demande Bourama : ancien onglet "Signalements" de Bureau,
// devenu une vraie page. Cette adresse ne gêne ni /signalements/[id]
// (page d'un signalement reçu par lien) ni /admin/signalements
// (modération), ce sont d'autres branches.
export default function PageBureauSignalements() {
  return (
    <SectionPageBureau title="Signalements">
      <DefinirInfoSection id="signalements-prof" />
      <ListeCorrectionsProf />
    </SectionPageBureau>
  );
}
