"use client";

import { LogoDeSite } from "@/components/LogoDeSite";
import { domaineSiteMcp, initialesMcp } from "@/lib/logoMcp";

// Logo d'une MCP personnalisée (28/10/2026, demande Bourama), à poser dans le cadre carré d'une carte.
// Le vrai logo du site du serveur s'il existe, sinon les lettres du nom (voir lib/logoMcp.ts), jamais
// une icône générique. Toute la logique d'affichage est dans components/LogoDeSite.tsx, la même que
// pour les logos des lignes d'outils du chat (29/10/2026).
export function LogoMcp({
  nom,
  url,
  autresNoms,
  taille,
}: {
  nom: string;
  url: string | null | undefined;
  /** Noms des autres serveurs de la personne : sert à allonger les lettres quand deux commencent pareil. */
  autresNoms?: string[];
  taille: number;
}) {
  return <LogoDeSite domaine={domaineSiteMcp(url)} lettres={initialesMcp(nom, autresNoms)} taille={taille} />;
}
