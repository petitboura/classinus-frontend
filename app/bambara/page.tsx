"use client";

import dynamic from "next/dynamic";

// Page bambara (16/11/2026, demande de Bourama) : la bulle et le micro, rien d'autre. Chargée côté
// navigateur seulement : elle ouvre le micro et le son, qui n'existent pas sur le serveur.
const PageBambaraClient = dynamic(() => import("@/components/bambara/PageBambaraClient"), {
  ssr: false,
  loading: () => null,
});

export default function PageBambara() {
  return <PageBambaraClient />;
}
