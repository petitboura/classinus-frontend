"use client";

import { useState } from "react";
import {
  type ChampSimple,
  type ValeurChamp,
  valeurInitiale,
  valeurComplete,
  formaterReponseChamp,
} from "@/lib/questionRiche";
import { ChampChoix } from "./ChampChoix";
import { ChampTexte } from "./ChampTexte";
import { ChampOuiNon } from "./ChampOuiNon";
import { ChampEchelle } from "./ChampEchelle";
import { ChampClassement } from "./ChampClassement";
import { ChampDate } from "./ChampDate";

// Sous-composant de QuestionInteractive.tsx (multi_champs) : contrairement
// aux 7 autres types, aucun sous-champ n'a son propre bouton "Valider"
// (ni de soumission "un clic suffit" pour choix_unique/oui_non) -- tout
// le formulaire est rempli localement puis envoyé en une seule fois, via
// l'unique bouton Valider en bas. onReponse combine chaque sous-réponse
// en une ligne "Question : réponse" (format choisi ici faute de format
// imposé par le schéma, signalé à Bourama).
export function QuestionMultiChamps({
  champs,
  onReponse,
  desactive,
}: {
  champs: ChampSimple[];
  onReponse: (texteFinal: string) => void;
  desactive?: boolean;
}) {
  const [valeurs, setValeurs] = useState<ValeurChamp[]>(() => champs.map(valeurInitiale));

  function majValeur(index: number, v: ValeurChamp) {
    setValeurs((prec) => prec.map((val, i) => (i === index ? v : val)));
  }

  const toutComplet = champs.every((champ, i) => valeurComplete(champ, valeurs[i]));

  function valider() {
    if (!toutComplet || desactive) return;
    const texte = champs
      .map((champ, i) => `${champ.question} : ${formaterReponseChamp(champ, valeurs[i])}`)
      .join("\n");
    onReponse(texte);
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {champs.map((champ, index) => {
        const valeur = valeurs[index];
        return (
          <div key={index}>
            <p className="text-sm text-dj-texte">{champ.question}</p>
            {champ.type === "choix_unique" || champ.type === "choix_multiple" ? (
              valeur.champType === champ.type && (
                <ChampChoix
                  choix={champ.choix}
                  multiple={champ.type === "choix_multiple"}
                  autre={champ.autre}
                  valeur={valeur}
                  onChange={(v) => majValeur(index, { champType: champ.type, ...v })}
                  desactive={desactive}
                />
              )
            ) : champ.type === "texte" ? (
              valeur.champType === "texte" && (
                <ChampTexte
                  format={champ.format}
                  valeur={valeur.texte}
                  onChange={(texte) => majValeur(index, { champType: "texte", texte })}
                  desactive={desactive}
                />
              )
            ) : champ.type === "oui_non" ? (
              valeur.champType === "oui_non" && (
                <ChampOuiNon
                  valeur={valeur.reponse}
                  onChange={(reponse) => majValeur(index, { champType: "oui_non", reponse })}
                  desactive={desactive}
                />
              )
            ) : champ.type === "echelle" ? (
              valeur.champType === "echelle" && (
                <ChampEchelle
                  min={champ.min}
                  max={champ.max}
                  labelMin={champ.labels?.min}
                  labelMax={champ.labels?.max}
                  valeur={valeur.valeur}
                  onChange={(v) => majValeur(index, { champType: "echelle", valeur: v })}
                  desactive={desactive}
                />
              )
            ) : champ.type === "classement" ? (
              valeur.champType === "classement" && (
                <ChampClassement
                  elements={champ.elements}
                  ordre={valeur.ordre}
                  onChange={(ordre) => majValeur(index, { champType: "classement", ordre })}
                  desactive={desactive}
                />
              )
            ) : (
              valeur.champType === "date" && (
                <ChampDate
                  granularite={champ.granularite ?? "date"}
                  valeur={valeur.valeur}
                  onChange={(v) => majValeur(index, { champType: "date", valeur: v })}
                  desactive={desactive}
                />
              )
            )}
          </div>
        );
      })}

      <button
        type="button"
        disabled={!toutComplet || desactive}
        onClick={valider}
        className="self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
      >
        Valider
      </button>
    </div>
  );
}
