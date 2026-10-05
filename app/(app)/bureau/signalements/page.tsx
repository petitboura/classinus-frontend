import { SectionPageBureau } from "@/components/SectionPageBureau";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 19/09/2026, demande Bourama : ancien onglet "Signalements" de Bureau,
// devenu une vraie page. Cette adresse ne gêne ni /signalements/[id]
// (page d'un signalement reçu par lien) ni /admin/signalements
// (modération), ce sont d'autres branches.
export default function PageBureauSignalements() {
  const cle = ROUTES_BUREAU.signalements;
  return (
    <SectionPageBureau title={titreSection(cle)}>
      {contenuSection(cle)}
    </SectionPageBureau>
  );
}
