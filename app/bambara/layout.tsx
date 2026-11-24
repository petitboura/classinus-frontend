import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { estHoteMaame } from "@/lib/maame";

// Maame (23/11/2026) : sur l'adresse de Maame, l'onglet et l'écran d'accueil du téléphone portent le nom et le logo de Maame.
// headers() n'existe pas dans l'export statique de l'appli native (Capacitor), qui n'est jamais Maame.
function surAdresseMaame(): boolean {
  return process.env.CAPACITOR_BUILD !== "true" && estHoteMaame(headers().get("host"));
}

// 24/11/2026, demande de Bourama : Maame se présente avec sa propre description, sa propre adresse canonique et sa
// propre image de partage (public/maame/partage.png), au lieu de celles de Classinus. Les adresses sont absolues
// et prises sur l'adresse visitée, car la base des métadonnées du site (layout racine) est celle de Classinus.
const DESCRIPTION_MAAME =
  "Maame est un assistant vocal en bambara : parle, Maame te répond à voix haute, avec des vidéos et des images.";

export function generateMetadata(): Metadata {
  if (!surAdresseMaame()) return {};
  const hote = headers().get("host") || "maame.classinus.com";
  const base = `https://${hote}`;
  const image = { url: `${base}/maame/partage.png`, width: 1200, height: 630, alt: "Maame, parle, Maame te répond." };
  return {
    title: "Maame",
    description: DESCRIPTION_MAAME,
    applicationName: "Maame",
    alternates: { canonical: `${base}/` },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "Maame" },
    icons: { icon: "/maame/icone-192.png", apple: "/maame/apple-icon.png" },
    openGraph: {
      title: "Maame",
      siteName: "Maame",
      description: DESCRIPTION_MAAME,
      url: `${base}/`,
      type: "website",
      locale: "fr_FR",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: "Maame", description: DESCRIPTION_MAAME, images: [image.url] },
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
