import { SectionPage } from "@/components/SectionPage";
import { ConfigurationBureau } from "@/components/bureau/ConfigurationBureau";
import { groupeBureau } from "@/lib/sectionsBureau";

// 28/09/2026, demande Bourama : nouvel onglet de Bureau, 4 catégories
// séparées (Procédure/Règle/Comportement/Style), voir
// components/bureau/ConfigurationBureau.tsx. Même modèle de page que les
// autres pages de Bureau de cette branche (SectionPage + groupeBureau).
export default function PageBureauConfiguration() {
  return (
    <SectionPage title="Configuration" groupe={groupeBureau()}>
      <ConfigurationBureau />
    </SectionPage>
  );
}
