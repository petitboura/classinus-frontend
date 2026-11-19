"use client";

import type { CSSProperties } from "react";

// Vrais logos des moyens de paiement du parcours de paiement (19/11/2026, demande de Bourama). Pas de fond
// blanc autour : chaque logo s'adapte au thème clair ou sombre. Les fichiers sont dans public/logos-paiement/.
// - Visa et PayPal (paquet open source simple-icons) : une seule couleur, celle du texte du thème.
// - Mastercard (simple-icons) : sa couleur officielle, lisible sur les deux thèmes.
// - Orange Money : seulement les deux flèches, sans le texte. La flèche orange garde sa couleur, la flèche
//   noire prend la couleur du texte du thème (elle serait invisible en thème sombre sinon).
// - Wave : seulement le pingouin, sans le texte, il a son propre fond bleu.
// Les logos envoyés par Bourama (Orange Money, Wave) ont été découpés à partir de ses fichiers d'origine.

function masque(fichier: string): CSSProperties {
  const url = `url(/logos-paiement/${fichier})`;
  return {
    backgroundColor: "currentColor",
    WebkitMaskImage: url,
    maskImage: url,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  };
}

function Monochrome({ fichier, classe }: { fichier: string; classe: string }) {
  return <span aria-hidden style={masque(fichier)} className={`inline-block shrink-0 text-dj-texte ${classe}`} />;
}

function LogoImage({ fichier, classe }: { fichier: string; classe: string }) {
  return <img src={`/logos-paiement/${fichier}`} alt="" draggable={false} className={`shrink-0 ${classe}`} />;
}

function OrangeMoney() {
  return (
    <span aria-hidden className="relative inline-block h-6 w-12 shrink-0">
      <img
        src="/logos-paiement/orange_money_fleche_orange.png"
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <span
        style={masque("orange_money_fleche_noire.png")}
        className="absolute inset-0 text-dj-texte"
      />
    </span>
  );
}

function logosDe(id: string) {
  switch (id) {
    case "carte":
      return (
        <>
          <Monochrome fichier="visa.svg" classe="h-10 w-10" />
          <LogoImage fichier="mastercard.svg" classe="h-9 w-9" />
        </>
      );
    case "paypal":
      return <Monochrome fichier="paypal.svg" classe="h-7 w-7" />;
    case "orange_money":
      return <OrangeMoney />;
    case "wave":
      return <LogoImage fichier="wave.png" classe="h-8 w-8 object-contain" />;
    default:
      return null;
  }
}

// Zone de largeur fixe : les noms des moyens restent alignés d'une ligne à l'autre.
export function LogoMoyenPaiement({ id }: { id: string }) {
  const logos = logosDe(id);
  if (!logos) return null;
  return <span className="flex h-10 w-24 shrink-0 items-center gap-1">{logos}</span>;
}
