"use client";

import type { ReactNode } from "react";

// Affichage d'un tableau trop large pour l'ecran : une carte par ligne, la
// premiere colonne sert de titre, les autres colonnes sont des couples
// "libelle : contenu". Aucun defilement horizontal, tout est visible.
export type LigneCarte = {
  titre: ReactNode;
  champs: { libelle: string; contenu: ReactNode }[];
};

export function CartesTableau({ lignes }: { lignes: LigneCarte[] }) {
  return (
    <div className="flex flex-col gap-2">
      {lignes.map((ligne, index) => (
        <div
          key={index}
          className="rounded-lg border border-dj-bordure bg-dj-surface-haute p-3 [overflow-wrap:anywhere]"
        >
          <div className="text-sm font-semibold text-dj-texte">{ligne.titre}</div>
          <dl className="mt-2 flex flex-col gap-1.5">
            {ligne.champs.map((champ, i) => (
              <div key={i}>
                <dt className="text-xs font-medium text-dj-texte-muet">{champ.libelle}</dt>
                <dd className="text-sm text-dj-texte">{champ.contenu}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
