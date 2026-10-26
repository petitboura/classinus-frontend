"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";

const ETIQUETTE = "text-xs font-medium uppercase tracking-wide text-dj-texte-muet";
const BOUTON_ICONE =
  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-dj-texte-muet transition-colors duration-200 hover:bg-dj-surface-haute hover:text-dj-texte";

// Le nom et la description tiennent sur une seule ligne dans l'en-tête du SKILL.md.
const uneLigne = (texte: string) => texte.replace(/\s*\n\s*/g, " ").trim();

/**
 * Valeur qui se modifie en place : un clic sur le crayon la transforme en champ,
 * Entrée ou la sortie du champ valide, Échap annule. Aucun cadre autour.
 */
function ValeurModifiable({
  valeur, enEdition, onFin, onValider, multiligne, etiquetteAria, vide, classes,
}: {
  valeur: string; enEdition: boolean; onFin: () => void; onValider: (v: string) => void;
  multiligne?: boolean; etiquetteAria: string; vide: string; classes: string;
}) {
  const [brouillon, setBrouillon] = useState(valeur);
  const champ = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const annule = useRef(false);
  useEffect(() => {
    if (!enEdition) return;
    setBrouillon(valeur);
    annule.current = false;
    champ.current?.focus();
    champ.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enEdition]);
  // Le champ de la description grandit avec son texte.
  useEffect(() => {
    if (!enEdition || !multiligne || !champ.current) return;
    champ.current.style.height = "auto";
    champ.current.style.height = `${champ.current.scrollHeight}px`;
  }, [brouillon, enEdition, multiligne]);

  if (!enEdition) {
    return valeur
      ? <span className={`${classes} ${multiligne ? "w-full whitespace-pre-line" : ""}`}>{valeur}</span>
      : <span className={`${classes} italic opacity-60`}>{vide}</span>;
  }
  const valider = () => { if (!annule.current) onValider(uneLigne(brouillon)); onFin(); };
  const surTouche = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); valider(); }
    else if (e.key === "Escape") { e.preventDefault(); annule.current = true; onFin(); }
  };
  const commun = {
    ref: champ as never,
    value: brouillon,
    "aria-label": etiquetteAria,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setBrouillon(e.target.value),
    onBlur: valider,
    onKeyDown: surTouche,
    className: `${classes} w-full resize-none overflow-hidden border-0 border-b border-dj-bordure-forte bg-transparent p-0 focus:outline-none`,
  };
  return multiligne ? <textarea rows={1} {...commun} /> : <input {...commun} />;
}

/**
 * En-tête d'un SKILL.md dans l'aperçu : le crayon devant « Nom » et devant
 * « Description », et pour la description un bouton qui la replie ou la déplie
 * (dépliée par défaut), à droite du crayon.
 */
export function EnteteSkillModifiable({
  nom, description, onNom, onDescription,
}: { nom: string; description: string; onNom: (v: string) => void; onDescription: (v: string) => void }) {
  const [editeNom, setEditeNom] = useState(false);
  const [editeDescription, setEditeDescription] = useState(false);
  const [ouverte, setOuverte] = useState(true);
  const visible = ouverte || editeDescription;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1">
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => setEditeNom(true)} aria-label="Modifier le nom" title="Modifier le nom" className={BOUTON_ICONE}>
          <Pencil size={14} />
        </button>
        <span className={ETIQUETTE}>Nom</span>
        <div className="min-w-0 flex-1 pl-2">
          <ValeurModifiable valeur={nom} enEdition={editeNom} onFin={() => setEditeNom(false)} onValider={onNom} etiquetteAria="Nom du skill" vide="Sans nom" classes="text-base font-semibold text-dj-texte" />
        </div>
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="flex items-center gap-1">
          <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { setEditeDescription(true); setOuverte(true); }} aria-label="Modifier la description" title="Modifier la description" className={BOUTON_ICONE}>
            <Pencil size={14} />
          </button>
          <button type="button" onClick={() => setOuverte(o => !o)} aria-expanded={visible} aria-label={visible ? "Replier la description" : "Déplier la description"} title={visible ? "Replier la description" : "Déplier la description"} className={BOUTON_ICONE}>
            <ChevronDown size={16} className={`transition-transform duration-200 ${visible ? "" : "-rotate-90"}`} />
          </button>
          <span className={ETIQUETTE}>Description</span>
        </div>
        <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${visible ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className="min-h-0 overflow-hidden">
            <div className="pt-1.5">
              <ValeurModifiable valeur={description} enEdition={editeDescription} onFin={() => setEditeDescription(false)} onValider={onDescription} multiligne etiquetteAria="Description du skill" vide="Aucune description" classes="font-lecture text-sm leading-relaxed text-dj-texte-muet" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
