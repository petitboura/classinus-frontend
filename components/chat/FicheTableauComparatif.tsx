"use client";

import { useRef } from "react";
import { Table2 } from "lucide-react";
import type { FicheTableauComparatifData } from "./FicheRevision";
import { classeTailleTableau } from "@/lib/lisibilite";
import { useTableLargeur } from "@/lib/useTableLargeur";

// Sous-composant de FicheRevision.tsx (voir ce fichier pour le contexte
// général, le schéma JSON complet et ce qui est hors scope). Affiche un
// tableau comparatif : { colonnes: string[], lignes: [{ label, valeurs }] }.
//
// Volontairement plus simple que TableauMessage.tsx (pas de tri de
// colonnes) : ce tableau est un contenu pédagogique figé généré pour une
// fiche de révision, pas des données tabulaires à explorer.
//
// Regle de lisibilite (lib/lisibilite.ts), la meme que TableauMessage : le
// tableau n'a pas de cartes. Texte des cases a la ligne, plus petit quand il y a
// beaucoup de colonnes ; au dela de 7 colonnes il s'elargit vers les bords puis
// defile de gauche a droite sans barre (lib/useTableLargeur.ts).
// Style : une seule couleur, pas de cadre exterieur, lignes entre les cases.
//
// Correctif en-tetes decales : la premiere colonne (les noms de lignes) a
// toujours un titre vide ajoute par ce composant. Quand le LLM met aussi le
// titre de cette colonne dans `colonnes`, il y a une colonne de trop par
// rapport aux valeurs et tous les titres glissent d'un cran vers la droite.
// Si colonnes a exactement une entree de plus que le plus grand nombre de
// valeurs, la premiere entree devient le titre de la colonne des noms.
// 02/11/2026, décision de Bourama : cet élément s'affiche sans cadre (ni bordure ni fond de carte), le contenu repose directement sur le fond du chat. Ne jamais remettre de cadre sans que Bourama le demande.
export function FicheTableauComparatif({ fiche }: { fiche: FicheTableauComparatifData }) {
  const boiteRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const pisteRef = useRef<HTMLDivElement>(null);
  useTableLargeur(tableRef, boiteRef, pisteRef);

  const nbValeurs = fiche.lignes.reduce((max, ligne) => Math.max(max, ligne.valeurs.length), 0);
  const titreLabelFourni = nbValeurs > 0 && fiche.colonnes.length === nbValeurs + 1;
  const titreLabel = titreLabelFourni ? fiche.colonnes[0] : "";
  const colonnes = titreLabelFourni ? fiche.colonnes.slice(1) : fiche.colonnes;

  const taille = classeTailleTableau(colonnes.length + 1);

  return (
    <div className="my-3 animate-dj-fade-in">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dj-accent-1-conteneur text-dj-accent-1-texte">
          <Table2 size={14} />
        </span>
        <p className="text-sm font-semibold text-dj-texte">{fiche.titre || "Tableau comparatif"}</p>
      </div>
      <div ref={boiteRef} className={taille}>
        <div ref={pisteRef} className="dj-table-piste">
        <table ref={tableRef} className="dj-table-chat">
          <thead>
            <tr>
              <th className="font-semibold text-dj-texte">{titreLabel}</th>
              {colonnes.map((colonne, index) => (
                <th key={index} className="font-semibold text-dj-texte">
                  {colonne}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {fiche.lignes.map((ligne, index) => (
              <tr key={index}>
                <td className="font-medium text-dj-texte">{ligne.label}</td>
                {ligne.valeurs.map((valeur, i) => (
                  <td key={i} className="text-dj-texte-muet">
                    {valeur}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
