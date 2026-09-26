"use client";

import { useLayoutEffect, useMemo, useRef, useState, Children, isValidElement, ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { StickyTableHeader } from "vh-sticky-table-header";
import { BlocLarge } from "./BlocLarge";

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

// 26/09/2026, demande Bourama : l'en-tête doit se coller en haut de l'écran
// quand il est sur le point d'en sortir EN SCROLLANT LE MESSAGE (le scroll
// normal, pas un scroll interne au tableau) -- le tableau doit rester
// affiché en entier comme avant, aucune hauteur bornée, et le scroll
// horizontal pour les tableaux larges doit continuer à marcher.
//
// Recherché en détail avant d'implémenter (deux tentatives précédentes
// fausses) : `position: sticky` en CSS pur ne peut PAS combiner ces trois
// exigences. N'importe quel ancêtre avec overflow != visible (même
// overflow-x-auto seul, même sans jamais scroller lui-même) désactive
// sticky pour tout ce qu'il contient -- confirmé par plusieurs sources, et
// même DataTables (bibliothèque de référence) ne supporte pas sticky-header
// + scroll horizontal ensemble en CSS pur. D'où vh-sticky-table-header
// (4kb, zéro dépendance, faite spécifiquement pour ce cas précis : elle
// clone l'en-tête dans un second <table> vide et le positionne elle-même
// en JS quand le premier sort du champ, synchronisé avec le scroll
// horizontal réel -- voir son README).
function TableConteneur({
  className,
  enfants,
}: {
  className: string;
  enfants: ReactNode;
}) {
  const tableRef = useRef<HTMLTableElement>(null);
  const cloneRef = useRef<HTMLTableElement>(null);

  useLayoutEffect(() => {
    if (!tableRef.current || !cloneRef.current) return;
    const collant = new StickyTableHeader(tableRef.current, cloneRef.current, { max: 0 });
    return () => collant.destroy();
    // Volontairement []: le thead lui-même (structure) ne change pas d'un
    // rendu à l'autre (seul le tri des lignes du tbody change) -- réinitialiser
    // à chaque rendu détruirait/recréerait le clone inutilement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <BlocLarge className="my-2">
      {/* overflow-y: hidden explicite -- exigence documentée de la
          librairie pour que le scroll horizontal fonctionne correctement
          avec elle (voir README, section Requirements). */}
      <div className={className} style={{ overflowX: "auto", overflowY: "hidden" }}>
        <table ref={tableRef} className="w-full border-collapse">
          {enfants}
        </table>
      </div>
      <div className={className} style={{ overflowX: "auto", overflowY: "hidden" }}>
        <table ref={cloneRef} className="w-full border-collapse" />
      </div>
    </BlocLarge>
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

  // Structure inattendue (pas de thead/tbody standard) -> rendu passthrough,
  // fidèle à ce que produisait le composant table par défaut.
  if (!thead || !tbody) {
    return (
      <TableConteneur
        className="rounded-lg border border-dj-bordure [&_th]:border [&_th]:border-dj-bordure [&_th]:bg-dj-surface-haute [&_th]:px-2.5 [&_th]:py-1.5 [&_td]:border [&_td]:border-dj-bordure [&_td]:px-2.5 [&_td]:py-1.5 [&_tbody_tr:nth-child(even)]:bg-dj-surface"
        enfants={children}
      />
    );
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
      className="rounded-lg border border-dj-bordure [&_td]:border [&_td]:border-dj-bordure [&_td]:px-2.5 [&_td]:py-1.5 [&_tbody_tr:nth-child(even)]:bg-dj-surface [&_tbody_tr:hover]:bg-dj-surface-haute"
      enfants={
        <>
          <thead>
            <tr>
              {entetes.map((entete, index) => (
                <th
                  key={index}
                  onClick={() => trierPar(index)}
                  className="cursor-pointer select-none border border-dj-bordure bg-dj-surface-haute px-2 py-1.5 text-left transition-colors hover:bg-dj-surface"
                >
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
