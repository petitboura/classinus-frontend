"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { logoPourDomaine, normaliserDomaine } from "@/lib/logosSites";

// Logo d'un site ou d'une source visée par un outil du chat (21/10/2026,
// demande Bourama). Deux cas :
// - on a un vrai fichier de logo pour ce domaine (lib/logosSites.ts) : on
//   l'affiche tel quel ;
// - sinon, l'icône que le site publie lui-même (service public Google, même
//   principe que les sources dans SourcesBulle.tsx), qui apparaît en fondu
//   plutôt que d'un coup. Si elle ne peut pas se charger (hors ligne, site
//   sans icône), le globe générique prend le relais.
export function LogoSite({ domaine, size = 13, className = "" }: { domaine: string; size?: number; className?: string }) {
  const [enErreur, setEnErreur] = useState(false);
  const [charge, setCharge] = useState(false);

  const Logo = logoPourDomaine(domaine);
  if (Logo) return <Logo size={size} className={`shrink-0 ${className}`} />;

  const nom = normaliserDomaine(domaine);
  if (enErreur || !nom) return <Globe size={size} className={`shrink-0 text-dj-texte-muet ${className}`} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={(img) => {
        // Image déjà en cache : l'événement de chargement peut être passé avant
        // l'accroche de React, on le constate ici.
        if (img && !charge && img.complete && img.naturalWidth > 0) setCharge(true);
      }}
      src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(nom)}`}
      alt=""
      width={size}
      height={size}
      onLoad={() => setCharge(true)}
      onError={() => setEnErreur(true)}
      className={`shrink-0 rounded-[2px] transition-opacity duration-300 ease-out ${charge ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}

// Rangée de logos quand un outil vise plusieurs sites à la fois (recherche de
// document dans toutes les bibliothèques, extraction de plusieurs pages) :
// petite, posée à côté du libellé de la ligne.
export function LogosSites({ domaines, size = 12 }: { domaines: string[]; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      {domaines.map((domaine) => (
        <span key={domaine} title={domaine} className="inline-flex">
          <LogoSite domaine={domaine} size={size} />
        </span>
      ))}
    </span>
  );
}
