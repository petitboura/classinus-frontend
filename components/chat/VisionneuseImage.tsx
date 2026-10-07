"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { telecharger as telechargerFichier } from "@/lib/telecharger";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

// Zoom plein écran d'image, réutilisé partout où le chat affiche une
// image cliquable (audit 25/08/2026 : ce même overlay était réécrit
// indépendamment 4 fois -- FichierChip.tsx/ImageGenereeChip,
// ImageMessage.tsx, BulleMessage.tsx pieces jointes,
// BarreDeSaisie.tsx image collée avant envoi -- avec, en prime, un bug
// commun à 3 des 4 copies : le bouton "Fermer" n'avait aucun onClick
// propre, il ne fonctionnait que par rebond du clic vers le fond. Un
// seul composant partagé désormais, avec fermeture au clavier (Echap)
// en plus du clic.
export function VisionneuseImage({
  src,
  alt = "",
  onFermer,
  onTelecharger,
  liste,
  indexInitial = 0,
}: {
  src: string;
  alt?: string;
  onFermer: () => void;
  /** Plusieurs images à parcourir : flèches, touches gauche/droite et
   * balayage au doigt, avec téléchargement de l'image affichée. Sans cette
   * liste, comportement inchangé (une seule image, `src`). */
  liste?: { src: string; alt?: string }[];
  indexInitial?: number;
  /** Bouton de téléchargement affiché uniquement si fourni (FichierChip.tsx
   * et ImageMessage.tsx en ont un ; BulleMessage.tsx et BarreDeSaisie.tsx
   * n'en avaient pas avant non plus -- comportement inchangé). */
  onTelecharger?: () => void;
}) {
  // 01/09/2026 (Bourama : "plein de boutons qui se ferment et s'ouvrent
  // brut") : fermeture instantanée -- même mécanisme que
  // lib/useFermetureAnimee.ts.
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  const [index, setIndex] = useState(indexInitial);
  const plusieurs = !!liste && liste.length > 1;
  const courante = liste && liste[index] ? liste[index] : { src, alt };
  const aller = (sens: 1 | -1) => {
    if (!liste || liste.length < 2) return;
    setIndex((i) => (i + sens + liste.length) % liste.length);
  };
  const departToucher = useRef<number | null>(null);

  // 24/09/2026 (même bug que PleinEcranApercu.tsx, corrigé le 20/09) : rendu
  // dans l'arbre du message, un "position: fixed" est recadré par tout
  // parent animé (transform), et le chat flottant en est un : l'image
  // restait coincée dans la petite zone du chat. Montée via un portail
  // directement dans <body>, au-dessus du chat flottant (z-[150]) : z-[160],
  // même niveau que PleinEcranApercu. Le rendu ne se fait qu'une fois monté
  // côté navigateur (document n'existe pas au rendu serveur).
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") fermer();
      else if (e.key === "ArrowLeft") aller(-1);
      else if (e.key === "ArrowRight") aller(1);
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fermer recrée une fonction stable via demarrerFermeture (useCallback) + onFermer du parent
  }, [onFermer, liste]);

  if (!monte) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[160] flex items-center justify-center bg-black/85 p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in"
      }`}
      // stopPropagation : l'arbre React traverse le portail, un clic ici ne
      // doit pas remonter au message d'origine (ex: rouvrir l'image).
      onClick={(e) => {
        e.stopPropagation();
        fermer();
      }}
    >
      {plusieurs && (
        <span className="absolute left-1/2 top-5 -translate-x-1/2 text-sm text-dj-texte-muet">
          {index + 1} / {liste!.length}
        </span>
      )}
      {(onTelecharger || liste) && (
        <button
          aria-label="Télécharger"
          onClick={(e) => {
            e.stopPropagation();
            if (liste) telechargerFichier(courante.src, courante.alt || "image");
            else onTelecharger?.();
          }}
          className="absolute right-16 top-5 text-dj-texte-muet hover:text-dj-texte"
        >
          <Download size={22} />
        </button>
      )}
      <button
        aria-label="Fermer"
        onClick={(e) => {
          e.stopPropagation();
          fermer();
        }}
        className="absolute right-5 top-5 text-dj-texte-muet hover:text-dj-texte"
      >
        <X size={22} />
      </button>
      {plusieurs && (
        <>
          <button
            aria-label="Image précédente"
            onClick={(e) => {
              e.stopPropagation();
              aller(-1);
            }}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            aria-label="Image suivante"
            onClick={(e) => {
              e.stopPropagation();
              aller(1);
            }}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <ChevronRight size={22} />
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- source dynamique, pas un asset local optimisable */}
      <img
        key={courante.src}
        src={courante.src}
        alt={courante.alt || ""}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          departToucher.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (departToucher.current === null) return;
          const ecart = e.changedTouches[0].clientX - departToucher.current;
          departToucher.current = null;
          if (Math.abs(ecart) > 50) aller(ecart < 0 ? 1 : -1);
        }}
        className="max-h-[90vh] max-w-[90vw] animate-dj-fade-in-rapide rounded-xl object-contain"
      />
    </div>,
    document.body
  );
}
