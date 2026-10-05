"use client";

import { useState } from "react";
import { ListOrdered, Scale, UserCog, Feather } from "lucide-react";
import { OngletsSegment } from "@/components/OngletsSegment";
import { ConfigurationCategorie } from "@/components/bureau/ConfigurationCategorie";
import { texteConfiguration } from "@/lib/i18n/textesConfiguration";
import type { CategorieConfiguration } from "@/lib/api";

const AGENT_ID = "clovis";

// 29/09/2026, demande Bourama : une icône propre par catégorie (aucune
// réutilisée ailleurs dans le projet, voir lib/sectionsBureau.tsx pour
// ClipboardList), utilisée sur l'onglet et dans l'éditeur. Jamais une
// histoire de couleur, juste une identité visuelle cohérente par
// catégorie.
const ICONES: Record<CategorieConfiguration, typeof ListOrdered> = {
  procedure: ListOrdered,
  regle: Scale,
  comportement: UserCog,
  style: Feather,
};

// 28/09/2026, demande Bourama : 4 vrais onglets séparés (même composant
// OngletsSegment que EspaceBibliotheque, EspaceConcentration et
// MesComportements). Chaque catégorie a ensuite son propre éditeur, son
// propre bouton d'ajout et sa propre façon de s'afficher, voir
// ConfigurationCategorie.tsx. Une seule page (pas 4 routes) : cet écran
// n'a aucun besoin d'indexation Google, donc pas de raison de multiplier
// les adresses.
export function ConfigurationBureau() {
  const [onglet, setOnglet] = useState<CategorieConfiguration>("procedure");

  return (
    <div className="flex flex-col gap-4">
      <OngletsSegment
        ariaLabel={texteConfiguration("ariaCategorie")}
        valeur={onglet}
        onChange={(v) => setOnglet(v as CategorieConfiguration)}
        onglets={[
          { valeur: "procedure", libelle: texteConfiguration("onglet.procedure"), icone: ListOrdered },
          { valeur: "regle", libelle: texteConfiguration("onglet.regle"), icone: Scale },
          { valeur: "comportement", libelle: texteConfiguration("onglet.comportement"), icone: UserCog },
          { valeur: "style", libelle: texteConfiguration("onglet.style"), icone: Feather },
        ]}
      />

      <ConfigurationCategorie key={onglet} agentId={AGENT_ID} categorie={onglet} Icone={ICONES[onglet]} />
    </div>
  );
}
