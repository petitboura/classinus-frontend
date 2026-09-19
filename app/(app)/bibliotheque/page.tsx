import { SectionPage } from "@/components/SectionPage";
import { ListeSections } from "@/components/ListeSections";
import { SECTIONS_BIBLIOTHEQUE } from "@/lib/sectionsBibliotheque";

// 19/09/2026, demande Bourama : la Bibliothèque fonctionne comme
// Personnaliser Clovis. Cette page n'est plus la bibliothèque elle même
// mais sa page d'accueil en liste ; Perso, Publique et Dossiers du
// téléphone, qui étaient des onglets, sont de vraies pages filles (voir
// lib/sectionsBibliotheque.tsx pour la liste et lib/routesBibliotheque.ts
// pour les adresses).
export default function PageBibliotheque() {
  return (
    <SectionPage title="Bibliothèque">
      <ListeSections sections={SECTIONS_BIBLIOTHEQUE} />
    </SectionPage>
  );
}
