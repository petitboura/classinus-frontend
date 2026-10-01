import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";
import { groupeBibliotheque } from "@/lib/sectionsBibliotheque";

// 19/09/2026, demande Bourama : ancien onglet Dossiers du téléphone de la
// Bibliothèque, devenu une vraie page. Le composant gère lui même le cas
// où l'on n'est pas dans l'appli mobile (il l'indique à l'écran), donc
// aucune condition à ajouter ici. Pas de rubrique d'aide pour cette page,
// comme pour l'ancien onglet.
export default function PageBibliothequeTelephone() {
  const cle = ROUTES_BIBLIOTHEQUE.telephone;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupeBibliotheque()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
