"use client";

import { useState } from "react";
import { logoPourDomaine, normaliserDomaine, urlLogoSite } from "@/lib/logosSites";

// Logo d'un site, pour les cartes de connexion et les lignes d'outils du chat (29/10/2026,
// demande Bourama : plus jamais le globe générique, seulement le vrai logo ou une lettre).
// Trois sources, dans cet ordre :
// - un vrai fichier de logo si on en a un pour ce site (lib/logosSites.ts) ;
// - sinon l'icône du site, demandée au serveur de Classinus (route /api/logos-sites). Le
//   serveur vérifie auprès de Google que l'icône existe vraiment : sans icône il répond 404,
//   ce qui n'est pas le cas d'une demande directe à Google, qui envoie alors un globe
//   avec un statut que le navigateur ne signale pas ;
// - sinon la lettre de secours, déjà affichée pendant le chargement : l'icône apparaît
//   en fondu par dessus quand elle arrive, et ne disparaît jamais derrière un globe.
// Une seule logique pour les deux endroits, afin qu'ils ne se contredisent jamais.
export function LogoDeSite({
  domaine,
  lettres,
  taille,
  className = "",
}: {
  /** Site dont on veut le logo, "" ou null si on n'en a pas (la lettre s'affiche seule). */
  domaine: string | null | undefined;
  /** Lettre(s) de secours, déjà prêtes (voir lib/logoMcp.ts). */
  lettres: string;
  taille: number;
  className?: string;
}) {
  const nom = domaine ? normaliserDomaine(domaine) : "";
  // L'état se rapporte à un site précis : si le site change, il ne vaut plus.
  const [etat, setEtat] = useState({ domaine: "", charge: false, erreur: false });
  const charge = etat.domaine === nom && etat.charge;
  const enErreur = etat.domaine === nom && etat.erreur;

  const Vrai = nom ? logoPourDomaine(nom) : null;
  const iconeVisible = !!Vrai || (charge && !enErreur);
  const police = Math.round(taille * (lettres.length <= 1 ? 0.9 : lettres.length === 2 ? 0.72 : 0.56));

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center ${className}`}
      style={{ width: taille, height: taille }}
    >
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
      {!Vrai && nom && !enErreur && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={nom}
          ref={(img) => {
            // Image déjà en cache : l'événement de chargement peut être passé avant l'accroche de React.
            if (img && !charge && img.complete && img.naturalWidth > 0) setEtat({ domaine: nom, charge: true, erreur: false });
          }}
          src={urlLogoSite(nom)}
          alt=""
          width={taille}
          height={taille}
          onLoad={() => setEtat({ domaine: nom, charge: true, erreur: false })}
          onError={() => setEtat({ domaine: nom, charge: false, erreur: true })}
          className={`absolute inset-0 rounded-[3px] transition-opacity duration-300 ease-out ${charge ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}
