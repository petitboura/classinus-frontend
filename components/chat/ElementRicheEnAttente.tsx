"use client";

// Emplacement affiché à la place d'un élément riche (diagramme, graphique,
// QCM, fiche, widget...) tant que son code est en train de s'écrire. Il
// garde la place et évite que l'élément apparaisse, tremble et se recharge
// à chaque morceau reçu : le vrai élément se monte une seule fois, quand son
// code est complet.
import { Skeleton } from "../Skeleton";

export const LANGAGES_RICHES = new Set([
  "mermaid",
  "chart",
  "carte",
  "geometrie",
  "qcm",
  "question",
  "fiche",
  "widget",
  "html",
]);

const HAUTEUR_PAR_LANGAGE: Record<string, string> = {
  chart: "h-[260px]",
  mermaid: "h-[220px]",
  widget: "h-[220px]",
  html: "h-[220px]",
  carte: "h-[220px]",
  geometrie: "h-[220px]",
  fiche: "h-[180px]",
  qcm: "h-[180px]",
  question: "h-[140px]",
};

export function ElementRicheEnAttente({ langage }: { langage: string }) {
  return (
    <Skeleton
      className={`my-2 w-full rounded-xl border border-dj-bordure ${HAUTEUR_PAR_LANGAGE[langage] ?? "h-[160px]"}`}
    />
  );
}
