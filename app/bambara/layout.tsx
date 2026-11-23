import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { estHoteMaame } from "@/lib/maame";

// Maame (23/11/2026) : sur l'adresse de Maame, l'onglet et l'écran d'accueil du téléphone portent le nom et le logo de Maame.
// headers() n'existe pas dans l'export statique de l'appli native (Capacitor), qui n'est jamais Maame.
function surAdresseMaame(): boolean {
  return process.env.CAPACITOR_BUILD !== "true" && estHoteMaame(headers().get("host"));
}

export function generateMetadata(): Metadata {
  if (!surAdresseMaame()) return {};
  return {
    title: "Maame",
    description: "Parle, Maame te répond.",
    applicationName: "Maame",
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Maame" },
    icons: { icon: "/maame/icone-192.png", apple: "/maame/apple-icon.png" },
    openGraph: { title: "Maame", siteName: "Maame", description: "Parle, Maame te répond." },
    twitter: { card: "summary", title: "Maame", description: "Parle, Maame te répond." },
  };
}

// Page bambara (18/11/2026, demande de Bourama) : le clavier du téléphone se pose par dessus la page au
// lieu de la rétrécir. Sans cela, ouvrir le champ d'écriture écrase la bulle et ce qui est affiché.
// Le décalage du champ et du micro au dessus du clavier est fait par lib/useDecalageClavier.ts.
export function generateViewport(): Viewport {
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    interactiveWidget: "overlays-content",
    ...(surAdresseMaame() ? { themeColor: "#ffffff" } : {}),
  };
}

export default function LayoutBambara({ children }: { children: React.ReactNode }) {
  return children;
}
