"use client";

import { useState } from "react";
import { OngletsSegment } from "@/components/OngletsSegment";
import { ConfigurationCategorie } from "@/components/bureau/ConfigurationCategorie";
import { texteConfiguration } from "@/lib/i18n/textesConfiguration";
import type { CategorieConfiguration } from "@/lib/api";

const AGENT_ID = "clovis";

// 28/09/2026, demande Bourama : "ils sont chacun des onglets à part
// visuellement" -- 4 vrais onglets séparés (même composant OngletsSegment
// que EspaceBibliotheque/EspaceConcentration/MesComportements, aucun
// nouveau style inventé), chacun avec sa propre liste et son propre
// bouton "+". Une seule page (pas 4 routes) : contrairement aux pages
// publiques /decouvrir, cet écran n'a aucun besoin d'indexation Google,
// donc pas de raison de multiplier les adresses.
export function ConfigurationBureau() {
  const [onglet, setOnglet] = useState<CategorieConfiguration>("procedure");

  return (
    <div className="flex flex-col gap-4">
      <OngletsSegment
        ariaLabel="Catégorie de configuration"
        valeur={onglet}
        onChange={(v) => setOnglet(v as CategorieConfiguration)}
        onglets={[
          { valeur: "procedure", libelle: texteConfiguration("onglet.procedure") },
          { valeur: "regle", libelle: texteConfiguration("onglet.regle") },
          { valeur: "comportement", libelle: texteConfiguration("onglet.comportement") },
          { valeur: "style", libelle: texteConfiguration("onglet.style") },
        ]}
      />

      {onglet === "procedure" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="procedure"
          libelleNouveau={texteConfiguration("bouton.nouveau.procedure")}
          texteVide={texteConfiguration("vide.procedure")}
        />
      )}
      {onglet === "regle" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="regle"
          libelleNouveau={texteConfiguration("bouton.nouveau.regle")}
          texteVide={texteConfiguration("vide.regle")}
        />
      )}
      {onglet === "comportement" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="comportement"
          libelleNouveau={texteConfiguration("bouton.nouveau.comportement")}
          texteVide={texteConfiguration("vide.comportement")}
        />
      )}
      {onglet === "style" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="style"
          libelleNouveau={texteConfiguration("bouton.nouveau.style")}
          texteVide={texteConfiguration("vide.style")}
        />
      )}
    </div>
  );
}
