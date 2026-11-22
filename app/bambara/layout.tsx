import type { Viewport } from "next";

// Page bambara (18/11/2026, demande de Bourama) : le clavier du téléphone se pose par dessus la page au
// lieu de la rétrécir. Sans cela, ouvrir le champ d'écriture écrase la bulle et ce qui est affiché.
// Le décalage du champ et du micro au dessus du clavier est fait par lib/useDecalageClavier.ts.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default function LayoutBambara({ children }: { children: React.ReactNode }) {
  return children;
}
