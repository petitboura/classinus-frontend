import { SectionPage } from "@/components/SectionPage";
import { AuditComplet } from "@/components/AuditComplet";
import { AuditCorrections } from "@/components/AuditCorrections";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Audit hebdomadaire" de
// Bureau, devenu une vraie page.
// 20/09/2026 (suite) : tableau de bord complet par code (AuditComplet,
// phase 1) ajouté au-dessus -- l'audit hebdomadaire des signalements
// (AuditCorrections, portée globale : tous les codes du prof confondus)
// reste en dessous, inchangé, complémentaire plutôt que remplacé.
export default function PageBureauAudit() {
  return (
    <SectionPage title="Audit hebdomadaire" groupe={groupeBureau()}>
      <DefinirInfoSection id="audit-complet-code" />
      <AuditComplet />
      <div className="mt-6 flex flex-col gap-2">
        <p className="text-sm font-semibold text-dj-texte">Tous tes signalements</p>
        <AuditCorrections />
      </div>
    </SectionPage>
  );
}
