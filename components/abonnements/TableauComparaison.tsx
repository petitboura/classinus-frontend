"use client";

import { useMemo } from "react";
import { Check, Clock } from "lucide-react";
import type { PalierListeAttente } from "@/lib/listeAttente";

type Traduire = (cle: string, valeurs?: Record<string, string | number>) => string;

// Tableau de comparaison des paliers, comme celui de la page de tarification de Claude (19/11/2026, demande
// de Bourama, à la place des catégories repliables). Une colonne par palier, une ligne par fonction, et des
// sections (« Fonctionnalités », « Modèles et crédit ») dont la ligne de titre répète le nom des paliers,
// pour qu'on sache toujours à quelle colonne on est sans en-tête collant.
//
// Tout vient de Supabase (textes_modeles_llm), en français et en anglais, rien n'est écrit ici :
// - attente_comp_ordre : les identifiants de section, séparés par « | » ;
// - attente_comp_<id>_titre et attente_comp_<id>_lignes ;
// - une ligne = « libellé#valeur palier 1#valeur palier 2#valeur palier 3 », les lignes séparées par « | » ;
// - une valeur est « oui » (coche), « non », « bientot » (horloge) ou un texte court. Le montant du crédit
//   de chaque palier n'est pas affiché (décision de Bourama, 19/11/2026) ;
// - attente_comp_oui, attente_comp_non et attente_comp_bientot sont les mots affichés ou lus à voix haute.
// Une ligne qui n'a pas une valeur par palier est ignorée.
type Ligne = { libelle: string; valeurs: string[] };
type Section = { id: string; titre: string; lignes: Ligne[] };

function lireLignes(brut: string, nbColonnes: number): Ligne[] {
  return brut
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [libelle, ...valeurs] = l.split("#").map((v) => v.trim());
      return { libelle, valeurs };
    })
    .filter((l) => l.libelle && l.valeurs.length === nbColonnes);
}

// Un libellé qui contient une liste entre parenthèses (« Haut de gamme (Claude Opus 5.5, GPT-6.1 Sol) »)
// est coupé en deux : le texte en haut, puis les éléments de la liste en dessous, séparés par un petit trait
// vertical plutôt que par des virgules (19/11/2026, demande de Bourama). Des parenthèses sans virgule,
// comme « (OCR) », restent dans le texte.
const LISTE_ENTRE_PARENTHESES = /^(.*?)\s*\(([^()]*,[^()]*)\)\s*(.*)$/;

function Libelle({ texte }: { texte: string }) {
  const m = LISTE_ENTRE_PARENTHESES.exec(texte);
  if (!m) return <>{texte}</>;
  const [, debut, liste, fin] = m;
  const elements = liste.split(",").map((e) => e.trim()).filter(Boolean);
  return (
    <>
      {[debut, fin].filter(Boolean).join(" ")}
      <span className="mt-1 block text-dj-texte-muet">
        {elements.map((element, i) => (
          <span key={`${i}-${element}`}>
            {i > 0 && (
              <>
                <span className="sr-only">, </span>
                <span aria-hidden className="mx-2 inline-block h-3.5 w-px bg-dj-bordure-forte align-middle" />
              </>
            )}
            {element}
          </span>
        ))}
      </span>
    </>
  );
}

export function TableauComparaison({ t, paliers }: { t: Traduire; paliers: PalierListeAttente[] }) {
  const sections: Section[] = useMemo(
    () =>
      t("attente_comp_ordre")
        .split("|")
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => ({
          id,
          titre: t(`attente_comp_${id}_titre`),
          lignes: lireLignes(t(`attente_comp_${id}_lignes`), paliers.length),
        }))
        .filter((s) => s.titre && s.lignes.length > 0),
    [t, paliers.length],
  );

  if (sections.length === 0 || paliers.length === 0) return null;

  const colonnes = { gridTemplateColumns: `minmax(0,1.6fr) repeat(${paliers.length}, minmax(0,1fr))` };
  const oui = t("attente_comp_oui");
  const non = t("attente_comp_non");
  const bientot = t("attente_comp_bientot");

  function valeur(brut: string) {
    if (brut === "oui")
      return (
        <span className="inline-flex" role="img" aria-label={oui}>
          <Check size={18} aria-hidden className="text-dj-texte" />
        </span>
      );
    if (brut === "non") return <span className="text-dj-texte-muet">{non}</span>;
    if (brut === "bientot")
      return (
        <span className="inline-flex items-center gap-1 text-dj-texte-muet">
          <Clock size={14} aria-hidden className="shrink-0" />
          {bientot}
        </span>
      );
    return <span>{brut}</span>;
  }

  return (
    <section aria-label={t("attente_comp_aria")} className="flex flex-col gap-10">
      {sections.map((section) => (
        <div key={section.id} role="table" aria-label={section.titre} className="flex flex-col text-sm sm:text-base">
          <div role="row" className="grid items-end gap-x-3 border-b border-dj-bordure-forte pb-3" style={colonnes}>
            <span role="columnheader" className="text-lg font-bold text-dj-texte sm:text-xl">
              {section.titre}
            </span>
            {paliers.map((p) => (
              <span key={p.prix_usd} role="columnheader" className="font-bold text-dj-texte">
                {t(`attente_palier_nom_${p.prix_usd}`)}
              </span>
            ))}
          </div>

          {section.lignes.map((ligne, i) => (
            <div
              key={`${i}-${ligne.libelle}`}
              role="row"
              className="grid items-start gap-x-3 border-b border-dj-bordure py-3 text-dj-texte"
              style={colonnes}
            >
              <span role="rowheader" className="min-w-0">
                <Libelle texte={ligne.libelle} />
              </span>
              {paliers.map((p, j) => (
                <span key={p.prix_usd} role="cell" className="min-w-0">
                  {valeur(ligne.valeurs[j])}
                </span>
              ))}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
