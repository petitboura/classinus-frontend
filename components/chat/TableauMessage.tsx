"use client";

import { useMemo, useRef, useState, Children, isValidElement, ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { classeTailleTableau } from "@/lib/lisibilite";
import { useTableSansDebordement } from "@/lib/useTableSansDebordement";

// Remplace le <table> par défaut de ReactMarkdown (issu de remarkGfm) pour
// permettre le tri par colonne -- seul point du bloc "Tableaux de
// données" qui manquait (le rendu markdown simple existait déjà).
//
// Approche : on ne réécrit pas le parsing, on lit la structure déjà
// produite par react-markdown (thead > tr > th, tbody > tr > td) via
// Children, et on ne fait le tri QUE sur le texte visible de chaque
// cellule -- pas de re-parsing du markdown source, pas de dépendance à un
// format de données particulier. Si la structure ne correspond pas à ce
// qui est attendu (cas rare), on retombe sur un rendu <table> normal
// plutôt que de planter.
function texteDe(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(texteDe).join("");
  if (isValidElement(node)) return texteDe((node.props as { children?: ReactNode }).children);
  return "";
}

// Le tableau reste toujours dans la colonne du texte : pas de defilement
// horizontal, pas d'elargissement, pas de cartes, pas d'en-tete colle. Le texte
// des cases passe a la ligne et diminue quand il y a beaucoup de colonnes (voir
// lib/lisibilite.ts). Style : une seule couleur, pas de cadre exterieur, seules
// les lignes entre les cases restent (voir .dj-table-chat dans globals.css).
function TableConteneur({ enfants, taille }: { enfants: ReactNode; taille: string }) {
  const boiteRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  useTableSansDebordement(tableRef, boiteRef);

  return (
    <div ref={boiteRef} className={`my-2 overflow-hidden ${taille}`}>
      <table ref={tableRef} className="dj-table-chat">
        {enfants}
      </table>
    </div>
  );
}

export function TableauMessage({ children }: { children: ReactNode }) {
  const [colonneTri, setColonneTri] = useState<number | null>(null);
  const [ordreDesc, setOrdreDesc] = useState(false);

  const enfants = Children.toArray(children);
  const thead = enfants.find((e) => isValidElement(e) && e.type === "thead") as React.ReactElement | undefined;
  const tbody = enfants.find((e) => isValidElement(e) && e.type === "tbody") as React.ReactElement | undefined;

  const entetes = useMemo(() => {
    if (!thead) return [];
    const ligne = Children.toArray((thead.props as { children?: ReactNode }).children)[0];
    if (!isValidElement(ligne)) return [];
    return Children.toArray((ligne.props as { children?: ReactNode }).children);
  }, [thead]);

  const lignes = useMemo(() => {
    if (!tbody) return [];
    return Children.toArray((tbody.props as { children?: ReactNode }).children);
  }, [tbody]);

  const lignesTriees = useMemo(() => {
    if (colonneTri === null) return lignes;
    const copie = [...lignes];
    copie.sort((a, b) => {
      if (!isValidElement(a) || !isValidElement(b)) return 0;
      const cellulesA = Children.toArray((a.props as { children?: ReactNode }).children);
      const cellulesB = Children.toArray((b.props as { children?: ReactNode }).children);
      const valA = texteDe(cellulesA[colonneTri]).trim();
      const valB = texteDe(cellulesB[colonneTri]).trim();
      const numA = parseFloat(valA.replace(",", "."));
      const numB = parseFloat(valB.replace(",", "."));
      const comparaison =
        !isNaN(numA) && !isNaN(numB) ? numA - numB : valA.localeCompare(valB, "fr");
      return ordreDesc ? -comparaison : comparaison;
    });
    return copie;
  }, [lignes, colonneTri, ordreDesc]);

  const taille = classeTailleTableau(entetes.length);

  // Structure inattendue (pas de thead/tbody standard) : rendu passthrough,
  // fidele a ce que produisait le composant table par defaut.
  if (!thead || !tbody) {
    return <TableConteneur enfants={children} taille={taille} />;
  }

  function trierPar(index: number) {
    if (colonneTri === index) {
      setOrdreDesc((prec) => !prec);
    } else {
      setColonneTri(index);
      setOrdreDesc(false);
    }
  }

  return (
    <TableConteneur
      taille={taille}
      enfants={
        <>
          <thead>
            <tr>
              {entetes.map((entete, index) => (
                <th key={index} onClick={() => trierPar(index)} className="cursor-pointer select-none">
                  <span className="inline-flex items-center gap-1">
                    {isValidElement(entete) ? (entete.props as { children?: ReactNode }).children : entete}
                    {colonneTri === index ? (
                      ordreDesc ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                    ) : (
                      <ChevronsUpDown size={12} className="opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{lignesTriees}</tbody>
        </>
      }
    />
  );
}
