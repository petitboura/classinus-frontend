"use client";

import { AlertTriangle, ShieldAlert } from "lucide-react";
import { BOUTONS_AUTORISATION_PAR_DEFAUT, type ChoixAutorisation } from "@/lib/autorisationCanal";

// Ajouté 08/10/2026 (garde-fou 2 du canal PC, demande Bourama). Affiché DANS la bulle de
// Clovis quand Classinus veut regarder, écrire, ouvrir ou cliquer dans une application : Clovis
// attend la réponse de l'étudiant. Sans réponse, la demande se ferme et l'action n'est pas faite.
// Même famille visuelle que BandeauReponseInterrompue.
//
// 18/10/2026 (décision de Bourama, avant la publication) : trois choix, "Autoriser cette fois
// seulement", "Toujours autoriser pour cette appli" et "Refuser". Les boutons montrés viennent de
// l'application PC (une application sensible n'a jamais "toujours"), et l'avertissement de
// risque, quand il y en a un, s'affiche au-dessus des boutons : c'est la raison pour laquelle on
// exige une confirmation. Ce composant ne décide de rien, il montre ce qu'on lui envoie.
const LIBELLES: Record<ChoixAutorisation, string> = {
  cette_fois: "Autoriser cette fois seulement",
  toujours_appli: "Toujours autoriser pour cette appli",
  refuser: "Refuser",
};

const CLASSES_PRINCIPAL =
  "rounded-lg border border-dj-accent-1 bg-dj-accent-1 px-3 py-1.5 text-xs font-semibold text-[#1A0D02] hover:bg-dj-accent-2";
const CLASSES_SECONDAIRE =
  "rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface";

export function BandeauAutorisationAgent({
  texte,
  boutons,
  risque,
  onChoix,
}: {
  texte: string;
  boutons?: ChoixAutorisation[];
  risque?: string | null;
  onChoix: (choix: ChoixAutorisation) => void;
}) {
  const liste = boutons && boutons.length > 0 ? boutons : BOUTONS_AUTORISATION_PAR_DEFAUT;
  return (
    <div
      role="group"
      aria-label="Demande d'autorisation"
      className="my-1.5 flex w-fit max-w-full flex-col gap-2 rounded-lg border border-dj-accent-2/40 bg-dj-accent-2/10 px-3 py-2 text-[13px] text-dj-texte"
    >
      <span className="flex items-start gap-1.5">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-dj-accent-2" />
        <span className="whitespace-pre-wrap break-words">{texte}</span>
      </span>
      {risque && (
        <span role="alert" className="flex items-start gap-1.5 font-medium">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-dj-accent-1-texte" />
          <span className="whitespace-pre-wrap break-words">{risque}</span>
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {liste.map((choix) => (
          <button
            key={choix}
            type="button"
            onClick={() => onChoix(choix)}
            className={choix === "cette_fois" ? CLASSES_PRINCIPAL : CLASSES_SECONDAIRE}
          >
            {LIBELLES[choix]}
          </button>
        ))}
      </div>
    </div>
  );
}
