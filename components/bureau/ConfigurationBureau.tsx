"use client";

import { useState } from "react";
import { ListOrdered, Scale, UserCog, Feather } from "lucide-react";
import { OngletsSegment } from "@/components/OngletsSegment";
import { ConfigurationCategorie } from "@/components/bureau/ConfigurationCategorie";
import { texteConfiguration } from "@/lib/i18n/textesConfiguration";
import type { CategorieConfiguration } from "@/lib/api";

const AGENT_ID = "clovis";

// 29/09/2026, demande Bourama ("chacune doivent être différente entre
// elle et fidèle à elle même... l'user doit croire que procédure, règle,
// style et comportement sont chacune différentes des autres") : une
// icône propre par catégorie (aucune réutilisée ailleurs dans le projet,
// voir lib/sectionsBureau.tsx pour ClipboardList), utilisée à la fois
// sur l'onglet, le bouton "+" ET dans l'éditeur -- jamais une histoire
// de couleur, juste une identité visuelle cohérente par catégorie.
const ICONES: Record<CategorieConfiguration, typeof ListOrdered> = {
  procedure: ListOrdered,
  regle: Scale,
  comportement: UserCog,
  style: Feather,
};

const PLACEHOLDERS: Record<CategorieConfiguration, string> = {
  procedure: "Ex : 1) vérifie le niveau de l'élève, 2) propose un exercice adapté, 3) corrige pas à pas",
  regle: "Ex : toujours répondre en français",
  comportement: "Ex : rester patient et encourageant même si l'élève se trompe plusieurs fois",
  style: "Ex : phrases courtes, ton chaleureux, jamais de jargon technique",
};

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
          { valeur: "procedure", libelle: texteConfiguration("onglet.procedure"), icone: ListOrdered },
          { valeur: "regle", libelle: texteConfiguration("onglet.regle"), icone: Scale },
          { valeur: "comportement", libelle: texteConfiguration("onglet.comportement"), icone: UserCog },
          { valeur: "style", libelle: texteConfiguration("onglet.style"), icone: Feather },
        ]}
      />

      {onglet === "procedure" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="procedure"
          libelleNouveau={texteConfiguration("bouton.nouveau.procedure")}
          texteVide={texteConfiguration("vide.procedure")}
          placeholderTexte={PLACEHOLDERS.procedure}
          Icone={ICONES.procedure}
        />
      )}
      {onglet === "regle" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="regle"
          libelleNouveau={texteConfiguration("bouton.nouveau.regle")}
          texteVide={texteConfiguration("vide.regle")}
          placeholderTexte={PLACEHOLDERS.regle}
          Icone={ICONES.regle}
        />
      )}
      {onglet === "comportement" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="comportement"
          libelleNouveau={texteConfiguration("bouton.nouveau.comportement")}
          texteVide={texteConfiguration("vide.comportement")}
          placeholderTexte={PLACEHOLDERS.comportement}
          Icone={ICONES.comportement}
        />
      )}
      {onglet === "style" && (
        <ConfigurationCategorie
          agentId={AGENT_ID}
          categorie="style"
          libelleNouveau={texteConfiguration("bouton.nouveau.style")}
          texteVide={texteConfiguration("vide.style")}
          placeholderTexte={PLACEHOLDERS.style}
          Icone={ICONES.style}
        />
      )}
    </div>
  );
}
