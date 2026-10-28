import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

// 28/10/2026, demande Bourama : la Configuration (procédures, règles,
// comportements, styles) vit dans Personnaliser Classinus, plus dans Bureau.
// Voir components/bureau/ConfigurationBureau.tsx pour le contenu.
export default function PageConfiguration() {
  const cle = ROUTES_PERSONNALISER.configuration;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupePersonnaliser()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
