"use client";

import dynamic from "next/dynamic";
import { PorteInstallationMaame } from "@/components/bambara/PorteInstallationMaame";

// Page bambara (16/11/2026, demande de Bourama) : la bulle et le micro, rien d'autre. Chargée côté
// navigateur seulement : elle ouvre le micro et le son, qui n'existent pas sur le serveur.
const PageBambaraClient = dynamic(() => import("@/components/bambara/PageBambaraClient"), {
  ssr: false,
  loading: () => null,
});

export default function PageBambara() {
  // Sur l'adresse de Maame, un gros bouton « Installer » passe avant la page tant que l'appli n'est pas installée
  // (24/11/2026, demande de Bourama). Ailleurs, et une fois installée, la porte laisse passer tout de suite.
  return (
    <PorteInstallationMaame>
      <PageBambaraClient />
    </PorteInstallationMaame>
  );
}
