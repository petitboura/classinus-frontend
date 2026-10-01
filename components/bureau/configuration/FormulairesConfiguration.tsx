"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { texteConfiguration } from "@/lib/i18n/textesConfiguration";

const CHAMP =
  "w-full rounded-cgpt-carte border border-dj-bordure bg-dj-surface-haute px-4 py-3 text-base text-dj-texte outline-none transition-colors focus:border-dj-bordure-forte";

// Procédure : une liste d'étapes numérotées, ajoutées une par une.
export function FormulaireProcedure({ etapes, onChange }: { etapes: string[]; onChange: (e: string[]) => void }) {
  function modifier(i: number, valeur: string) {
    onChange(etapes.map((e, k) => (k === i ? valeur : e)));
  }
  function deplacer(i: number, sens: -1 | 1) {
    const j = i + sens;
    if (j < 0 || j >= etapes.length) return;
    const copie = [...etapes];
    [copie[i], copie[j]] = [copie[j], copie[i]];
    onChange(copie);
  }
  function retirer(i: number) {
    const suite = etapes.filter((_, k) => k !== i);
    onChange(suite.length > 0 ? suite : [""]);
  }
  function ajouter() {
    onChange([...etapes, ""]);
  }

  return (
    <div className="flex flex-col gap-2">
      {etapes.map((etape, i) => (
        <div key={i} className="flex animate-dj-fade-in-rapide items-center gap-2">
          <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-xs font-semibold text-dj-texte-muet">
            {i + 1}
          </span>
          <input
            autoFocus={i === etapes.length - 1 && etape === "" && etapes.length > 1}
            value={etape}
            onChange={(e) => modifier(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && etape.trim()) {
                e.preventDefault();
                ajouter();
              }
            }}
            placeholder={texteConfiguration("procedure.etape.placeholder")}
            className="min-w-0 flex-1 rounded-cgpt-carte border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none transition-colors focus:border-dj-bordure-forte"
          />
          <div className="flex flex-shrink-0 items-center">
            <button
              type="button"
              onClick={() => deplacer(i, -1)}
              disabled={i === 0}
              title={texteConfiguration("procedure.monter")}
              aria-label={texteConfiguration("procedure.monter")}
              className="rounded-md p-1.5 text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-30"
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => deplacer(i, 1)}
              disabled={i === etapes.length - 1}
              title={texteConfiguration("procedure.descendre")}
              aria-label={texteConfiguration("procedure.descendre")}
              className="rounded-md p-1.5 text-dj-texte-muet transition-colors hover:text-dj-texte disabled:opacity-30"
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => retirer(i)}
              title={texteConfiguration("procedure.retirer")}
              aria-label={texteConfiguration("procedure.retirer")}
              className="rounded-md p-1.5 text-dj-texte-muet transition-colors hover:text-[var(--dj-erreur)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={ajouter}
        className="mt-1 flex w-fit items-center gap-1.5 rounded-full border border-dashed border-dj-bordure px-3 py-1.5 text-xs text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
      >
        <Plus size={13} /> {texteConfiguration("procedure.ajouterEtape")}
      </button>
    </div>
  );
}

// Règle : un seul champ d'une ligne, sans limite de longueur imposée.
export function FormulaireRegle({ texte, onChange, onValider }: { texte: string; onChange: (t: string) => void; onValider: () => void }) {
  return (
    <input
      autoFocus
      value={texte}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onValider();
        }
      }}
      placeholder={texteConfiguration("regle.ajout.placeholder")}
      className={CHAMP}
    />
  );
}

// Comportement : deux champs reliés, "dans tel cas" puis "comporte toi ainsi".
export function FormulaireComportement({
  cas,
  reaction,
  onChangeCas,
  onChangeReaction,
}: {
  cas: string;
  reaction: string;
  onChangeCas: (t: string) => void;
  onChangeReaction: (t: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">{texteConfiguration("comportement.cas.libelle")}</label>
      <textarea
        autoFocus
        value={cas}
        onChange={(e) => onChangeCas(e.target.value)}
        placeholder={texteConfiguration("comportement.cas.placeholder")}
        rows={3}
        className={`${CHAMP} resize-none`}
      />
      <div className="flex justify-center text-dj-texte-muet">
        <ArrowDown size={18} />
      </div>
      <label className="text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">{texteConfiguration("comportement.reaction.libelle")}</label>
      <textarea
        value={reaction}
        onChange={(e) => onChangeReaction(e.target.value)}
        placeholder={texteConfiguration("comportement.reaction.placeholder")}
        rows={5}
        className={`${CHAMP} resize-none`}
      />
    </div>
  );
}

// Style : un exemple d'écriture à coller, ou une description du ton.
export function FormulaireStyle({ texte, onChange }: { texte: string; onChange: (t: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-dj-texte-muet">{texteConfiguration("style.libelle")}</label>
      <textarea
        autoFocus
        value={texte}
        onChange={(e) => onChange(e.target.value)}
        placeholder={texteConfiguration("style.placeholder")}
        rows={14}
        className={`${CHAMP} resize-none font-lecture italic`}
      />
    </div>
  );
}
