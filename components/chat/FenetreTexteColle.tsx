"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import katex from "katex";
import { X } from "lucide-react";
import { BlocCode } from "./BlocCode";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { libellePieceJointe } from "@/lib/texteColle";

// Contenu d'un texte collé, rendu selon sa nature : formule LaTeX rendue
// par KaTeX, code coloré, ou texte brut. Partagé entre la barre de saisie
// (avant envoi) et la bulle du message (après envoi) pour que la lecture
// soit strictement la même des deux côtés.
function ContenuTexteColle({ texte, langage }: { texte: string; langage: string | null }) {
  if (langage === "latex") {
    let html: string;
    try {
      html = katex.renderToString(texte, { displayMode: true, throwOnError: false });
    } catch {
      html = texte.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
    }
    return (
      <div
        className="min-h-0 flex-1 overflow-auto rounded-xl border border-dj-bordure bg-dj-surface-haute p-6 text-dj-texte"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  if (langage) {
    return (
      <div className="min-h-0 flex-1 overflow-auto">
        <BlocCode langage={langage} code={texte} />
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-dj-texte">{texte}</div>
  );
}

// Fenêtre en lecture seule d'un texte collé. Montée via un portail dans
// le body, au dessus du chat flottant (même niveau que VisionneuseImage),
// parce qu'un "position: fixed" posé dans l'arbre du message est recadré
// par tout parent animé.
export function FenetreTexteColle({
  texte,
  langage,
  onFermer,
}: {
  texte: string;
  langage: string | null;
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
      large
      enSortie={enSortie}
      zIndex="z-[160]"
      entete={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-dj-texte-muet">{libellePieceJointe(langage, texte)}</span>
          <button
            onClick={fermer}
            aria-label="Fermer"
            className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
          >
            <X size={14} /> Fermer
          </button>
        </div>
      }
    >
      <ContenuTexteColle texte={texte} langage={langage} />
    </PanneauFlottant>,
    document.body
  );
}
