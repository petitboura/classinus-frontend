"use client";

import { useState } from "react";

// Vrais logos des moyens de paiement du parcours de paiement (19/11/2026, demande de Bourama).
// Les fichiers sont dans public/logos-paiement/ (PayPal, Visa et Mastercard viennent du paquet open source
// simple-icons, aux couleurs officielles). Un moyen peut avoir plusieurs logos (la carte bancaire : Visa et
// Mastercard). Pour ajouter ou remplacer un logo, il suffit de déposer le fichier <nom>.svg dans ce dossier
// avec le nom attendu ci-dessous. Tant qu'un fichier manque, rien n'est affiché à sa place, jamais une image
// cassée. Les logos sont posés sur une pastille blanche pour rester lisibles sur le fond sombre.
const LOGOS_PAR_MOYEN: Record<string, string[]> = {
  carte: ["visa", "mastercard"],
  paypal: ["paypal"],
  orange_money: ["orange_money"],
  wave: ["wave"],
};

function Pastille({ fichier }: { fichier: string }) {
  const [absent, setAbsent] = useState(false);
  if (absent) return null;
  return (
    <span className="flex h-8 w-12 items-center justify-center rounded-md bg-white px-1.5">
      <img
        src={`/logos-paiement/${fichier}.svg`}
        alt=""
        className="max-h-5 w-full object-contain"
        onError={() => setAbsent(true)}
      />
    </span>
  );
}

export function LogoMoyenPaiement({ id }: { id: string }) {
  const fichiers = LOGOS_PAR_MOYEN[id] ?? [];
  if (fichiers.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      {fichiers.map((f) => (
        <Pastille key={f} fichier={f} />
      ))}
    </span>
  );
}
