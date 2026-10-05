import { SectionPageBureau } from "@/components/SectionPageBureau";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 19/09/2026, demande Bourama : ancien onglet "Audit hebdomadaire" de
// Bureau, devenu une vraie page.
// 20/09/2026 (suite) : tableau de bord complet par code (AuditComplet,
// phase 1) ajouté au-dessus -- l'audit hebdomadaire des signalements
// (AuditCorrections, portée globale : tous les codes du prof confondus)
// reste en dessous, inchangé, complémentaire plutôt que remplacé.
export default function PageBureauAudit() {
  const cle = ROUTES_BUREAU.audit;
  return (
    <SectionPageBureau title={titreSection(cle)}>
      {contenuSection(cle)}
    </SectionPageBureau>
  );
}
