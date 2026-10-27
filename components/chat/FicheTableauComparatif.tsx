"use client";

import { Table2 } from "lucide-react";
import type { FicheTableauComparatifData } from "./FicheRevision";
import { BlocLarge } from "./BlocLarge";
import { CartesTableau, type LigneCarte } from "./CartesTableau";
import { useEstDesktop } from "@/lib/useEstDesktop";
import { modeTableau } from "@/lib/lisibilite";

// Sous-composant de FicheRevision.tsx (voir ce fichier pour le contexte
// général, le schéma JSON complet et ce qui est hors scope). Affiche un
// tableau comparatif : { colonnes: string[], lignes: [{ label, valeurs }] }.
//
// Volontairement plus simple que TableauMessage.tsx (pas de tri de
// colonnes) : ce tableau est un contenu pédagogique figé généré pour une
// fiche de révision, pas des données tabulaires à explorer.
//
// Regle de lisibilite (lib/lisibilite.ts), la meme que TableauMessage : jamais
// de defilement horizontal. Texte des cases a la ligne, elargissement si
// besoin sur PC, une carte par ligne quand c'est trop large.
//
// Correctif en-tetes decales : la premiere colonne (les noms de lignes) a
// toujours un titre vide ajoute par ce composant. Quand le LLM met aussi le
// titre de cette colonne dans `colonnes`, il y a une colonne de trop par
// rapport aux valeurs et tous les titres glissent d'un cran vers la droite.
// Si colonnes a exactement une entree de plus que le plus grand nombre de
// valeurs, la premiere entree devient le titre de la colonne des noms.
export function FicheTableauComparatif({ fiche }: { fiche: FicheTableauComparatifData }) {
  const estDesktop = useEstDesktop();

  const nbValeurs = fiche.lignes.reduce((max, ligne) => Math.max(max, ligne.valeurs.length), 0);
  const titreLabelFourni = nbValeurs > 0 && fiche.colonnes.length === nbValeurs + 1;
  const titreLabel = titreLabelFourni ? fiche.colonnes[0] : "";
  const colonnes = titreLabelFourni ? fiche.colonnes.slice(1) : fiche.colonnes;

  const mode = modeTableau(colonnes.length + 1, estDesktop);

  const cartes: LigneCarte[] = fiche.lignes.map((ligne) => ({
    titre: ligne.label,
    champs: ligne.valeurs.map((valeur, i) => ({ libelle: colonnes[i] ?? "", contenu: valeur })),
  }));

  return (
    <BlocLarge
      actif={mode === "large"}
      className="my-3 animate-dj-fade-in rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dj-accent-1-conteneur text-dj-accent-1-texte">
          <Table2 size={14} />
        </span>
        <p className="text-sm font-semibold text-dj-texte">{fiche.titre || "Tableau comparatif"}</p>
      </div>
      {mode === "cartes" ? (
        <CartesTableau lignes={cartes} />
      ) : (
        <div className="overflow-x-hidden rounded-lg border border-dj-bordure">
          <table className="w-full border-collapse text-sm [&_td]:[overflow-wrap:anywhere] [&_th]:[overflow-wrap:anywhere]">
            <thead>
              <tr>
                <th className="border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-left font-semibold text-dj-texte">
                  {titreLabel}
                </th>
                {colonnes.map((colonne, index) => (
                  <th
                    key={index}
                    className="border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-left font-semibold text-dj-texte"
                  >
                    {colonne}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fiche.lignes.map((ligne, index) => (
                <tr key={index} className="[&:nth-child(even)]:bg-dj-surface-haute/40 hover:bg-dj-surface-haute">
                  <td className="border border-dj-bordure px-2.5 py-1.5 font-medium text-dj-texte">{ligne.label}</td>
                  {ligne.valeurs.map((valeur, i) => (
                    <td key={i} className="border border-dj-bordure px-2.5 py-1.5 text-dj-texte-muet">
                      {valeur}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BlocLarge>
  );
}
