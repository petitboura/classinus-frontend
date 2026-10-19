"use client";

import { EspaceConnecterClaude } from "@/components/EspaceConnecterClaude";
import { EspaceConnecterThonny } from "@/components/EspaceConnecterThonny";
import { contenuSection } from "@/lib/contenuSections";
import type { CleFenetre } from "@/lib/contexteFenetres";

// Contenu d'une fenêtre flottante du chat. Fichier à part, chargé seulement
// quand une fenêtre s'ouvre (voir FenetresSections.tsx) : toutes les
// sous-sections y sont importées, les mettre dans le chargement de départ
// de l'appli l'alourdirait pour rien.
export default function ContenuFenetre({ cle }: { cle: CleFenetre }) {
  if (cle === "claude") return <EspaceConnecterClaude />;
  if (cle === "thonny") return <EspaceConnecterThonny />;
  return <>{contenuSection(cle)}</>;
}
