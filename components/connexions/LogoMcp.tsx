"use client";

import { useState } from "react";
import { domaineSiteMcp, initialesMcp } from "@/lib/logoMcp";
import { logoPourDomaine } from "@/lib/logosSites";

// Logo d'une MCP personnalisée (28/10/2026, demande Bourama), à poser dans le cadre carré d'une carte.
// Même source que les logos des sources du chat (LogoSite) : un vrai fichier de logo si on l'a, sinon
// l'icône que le site du serveur publie lui-même, qui apparaît en fondu. Tant qu'elle n'est pas là, et
// si le site n'en a pas, ce sont les lettres du nom qui s'affichent (voir lib/logoMcp.ts), jamais une
// icône générique de prise.
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
  const domaine = domaineSiteMcp(url);
  const lettres = initialesMcp(nom, autresNoms);
  // L'état se rapporte à un site précis : si l'adresse change (modification du serveur), il ne vaut plus.
  const [etat, setEtat] = useState({ domaine: "", charge: false, erreur: false });
  const charge = etat.domaine === domaine && etat.charge;
  const enErreur = etat.domaine === domaine && etat.erreur;

  const Vrai = domaine ? logoPourDomaine(domaine) : null;
  const iconeVisible = !!Vrai || (charge && !enErreur);
  const police = Math.round(taille * (lettres.length <= 1 ? 0.9 : lettres.length === 2 ? 0.72 : 0.56));

  return (
    <span aria-hidden="true" className="relative flex items-center justify-center" style={{ width: taille, height: taille }}>
      <span
        style={{ fontSize: police }}
        className={`font-semibold leading-none tracking-tight text-dj-texte transition-opacity duration-300 ease-out ${iconeVisible ? "opacity-0" : "opacity-100"}`}
      >
        {lettres}
      </span>
      {Vrai && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Vrai size={taille} />
        </span>
      )}
      {!Vrai && domaine && !enErreur && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={domaine}
          ref={(img) => {
            // Image déjà en cache : l'événement de chargement peut être passé avant l'accroche de React.
            if (img && !charge && img.complete && img.naturalWidth > 0) setEtat({ domaine, charge: true, erreur: false });
          }}
          src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domaine)}`}
          alt=""
          width={taille}
          height={taille}
          onLoad={() => setEtat({ domaine, charge: true, erreur: false })}
          onError={() => setEtat({ domaine, charge: false, erreur: true })}
          className={`absolute inset-0 rounded-[3px] transition-opacity duration-300 ease-out ${charge ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
