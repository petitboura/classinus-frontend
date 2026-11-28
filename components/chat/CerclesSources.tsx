"use client";

import { LogoSite } from "./LogoSite";

// Petits cercles de sources posés sur la ligne d'un outil (28/11/2026, demande Bourama) : plus de
// noms ni de puces, seulement les logos des sites en cercles qui se chevauchent, puis le nombre
// de sites restants (« +2 »). Posés sur la ligne de l'outil juste avant la flèche, ils servent de
// bouton pour déplier les sources de CET outil : le bouton est dans LigneOutil.tsx, les cercles
// eux-mêmes sont purement visuels.

// Nombre maximal de cercles montrés avant le compteur.
const CERCLES_MAX = 5;
const TAILLE_CERCLE = 16;
const TAILLE_LOGO = 12;

function domaineDe(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function CerclesSources({ sources }: { sources: { url: string }[] }) {
  // Un cercle par site, dans l'ordre des sources : deux pages du même site ne donnent qu'un logo.
  const domaines: string[] = [];
  for (const source of sources) {
    const domaine = domaineDe(source.url);
    if (domaine && !domaines.includes(domaine)) domaines.push(domaine);
  }
  if (!domaines.length) return null;

  const montres = domaines.slice(0, CERCLES_MAX);
  // Le compteur compte les sites, comme les cercles : « +2 » = deux sites de plus que ceux dont
  // le logo est visible.
  const reste = domaines.length - montres.length;

  return (
    <span className="flex shrink-0 items-center" aria-hidden="true">
      <span className="flex items-center">
        {montres.map((domaine, index) => (
          <span
            key={domaine}
            title={domaine}
            style={{ width: TAILLE_CERCLE, height: TAILLE_CERCLE, marginLeft: index === 0 ? 0 : -5, zIndex: montres.length - index }}
            className="relative flex items-center justify-center overflow-hidden rounded-full border border-dj-bordure bg-dj-fond"
          >
            <LogoSite domaine={domaine} size={TAILLE_LOGO} />
          </span>
        ))}
      </span>
      {reste > 0 && <span className="ml-1.5 text-[12px] leading-none text-dj-texte-muet">+{reste}</span>}
    </span>
  );
}
