import { SectionPage } from "@/components/SectionPage";
import { EspaceEtablissements } from "@/components/EspaceEtablissements";
import { groupeBureau } from "@/lib/sectionsBureau";

// 19/09/2026, demande Bourama : ancien onglet "Établissements" de Bureau,
// devenu une vraie page. Cet écran n'a pas de bouton "i" : sa phrase
// d'explication reste affichée dans la carte. La page /etablissements
// existait déjà avec le même écran, elle est conservée telle quelle ;
// c'est la fiche d'un établissement (/etablissements/[id]) qui ramène
// maintenant ici.
export default function PageBureauEtablissements() {
  return (
    <SectionPage title="Établissements" groupe={groupeBureau()}>
      <EspaceEtablissements />
    </SectionPage>
  );
}
