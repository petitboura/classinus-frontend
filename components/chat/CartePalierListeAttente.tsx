"use client";

import { Check, X } from "lucide-react";
import type { PalierListeAttente } from "@/lib/listeAttente";

type Traduire = (cle: string, valeurs?: Record<string, string | number>) => string;

// Carte d'un palier de la liste d'attente. Le prix est en grand, le crédit en dessous, puis les points
// du palier. Les points viennent du serveur (clé attente_palier_<prix>_points, séparés par « | ») ;
// un point qui commence par « ~ » est une capacité que le palier n'a pas : il s'affiche avec une
// croix grisée au lieu d'une coche (17/11/2026, les trois cartes citent les mêmes capacités dans le
// même ordre, pour qu'on voie d'un coup d'œil ce que chaque palier contient ou non).
// Sans points, la phrase de description du palier est affichée à la place. Même chose pour le badge
// (clé attente_palier_<prix>_badge) : sans texte, aucun badge. Sur téléphone, seule la carte choisie
// déplie ses points pour garder la liste courte ; sur grand écran, toutes les cartes les montrent.
export function CartePalierListeAttente({
  palier,
  choisi,
  onChoisir,
  t,
}: {
  palier: PalierListeAttente;
  choisi: boolean;
  onChoisir: () => void;
  t: Traduire;
}) {
  const prix = palier.prix_usd;
  const points = t(`attente_palier_${prix}_points`)
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith("~") ? { texte: p.slice(1).trim(), inclus: false } : { texte: p, inclus: true }));
  const description = t(`attente_palier_${prix}`);
  const badge = t(`attente_palier_${prix}_badge`);

  return (
    <button
      type="button"
      role="radio"
      aria-checked={choisi}
      onClick={onChoisir}
      className={`relative flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-200 motion-reduce:transition-none ${
        choisi
          ? "border-dj-accent-1 bg-dj-surface-haute shadow-[0_0_0_1px_var(--dj-accent-1)]"
          : "border-dj-bordure hover:border-dj-texte-muet hover:bg-dj-surface-haute"
      }`}
    >
      {badge && (
        <span className="absolute -top-2.5 left-4 rounded-full bg-dj-accent-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1A0D02]">
          {badge}
        </span>
      )}

      <span className="flex items-start justify-between gap-3">
        <span className="flex flex-col">
          <span className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold leading-none text-dj-texte">${prix}</span>
            <span className="text-xs font-medium text-dj-texte-muet">{t("attente_palier_par_mois")}</span>
          </span>
          <span className="mt-1.5 text-xs font-semibold text-dj-accent-1-texte">
            {t("attente_palier_credit", { credit: palier.credit_usd })}
          </span>
        </span>
        <span
          aria-hidden
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
            choisi ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02]" : "border-dj-bordure text-transparent"
          }`}
        >
          <Check size={12} strokeWidth={3} />
        </span>
      </span>

      <span
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none sm:grid-rows-[1fr] sm:opacity-100 ${
          choisi ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <span className="overflow-hidden">
          {points.length > 0 ? (
            <span className="flex flex-col gap-1.5 border-t border-dj-bordure pt-3">
              {points.map((point) => (
                <span
                  key={point.texte}
                  className={`flex items-start gap-2 text-xs ${point.inclus ? "text-dj-texte" : "text-dj-texte-muet"}`}
                >
                  {point.inclus ? (
                    <Check size={13} className="mt-px shrink-0 text-dj-accent-1-texte" />
                  ) : (
                    <X size={13} className="mt-px shrink-0 text-dj-texte-muet" />
                  )}
                  <span>{point.texte}</span>
                </span>
              ))}
            </span>
          ) : (
            description && <span className="block border-t border-dj-bordure pt-3 text-xs text-dj-texte-muet">{description}</span>
          )}
        </span>
      </span>
    </button>
  );
}
