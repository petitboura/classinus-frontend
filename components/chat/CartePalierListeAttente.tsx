"use client";

import { Check } from "lucide-react";
import type { PalierListeAttente } from "@/lib/listeAttente";

type Traduire = (cle: string, valeurs?: Record<string, string | number>) => string;

// Carte d'un palier de la page des abonnements, sur le modèle de la page de tarification de Claude (capture
// de Bourama, 19/11/2026). De haut en bas : le nom, une courte phrase, le prix en grand, un bouton
// « Payer », un trait de séparation, puis la liste de ce qui est inclus avec des coches. Le montant du
// crédit donné à chaque palier n'est volontairement pas affiché (décision de Bourama, 19/11/2026). À partir du deuxième palier, un titre « Tout ce qui est inclus dans <palier précédent>, plus : »
// ouvre la liste, qui ne montre alors que ce qui s'ajoute.
//
// Tout vient de Supabase (textes_modeles_llm), en français et en anglais :
// attente_palier_nom_<prix>, attente_palier_<prix>_accroche, attente_palier_<prix>_inclus_titre (avec
// {precedent}), attente_palier_<prix>_inclus (lignes séparées par « | ») et attente_abo_payer. Le badge
// facultatif (attente_palier_<prix>_badge) reste pris en charge.
export function CartePalierListeAttente({
  palier,
  nomPrecedent,
  onPayer,
  t,
}: {
  palier: PalierListeAttente;
  nomPrecedent: string;
  onPayer: () => void;
  t: Traduire;
}) {
  const prix = palier.prix_usd;
  const badge = t(`attente_palier_${prix}_badge`);
  const nom = t(`attente_palier_nom_${prix}`);
  const accroche = t(`attente_palier_${prix}_accroche`);
  const titreInclus = nomPrecedent ? t(`attente_palier_${prix}_inclus_titre`, { precedent: nomPrecedent }) : "";
  const lignes = t(`attente_palier_${prix}_inclus`)
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="relative flex flex-col gap-5 rounded-2xl border border-dj-bordure p-5">
      {badge && (
        <span className="absolute -top-2.5 left-5 rounded-full bg-dj-accent-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-[#1A0D02]">
          {badge}
        </span>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-2xl font-bold text-dj-texte">{nom}</span>
        {accroche && <span className="text-base text-dj-texte-muet">{accroche}</span>}
      </div>

      <span className="flex items-baseline gap-1.5">
        <span className="text-4xl font-extrabold leading-none text-dj-texte">${prix}</span>
        <span className="text-sm font-medium text-dj-texte-muet">{t("attente_palier_par_mois")}</span>
      </span>

      <button
        type="button"
        onClick={onPayer}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-dj-accent-1 px-4 py-3 text-base font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2"
      >
        {t("attente_abo_payer")}
      </button>

      <div className="flex flex-col gap-3 border-t border-dj-bordure pt-5">
        {titreInclus && <p className="text-sm font-bold text-dj-texte">{titreInclus}</p>}
        <ul className="flex flex-col gap-3">
          {lignes.map((ligne, i) => (
            <li key={`${i}-${ligne}`} className="flex items-start gap-2.5 text-sm text-dj-texte">
              <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-dj-texte-muet" />
              <span className="min-w-0">{ligne}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
