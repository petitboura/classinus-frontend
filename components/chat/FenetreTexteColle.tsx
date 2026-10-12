"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import katex from "katex";
import { X } from "lucide-react";
import { BlocCode } from "./BlocCode";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { libellePieceJointe } from "@/lib/texteColle";

// Rendu complet du markdown (mêmes composants que le chat), chargé à la
// demande : il est lourd et cette fenêtre n'existe que pour un long collage.
const RenduMarkdownAutonome = dynamic(
  () => import("./RenduMarkdownAutonome").then((m) => m.RenduMarkdownAutonome),
  { ssr: false }
);

// Contenu d'un texte collé, rendu selon sa nature : formule LaTeX rendue
// par KaTeX, code coloré, ou texte brut. Partagé entre la barre de saisie
// (avant envoi) et la bulle du message (après envoi) pour que la lecture
// soit strictement la même des deux côtés.
function ContenuTexteColle({ texte, langage, vueBrute }: { texte: string; langage: string | null; vueBrute: boolean }) {
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
  // 11/10/2026, demande Bourama : un long texte collé s'affiche formaté
  // (markdown rendu) par défaut, avec un bouton Brut pour voir le texte tel
  // quel. Code et LaTeX ont leur propre rendu, inchangé.
  if (vueBrute) {
    return (
      <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-sm leading-relaxed text-dj-texte">{texte}</div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-auto text-sm leading-relaxed text-dj-texte">
      <RenduMarkdownAutonome texte={texte} />
    </div>
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
  const [vueBrute, setVueBrute] = useState(false);
  const estTexteSimple = !langage;

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
          {estTexteSimple && (
            <div className="flex gap-1">
              <button
                onClick={() => setVueBrute(false)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  !vueBrute ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet hover:text-dj-texte"
                }`}
              >
                Formaté
              </button>
              <button
                onClick={() => setVueBrute(true)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  vueBrute ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet hover:text-dj-texte"
                }`}
              >
                Brut
              </button>
            </div>
          )}
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
      <ContenuTexteColle texte={texte} langage={langage} vueBrute={vueBrute} />
    </PanneauFlottant>,
    document.body
  );
}
