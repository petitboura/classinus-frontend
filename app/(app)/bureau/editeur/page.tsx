import { SectionPageBureau } from "@/components/SectionPageBureau";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { EditeurCode } from "@/components/bureau/EditeurCode";

// 26/09/2026, demande Bourama : éditeur de code type Thonny dans Bureau,
// dont la bibliothèque privée joue le rôle d'explorateur de fichiers.
// Chantier A du découpage en 3 (voir lib/langagesEditeur.ts et
// components/bureau/EditeurCode.tsx) -- indépendant des ponts chat et de
// la traduction des erreurs, qui viendront s'y brancher séparément.
export default function PageBureauEditeur() {
  return (
    <SectionPageBureau title="Éditeur de code">
      <DefinirInfoSection id="editeur-code" />
      <EditeurCode />
    </SectionPageBureau>
  );
}
