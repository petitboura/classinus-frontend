import { SectionPage } from "@/components/SectionPage";
import { AuditCorrections } from "@/components/AuditCorrections";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Audit hebdomadaire" de
// Bureau, devenu une vraie page.
export default function PageBureauAudit() {
  return (
    <SectionPage title="Audit hebdomadaire" groupe={groupeBureau()}>
      <DefinirInfoSection id="audit-corrections" />
      <AuditCorrections />
    </SectionPage>
  );
}
