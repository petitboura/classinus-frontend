"use client";

import type { CSSProperties } from "react";

// Vrais logos des moyens de paiement du parcours de paiement (demande de Bourama, 19/11/2026, puis 20/11/2026).
// Pas de fond blanc autour : chaque logo s'adapte au thème clair ou sombre.
// - Visa, Mastercard et PayPal sont des dessins SVG écrits directement dans ce fichier (paquet open source
//   simple-icons pour les formes). Ils s'affichent en même temps que l'écran, sans télécharger de fichier,
//   donc plus de logos qui arrivent en retard.
// - Visa : une seule couleur, celle du texte du thème. Mastercard : ses trois couleurs officielles. PayPal :
//   ses deux bleus officiels. Les couleurs de marque restent lisibles sur les deux thèmes.
// - Orange Money : seulement les deux flèches, sans le texte. La flèche orange garde sa couleur, la flèche
//   noire prend la couleur du texte du thème (elle serait invisible en thème sombre sinon).
// - Wave : seulement le pingouin, sans le texte, il a son propre fond bleu.
// Les logos envoyés par Bourama (Orange Money, Wave) sont des images dans public/logos-paiement/ : elles sont
// préchargées dès l'ouverture du parcours par prechargerLogosPaiement().

const IMAGES_A_PRECHARGER = [
  "wave.png",
  "orange_money_fleche_orange.png",
  "orange_money_fleche_noire.png",
];

// À appeler dès l'ouverture du parcours : le navigateur télécharge les images avant l'écran du choix du moyen.
export function prechargerLogosPaiement() {
  if (typeof window === "undefined") return;
  for (const fichier of IMAGES_A_PRECHARGER) {
    const image = new Image();
    image.src = `/logos-paiement/${fichier}`;
  }
}

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

function Visa({ classe }: { classe: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`shrink-0 animate-dj-fade-in-rapide fill-current text-dj-texte ${classe}`}>
      <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z" />
    </svg>
  );
}

function Mastercard({ classe }: { classe: string }) {
  return (
    <svg aria-hidden viewBox="0 4.2 24 15.6" className={`shrink-0 animate-dj-fade-in-rapide ${classe}`}>
      <circle cx="7.416" cy="12" r="7.416" fill="#EB001B" />
      <circle cx="16.584" cy="12" r="7.416" fill="#F79E1B" />
      <path
        fill="#FF5F00"
        d="M12 6.174c-.096.075-.189.15-.28.231C10.156 7.764 9.169 9.765 9.169 12c0 2.236.987 4.236 2.551 5.595.09.08.185.158.28.232.096-.074.189-.152.28-.232 1.563-1.359 2.551-3.359 2.551-5.595 0-2.235-.987-4.236-2.551-5.595-.09-.08-.184-.156-.28-.231z"
      />
    </svg>
  );
}

function Paypal({ classe }: { classe: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={`shrink-0 animate-dj-fade-in-rapide ${classe}`}>
      <path
        fill="#003087"
        d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86Z"
      />
      <path
        fill="#009CDE"
        d="M22.177 10.199c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686Z"
      />
      <path
        fill="#012169"
        d="M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z"
      />
    </svg>
  );
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
          <Visa classe="h-10 w-10" />
          <Mastercard classe="h-9 w-9" />
        </>
      );
    case "paypal":
      return <Paypal classe="h-7 w-7" />;
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
