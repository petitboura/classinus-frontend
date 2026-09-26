import { SectionPage } from "@/components/SectionPage";
import { BureauAccueil } from "@/components/BureauAccueil";

// 19/09/2026, demande Bourama : Bureau fonctionne comme Personnaliser
// Clovis et la Bibliothèque. Cette page n'est plus une barre d'onglets
// avec un état en mémoire (08/09/2026, ancienne version) mais la page
// d'accueil en liste de Bureau ; ses six écrans sont de vraies pages
// filles (voir lib/sectionsBureau.tsx pour la liste et
// lib/routesBureau.ts pour les adresses).
// 26/09/2026, demande Bourama : la liste elle-même (+ le bouton "je
// suis prof" au-dessus) est déléguée à BureauAccueil, qui a besoin
// d'être un Client Component pour lire/écrire ce réglage.
export default function PageBureau() {
  return (
    <SectionPage title="Bureau">
      <BureauAccueil />
    </SectionPage>
  );
}
