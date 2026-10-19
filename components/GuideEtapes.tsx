"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy } from "lucide-react";

// Briques communes des guides pas à pas (Utiliser Classinus dans Claude,
// Utiliser Classinus dans Thonny). Une seule version de l'étape numérotée, de
// la capture d'écran et de la valeur à copier, pour que les guides gardent le
// même aspect.

export function EtapeGuide({
  numero,
  titre,
  dernier = false,
  children,
}: {
  numero: number;
  titre: string;
  dernier?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 animate-dj-fade-in-rapide" style={{ animationDelay: `${(numero - 1) * 60}ms` }}>
      <div className="flex flex-shrink-0 flex-col items-center">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-dj-surface-haute text-sm font-bold text-dj-texte">
          {numero}
        </span>
        {!dernier && <span className="mt-1 w-px flex-1 bg-dj-bordure" />}
      </div>
      <div className={`flex-1 space-y-3 ${dernier ? "" : "pb-4"}`}>
        <h2 className="font-display text-sm font-semibold text-dj-texte">{titre}</h2>
        <div className="space-y-3 text-sm leading-relaxed text-dj-texte-muet">{children}</div>
      </div>
    </div>
  );
}

// `tailleNaturelle` : pour une toute petite capture (un bouton, un bout de
// menu), qui deviendrait floue et énorme si on l'étirait sur toute la
// largeur. Elle garde alors sa taille d'origine, sans jamais dépasser la
// largeur disponible.
export function Capture({
  src,
  largeur,
  hauteur,
  alt,
  tailleNaturelle = false,
}: {
  src: string;
  largeur: number;
  hauteur: number;
  alt: string;
  tailleNaturelle?: boolean;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface-haute"
      style={tailleNaturelle ? { maxWidth: largeur, width: "fit-content" } : undefined}
    >
      <Image
        src={src}
        width={largeur}
        height={hauteur}
        alt={alt}
        className={tailleNaturelle ? "h-auto max-w-full" : "h-auto w-full"}
        sizes={tailleNaturelle ? `${largeur}px` : "(max-width: 640px) 100vw, 400px"}
      />
    </div>
  );
}

// Une valeur à recopier ailleurs (un nom de plugin, une adresse), avec un
// bouton Copier. Si le presse papier refuse, la valeur reste affichée et
// peut se copier à la main.
export function ValeurACopier({ valeur }: { valeur: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      setCopie(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 overflow-x-auto rounded-xl border border-dj-bordure-forte bg-dj-surface-haute px-3 py-2.5 font-mono text-xs text-dj-texte">
        {valeur}
      </span>
      <button
        onClick={copier}
        className="flex flex-shrink-0 items-center gap-1.5 rounded-cgpt-bouton border border-dj-bordure px-3 py-2.5 text-xs font-medium text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        {copie ? <Check size={14} /> : <Copy size={14} />}
        {copie ? "Copié !" : "Copier"}
      </button>
    </div>
  );
}
