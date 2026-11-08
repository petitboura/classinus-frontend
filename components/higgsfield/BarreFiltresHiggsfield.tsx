"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

// Barre de filtres UNIQUE des deux sections Higgsfield (Catalogue et Marketing Studio).
// Règle de Bourama : ces deux sections ne doivent jamais différer l'une de l'autre. Toute
// évolution de la barre (rangée Image/Vidéo, recherche, compteur, réinitialisation) se fait
// ici, jamais dans une seule des deux sections.

type OptionFiltre = { value: string; label: string };

export function FiltreChips({
  label,
  options,
  valeur,
  onChange,
  compteurs,
}: {
  label?: string;
  options: OptionFiltre[];
  valeur: string;
  onChange: (v: string) => void;
  compteurs?: Record<string, number>;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
      {label ? <span className="shrink-0 text-xs font-semibold text-dj-texte-muet">{label}</span> : null}
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            valeur === o.value
              ? "border-dj-texte bg-dj-texte text-dj-fond"
              : "border-dj-bordure bg-transparent text-dj-texte-muet hover:border-dj-texte-muet hover:text-dj-texte"
          }`}
        >
          {o.label}
          {compteurs ? <span className="ml-1.5 text-[10px] font-bold opacity-70">{compteurs[o.value] ?? 0}</span> : null}
        </button>
      ))}
    </div>
  );
}

type GroupeChips = {
  options: OptionFiltre[];
  valeur: string;
  onChange: (v: string) => void;
  compteurs: Record<string, number>;
};

export function BarreFiltresHiggsfield({
  libelleAria,
  placeholderRecherche,
  recherche,
  onRecherche,
  rendu,
  second,
  nbFiltresActifs,
  texteCompteur,
  onReinitialiser,
}: {
  libelleAria: string;
  placeholderRecherche: string;
  recherche: string;
  onRecherche: (v: string) => void;
  // Rangée Image / Vidéo : toujours visible en haut, à côté du bouton Filtres.
  rendu: GroupeChips;
  // Seconde rangée (catégorie ou style) : dans le panneau Filtres.
  second: GroupeChips;
  nbFiltresActifs: number;
  texteCompteur: string;
  onReinitialiser: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const actif = nbFiltresActifs > 0;

  const boutonReinitialiser = (classe: string) => (
    <button
      type="button"
      onClick={onReinitialiser}
      className={`${classe} min-h-8 shrink-0 items-center rounded-full border border-dj-bordure bg-transparent px-3 py-1.5 text-xs font-semibold text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte`}
    >
      Réinitialiser les filtres
    </button>
  );

  return (
    <div
      className="sticky top-0 z-20 flex flex-col gap-3 rounded-b-xl border border-dj-bordure px-4 py-3 shadow-lg"
      style={{ backgroundColor: "var(--dj-surface)" }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-expanded={ouvert}
          aria-label={libelleAria}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
            ouvert || actif
              ? "border-dj-texte bg-dj-texte text-dj-fond"
              : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
          }`}
        >
          {ouvert ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
          Filtres
          {nbFiltresActifs > 0 && (
            <span className="ml-0.5 rounded-full bg-dj-fond px-1.5 py-0.5 text-[10px] font-bold leading-none text-dj-texte">
              {nbFiltresActifs}
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <FiltreChips options={rendu.options} valeur={rendu.valeur} onChange={rendu.onChange} compteurs={rendu.compteurs} />
        </div>
        {actif ? boutonReinitialiser("hidden md:inline-flex") : null}
        {/* Le compteur n'est pas indispensable sur téléphone : il n'apparaît qu'à partir de la taille tablette. */}
        <span className="hidden shrink-0 text-xs font-semibold text-dj-texte-muet md:inline">{texteCompteur}</span>
      </div>

      {ouvert && (
        <>
          <div className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-dj-texte-muet" />
            <input
              value={recherche}
              onChange={(e) => onRecherche(e.target.value)}
              placeholder={placeholderRecherche}
              className="h-10 w-full rounded-full border border-dj-bordure bg-dj-fond py-2 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-dj-texte-muet focus:border-dj-texte"
            />
            {recherche ? (
              <button
                type="button"
                onClick={() => onRecherche("")}
                aria-label="Effacer la recherche"
                className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <FiltreChips options={second.options} valeur={second.valeur} onChange={second.onChange} compteurs={second.compteurs} />
          {/* Sur téléphone, le bouton de réinitialisation vit dans le panneau (la rangée du haut est trop étroite). */}
          {actif ? boutonReinitialiser("inline-flex self-start md:hidden") : null}
        </>
      )}
    </div>
  );
}
