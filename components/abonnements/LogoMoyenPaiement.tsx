"use client";

import { useState } from "react";

// Vrais logos des moyens de paiement du parcours de paiement (19/11/2026, demande de Bourama).
// Les fichiers sont dans public/logos-paiement/. PayPal, Visa et Mastercard viennent du paquet open source
// simple-icons (couleurs officielles) ; Orange Money et Wave sont les logos envoyés par Bourama. Un moyen
// peut avoir plusieurs logos (la carte bancaire : Visa et Mastercard). Pour ajouter ou remplacer un logo, il
// suffit de déposer le fichier dans ce dossier sous le nom indiqué ci-dessous. Tant qu'un fichier manque, rien
// n'est affiché à sa place, jamais une image cassée. Les logos sont posés sur une pastille blanche pour rester
// lisibles sur le fond sombre, et la hauteur est réglée par logo car certains contiennent leur nom en toutes lettres.
type LogoFichier = { fichier: string; haut: string };

const LOGOS_PAR_MOYEN: Record<string, LogoFichier[]> = {
  carte: [
    { fichier: "visa.svg", haut: "h-5" },
    { fichier: "mastercard.svg", haut: "h-5" },
  ],
  paypal: [{ fichier: "paypal.svg", haut: "h-5" }],
  orange_money: [{ fichier: "orange_money.png", haut: "h-7" }],
  wave: [{ fichier: "wave.png", haut: "h-6" }],
};

function Pastille({ fichier, haut }: LogoFichier) {
  const [absent, setAbsent] = useState(false);
  if (absent) return null;
  return (
    <span className="flex h-9 min-w-12 items-center justify-center rounded-md bg-white px-1.5">
      <img
        src={`/logos-paiement/${fichier}`}
        alt=""
        className={`${haut} w-auto max-w-[6.5rem] object-contain`}
        onError={() => setAbsent(true)}
      />
    </span>
  );
}

export function LogoMoyenPaiement({ id }: { id: string }) {
  const logos = LOGOS_PAR_MOYEN[id] ?? [];
  if (logos.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {logos.map((l) => (
        <Pastille key={l.fichier} {...l} />
      ))}
    </span>
  );
}
