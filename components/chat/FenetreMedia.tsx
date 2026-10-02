"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { LecteurMedia } from "./LecteurMedia";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

// Lecture d'un audio ou d'une vidéo joint, dans une fenêtre au dessus du
// chat (portail dans le body, même niveau que VisionneuseImage). Remplace
// le lecteur intégré qui occupait toute la largeur de la ligne de pièces
// jointes: la ligne reste compacte et le lecteur s'ouvre à la demande.
export function FenetreMedia({
  href,
  nom,
  type,
  onFermer,
}: {
  href: string;
  nom: string;
  type: "audio" | "video";
  onFermer: () => void;
}) {
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  if (!monte) return null;

  return createPortal(
    <PanneauFlottant
      onFerme={fermer}
      enSortie={enSortie}
      zIndex="z-[160]"
      entete={
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-sm text-dj-texte-muet">{nom}</span>
          <button
            onClick={fermer}
            aria-label="Fermer"
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
          >
            <X size={14} /> Fermer
          </button>
        </div>
      }
    >
      <LecteurMedia href={href} type={type} />
    </PanneauFlottant>,
    document.body
  );
}
