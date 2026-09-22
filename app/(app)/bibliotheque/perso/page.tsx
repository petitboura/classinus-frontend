import { SectionPage } from "@/components/SectionPage";
import { EspaceBibliotheque } from "@/components/EspaceBibliotheque";
import { groupeBibliotheque } from "@/lib/sectionsBibliotheque";

// 19/09/2026, demande Bourama : ancien onglet Perso de la Bibliothèque,
// devenu une vraie page. Cette adresse cohabite avec
// bibliotheque/perso/[id] (fichier perso partagé) sans conflit : la page
// de liste n'a pas d'identifiant.
export default function PageBibliothequePerso() {
  return (
    <SectionPage title="Perso" groupe={groupeBibliotheque()}>
      <EspaceBibliotheque sansOnglets />
    </SectionPage>
  );
}
