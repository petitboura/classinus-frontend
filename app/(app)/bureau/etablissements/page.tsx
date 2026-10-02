import { SectionPageBureau } from "@/components/SectionPageBureau";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 19/09/2026, demande Bourama : ancien onglet "Établissements" de Bureau,
// devenu une vraie page. Cet écran n'a pas de bouton "i" : sa phrase
// d'explication reste affichée dans la carte. La page /etablissements
// existait déjà avec le même écran, elle est conservée telle quelle ;
// c'est la fiche d'un établissement (/etablissements/[id]) qui ramène
// maintenant ici.
export default function PageBureauEtablissements() {
  const cle = ROUTES_BUREAU.etablissements;
  return (
    <SectionPageBureau title={titreSection(cle)}>
      {contenuSection(cle)}
    </SectionPageBureau>
  );
}
