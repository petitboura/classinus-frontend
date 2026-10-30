"use client";

import { LogoDeSite } from "@/components/LogoDeSite";
import { lettreDeSite } from "@/lib/logoMcp";

// Logo d'un site ou d'une source visée par un outil du chat (21/10/2026,
// demande Bourama). Deux cas, jamais un troisième (29/10/2026, demande Bourama :
// plus de globe générique) :
// - le vrai logo : un fichier de logo si on en a un pour ce domaine
//   (lib/logosSites.ts), sinon l'icône que le site publie lui-même, vérifiée par
//   le serveur de Classinus et affichée en fondu ;
// - sinon la première lettre du nom du site.
// Toute la logique d'affichage est dans components/LogoDeSite.tsx, la même que pour
// les cartes de connexion.
export function LogoSite({ domaine, size = 13, className = "" }: { domaine: string; size?: number; className?: string }) {
  return <LogoDeSite domaine={domaine} lettres={lettreDeSite(domaine)} taille={size} className={className} />;
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
