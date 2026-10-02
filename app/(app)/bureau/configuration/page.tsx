import { SectionPageBureau } from "@/components/SectionPageBureau";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 28/09/2026, demande Bourama : nouvel onglet de Bureau, 4 catégories de
// skills séparées de "Mes skills" (Procédure/Règle/Comportement/Style),
// voir components/bureau/ConfigurationBureau.tsx.
export default function PageBureauConfiguration() {
  const cle = ROUTES_BUREAU.configuration;
  return (
    <SectionPageBureau title={titreSection(cle)}>
      {contenuSection(cle)}
    </SectionPageBureau>
  );
}
