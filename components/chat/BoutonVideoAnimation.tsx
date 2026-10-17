"use client";

import { AlertCircle, Check, Download, Loader2, RectangleHorizontal, RectangleVertical } from "lucide-react";
import { MenuActionsCarte } from "@/components/MenuActionsCarte";
import type { FormatVideo } from "./animation/styleRenduVideo";
import type { EtatVideoAnimation } from "@/lib/useVideoAnimation";
import { textesVideoAnimation } from "@/lib/textesVideoAnimation";

// Bouton "Télécharger" du bloc animation, rendu dans la rangée d'actions de
// BlocExpansible (voir actionsSupplementaires). Aucun état ici, pour la même
// raison que BoutonFilmerWidget : tout vit dans lib/useVideoAnimation.ts.
//
// Au repos : un seul bouton Télécharger, qui ouvre un petit menu pour choisir
// le format de la vidéo, 16:9 (horizontal) ou 9:16 (vertical). Pendant la
// création : un seul bouton avec l'avancement, qui annule au clic.
export function BoutonVideoAnimation({
  etat,
  progression,
  message,
  avecTexte,
  desactive,
  surChoix,
  surAnnuler,
}: {
  etat: EtatVideoAnimation;
  progression: number;
  message: string | null;
  avecTexte: boolean;
  desactive: boolean;
  surChoix: (format: FormatVideo) => void;
  surAnnuler: () => void;
}) {
  const t = textesVideoAnimation();
  const classe = avecTexte
    ? "flex items-center gap-1.5 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60"
    : "flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg border border-dj-bordure bg-dj-surface-haute px-1.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-60";

  if (etat === "envoi" || etat === "rendu" || etat === "telechargement") {
    const pourcent = Math.round(progression * 100);
    const texte = etat === "envoi" ? t.envoi : etat === "telechargement" ? t.telechargement : t.creation(pourcent);
    return (
      <button
        type="button"
        onClick={surAnnuler}
        disabled={etat === "telechargement"}
        aria-label={t.annuler}
        title={t.annuler}
        className={classe}
      >
        <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />
        {avecTexte ? texte : etat === "rendu" ? `${pourcent}%` : null}
      </button>
    );
  }

  if (etat === "ok" || etat === "echec") {
    const ok = etat === "ok";
    return (
      <span
        role={ok ? "status" : "alert"}
        title={ok ? t.ok : (message ?? t.echec)}
        className={`${classe} ${ok ? "" : "text-red-400"} ${avecTexte ? "max-w-[18rem]" : ""}`}
      >
        {ok ? <Check size={14} /> : <AlertCircle size={14} />}
        {avecTexte && <span className="truncate">{ok ? t.ok : (message ?? t.echec)}</span>}
      </span>
    );
  }

  return (
    <MenuActionsCarte
      portail
      niveauPortail="z-[165]"
      ariaLabel={t.telecharger}
      desactive={desactive}
      classeDeclencheur={classe}
      declencheur={
        <>
          <Download size={14} />
          {avecTexte && t.telecharger}
        </>
      }
      actions={[
        { cle: "16:9", label: t.horizontal, icone: <RectangleHorizontal size={14} />, onClick: () => surChoix("16:9") },
        { cle: "9:16", label: t.vertical, icone: <RectangleVertical size={14} />, onClick: () => surChoix("9:16") },
      ]}
    />
  );
}
