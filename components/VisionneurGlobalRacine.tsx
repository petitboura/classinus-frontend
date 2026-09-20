"use client";

import dynamic from "next/dynamic";

// 20/09/2026, demande Bourama : l'aperçu interne (liens qui veulent sortir,
// sources citées) doit marcher sur TOUTES les pages, pas seulement dans le
// chat où il était monté jusqu'ici (ChatIA.tsx). Il est donc monté une
// seule fois ici, dans le layout racine, et ChatIA.tsx ne le monte plus
// (sinon deux fenêtres s'ouvriraient en même temps).
//
// Chargé en ssr:false pour la même raison qu'avant : pdfjs-dist touche des
// API navigateur dès son import et casserait le rendu serveur. Sans
// incidence visible : le composant ne rend rien tant qu'aucun aperçu n'a
// été demandé.
const VisionneurPositionGlobal = dynamic(
  () => import("./chat/VisionneurPositionGlobal").then((m) => m.VisionneurPositionGlobal),
  { ssr: false }
);

export function VisionneurGlobalRacine() {
  return <VisionneurPositionGlobal />;
}
