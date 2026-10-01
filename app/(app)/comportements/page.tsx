import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";

// 19/09/2026, demande Bourama : Mes skills fonctionne maintenant comme
// Bureau/Bibliothèque/Concentration -- le groupe vient de
// lib/sectionsPersonnaliser.tsx. sansOnglets : l'onglet "Public" que
// MesComportements affichait en interne devient sa propre page
// (/skills-publics), donc plus besoin de la barre d'onglets ici. Le
// contenu vient de lib/contenuSections.tsx, le même que la fenêtre
// flottante du chat.
export default function PageComportements() {
  const cle = ROUTES_PERSONNALISER.comportements;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupePersonnaliser()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
