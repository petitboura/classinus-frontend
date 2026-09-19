"use client";

import { useState } from "react";
import { EspaceControleSession } from "./EspaceControleSession";
import { EspaceTempsEcran } from "./EspaceTempsEcran";
import { OngletsSegment } from "./OngletsSegment";

/**
 * Écran "Concentration", 26/08/2026 (demande Bourama : brancher Temps
 * d'écran dans le même onglet que Contrôle de session, en deux
 * sous-sections). Nom du grand écran choisi par Claude (les deux
 * sous-sections tournent autour de la concentration de l'étudiant : couper
 * les distractions pendant une session, et voir où part son temps) : facile
 * à renommer si Bourama préfère autre chose, c'est juste ce titre-ci en une
 * seule chaîne dans page.tsx.
 *
 * Onglets passés en composant partagé OngletsSegment le 31/08/2026,
 * voir OngletsSegment.tsx (fini le pattern soulignement web).
 */

// 19/09/2026, demande Bourama : Concentration fonctionne comme
// Personnaliser Clovis. La vraie page /controle-session est maintenant une
// liste et ses deux écrans sont de vraies pages (voir
// lib/sectionsConcentration.tsx). Ce composant à onglets sert désormais
// seulement à la fenêtre flottante du chat (components/chat/
// FenetresSections.tsx), où il n'y a pas de route.
type SousSection = "session" | "temps-ecran";

export function EspaceConcentration() {
  const [sousSection, setSousSection] = useState<SousSection>("session");

  return (
    <div className="flex flex-col gap-4">
      <OngletsSegment
        ariaLabel="Section Concentration"
        valeur={sousSection}
        onChange={(v) => setSousSection(v as SousSection)}
        onglets={[
          { valeur: "session", libelle: "Contrôle de session" },
          { valeur: "temps-ecran", libelle: "Temps d'écran" },
        ]}
      />

      {sousSection === "session" ? <EspaceControleSession /> : <EspaceTempsEcran />}
    </div>
  );
}
