"use client";

import { AlertCircle, Check, Loader2, Square, Video } from "lucide-react";

// Bouton "Filmer" du widget interactif, rendu dans la rangée d'actions de
// BlocExpansible (voir actionsSupplementaires). Ce composant n'a AUCUN état
// à lui : BlocExpansible recrée sa barre d'actions à chaque rendu, ce qui
// démonterait un état local en pleine prise de vue. L'état vit donc dans
// WidgetSandbox, ce composant ne fait qu'afficher.
export type EtatVideo = "repos" | "preparation" | "enregistrement" | "ok" | "echec" | "surface";

function formaterDuree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function BoutonFilmerWidget({
  etat,
  secondes,
  avecTexte,
  desactive,
  surClic,
}: {
  etat: EtatVideo;
  secondes: number;
  avecTexte: boolean;
  desactive: boolean;
  surClic: () => void;
}) {
  const classe = avecTexte
    ? "flex items-center gap-1.5 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte disabled:opacity-60"
    : "flex h-8 w-8 items-center justify-center rounded-lg border border-dj-bordure bg-dj-surface-haute text-dj-texte-muet hover:text-dj-texte disabled:opacity-60";

  let icone = <Video size={14} />;
  let texte = "Filmer";
  let libelleAria = "Filmer le widget en vidéo";
  if (etat === "preparation") {
    icone = <Loader2 size={14} className="animate-spin" />;
    texte = "Préparation";
  } else if (etat === "enregistrement") {
    icone = <Square size={14} className="text-red-400" />;
    texte = `Arrêter ${formaterDuree(secondes)}`;
    libelleAria = "Arrêter l'enregistrement";
  } else if (etat === "ok") {
    icone = <Check size={14} />;
    texte = "Vidéo téléchargée";
  } else if (etat === "echec") {
    icone = <AlertCircle size={14} />;
    texte = "Échec, réessaie";
  } else if (etat === "surface") {
    icone = <AlertCircle size={14} />;
    texte = "Choisis cet onglet";
  }

  return (
    <button
      type="button"
      onClick={surClic}
      disabled={desactive || etat === "preparation"}
      aria-label={libelleAria}
      className={classe}
    >
      {icone}
      {avecTexte && texte}
    </button>
  );
}
