import { SectionPage } from "@/components/SectionPage";
import { BibliothequePublique } from "@/components/BibliothequePublique";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBibliotheque } from "@/lib/sectionsBibliotheque";

// 19/09/2026, demande Bourama : ancien onglet Publique de la Bibliothèque,
// devenu une vraie page. Elle affiche BibliothequePublique directement,
// sans passer par EspaceBibliotheque, pour ne pas charger pour rien les
// fichiers perso. Cette adresse est une page de liste réservée aux
// comptes : le mot "publique" est réservé, voir lib/routesPubliques.ts,
// pour qu'il ne soit jamais pris pour l'identifiant d'un document partagé
// (bibliotheque/[id]).
export default function PageBibliothequePublique() {
  return (
    <SectionPage title="Publique" groupe={groupeBibliotheque()}>
      <DefinirInfoSection id="bibliotheque-publique" />
      <BibliothequePublique />
    </SectionPage>
  );
}
