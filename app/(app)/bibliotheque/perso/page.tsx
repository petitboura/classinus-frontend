import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";
import { groupeBibliotheque } from "@/lib/sectionsBibliotheque";

// 19/09/2026, demande Bourama : ancien onglet Perso de la Bibliothèque,
// devenu une vraie page. Cette adresse cohabite avec
// bibliotheque/perso/[id] (fichier perso partagé) sans conflit : la page
// de liste n'a pas d'identifiant.
export default function PageBibliothequePerso() {
  const cle = ROUTES_BIBLIOTHEQUE.perso;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupeBibliotheque()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
