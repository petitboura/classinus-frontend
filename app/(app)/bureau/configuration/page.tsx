import { SectionPageBureau } from "@/components/SectionPageBureau";
import { ConfigurationBureau } from "@/components/bureau/ConfigurationBureau";

// 28/09/2026, demande Bourama : nouvel onglet de Bureau, 4 catégories de
// skills séparées de "Mes skills" (Procédure/Règle/Comportement/Style),
// voir components/bureau/ConfigurationBureau.tsx.
export default function PageBureauConfiguration() {
  return (
    <SectionPageBureau title="Configuration">
      <ConfigurationBureau />
    </SectionPageBureau>
  );
}
