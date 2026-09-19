import { SectionPage } from "@/components/SectionPage";
import { ListeSections } from "@/components/ListeSections";
import { SECTIONS_BUREAU } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : Bureau fonctionne comme Personnaliser
// Clovis et la Bibliothèque. Cette page n'est plus une barre d'onglets
// avec un état en mémoire (08/09/2026, ancienne version) mais la page
// d'accueil en liste de Bureau ; ses six écrans sont de vraies pages
// filles (voir lib/sectionsBureau.tsx pour la liste et
// lib/routesBureau.ts pour les adresses).
export default function PageBureau() {
  return (
    <SectionPage title="Bureau">
      <ListeSections sections={SECTIONS_BUREAU} />
    </SectionPage>
  );
}
