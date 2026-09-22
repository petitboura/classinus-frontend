import { SectionPage } from "@/components/SectionPage";
import { BibliothequePublique } from "@/components/BibliothequePublique";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBibliotheque } from "@/lib/sectionsBibliotheque";

// 19/09/2026, demande Bourama : ancien onglet Publique de la Bibliothèque,
// devenu une vraie page. Elle affiche BibliothequePublique directement,
// sans passer par EspaceBibliotheque, pour ne pas charger pour rien les
// fichiers perso.
export default function PageBibliothequePublique() {
  return (
    <SectionPage title="Publique" groupe={groupeBibliotheque()}>
      <DefinirInfoSection id="bibliotheque-publique" />
      <BibliothequePublique />
    </SectionPage>
  );
}
