import { SectionPageBureau } from "@/components/SectionPageBureau";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 26/09/2026, demande Bourama : éditeur de code type Thonny dans Bureau,
// dont la bibliothèque privée joue le rôle d'explorateur de fichiers.
// Chantier A du découpage en 3 (voir lib/langagesEditeur.ts et
// components/bureau/EditeurCode.tsx) -- indépendant des ponts chat et de
// la traduction des erreurs, qui viendront s'y brancher séparément.
export default function PageBureauEditeur() {
  const cle = ROUTES_BUREAU.editeur;
  return (
    <SectionPageBureau title={titreSection(cle)}>
      {contenuSection(cle)}
    </SectionPageBureau>
  );
}
