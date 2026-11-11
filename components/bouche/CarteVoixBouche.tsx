"use client";

import { SelectPersonnalise } from "@/components/SelectPersonnalise";
import { Skeleton } from "@/components/Skeleton";
import type { VoixBouche } from "@/lib/boucheApi";
import { textesBouche } from "@/lib/textesBouche";
import type { Locale } from "@/lib/erreurs";

export type EtatVoixBouche = {
  chargement: boolean;
  url: string | null;
  erreur: string | null;
};

/** Squelette de carte, de la même hauteur que la vraie carte pour éviter tout saut à l'affichage. */
export function CarteVoixBoucheSquelette() {
  return (
    <div className="rounded-xl border border-dj-bordure bg-dj-surface p-4" aria-hidden>
      <Skeleton className="h-5 w-48 rounded" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full rounded" />
      <Skeleton className="mt-4 h-10 w-full rounded-lg" />
    </div>
  );
}

export function CarteVoixBouche({
  voix,
  locale,
  etat,
  locuteur,
  desactive,
  surLocuteur,
  surEcouter,
}: {
  voix: VoixBouche;
  locale: Locale;
  etat: EtatVoixBouche;
  locuteur: number;
  desactive: boolean;
  surLocuteur: (locuteur: number) => void;
  surEcouter: () => void;
}) {
  const t = textesBouche(locale);
  const licence = voix.licence === "non_commercial" ? t.licenceNonCommerciale : t.licenceAVerifier;

  return (
    <section className="animate-dj-fade-in-rapide rounded-xl border border-dj-bordure bg-dj-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-base font-semibold text-dj-texte">{voix.nom}</h2>
        <p className="text-xs text-dj-texte-muet">{voix.depot}</p>
      </div>

      <ul className="mt-2 flex flex-wrap gap-2 text-xs">
        <li
          className={
            voix.licence === "non_commercial"
              ? "rounded-full border border-dj-bordure-forte px-2 py-0.5 text-dj-accent-1-texte"
              : "rounded-full border border-dj-bordure px-2 py-0.5 text-dj-texte-muet"
          }
        >
          {licence}
        </li>
        {voix.experimental ? (
          <li className="rounded-full border border-dj-bordure px-2 py-0.5 text-dj-texte-muet">{t.experimental}</li>
        ) : null}
      </ul>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        {voix.locuteurs > 1 ? (
          <div className="flex items-center gap-2 text-sm text-dj-texte-muet">
            <span>{t.locuteur}</span>
            <SelectPersonnalise
              compact
              options={Array.from({ length: voix.locuteurs }, (_, i) => ({ id: String(i), label: t.locuteurNumero(i + 1) }))}
              valeur={String(locuteur)}
              onChange={(id) => surLocuteur(Number(id))}
            />
          </div>
        ) : null}

        <button
          type="button"
          onClick={surEcouter}
          disabled={desactive || etat.chargement}
          aria-busy={etat.chargement}
          className="flex min-h-11 items-center justify-center gap-2 rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:cursor-wait disabled:opacity-60 sm:ml-auto"
        >
          {etat.chargement ? (
            <span
              aria-hidden
              className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#1A0D02] border-t-transparent"
            />
          ) : null}
          {etat.chargement ? t.generation : t.ecouter}
        </button>
      </div>

      {etat.erreur ? (
        <p role="alert" className="mt-3 animate-dj-fade-in-rapide text-sm text-dj-texte">
          {etat.erreur}
        </p>
      ) : null}

      {etat.url ? (
        <audio
          key={etat.url}
          controls
          autoPlay
          src={etat.url}
          aria-label={t.lecteurAudio(voix.nom)}
          className="mt-3 w-full animate-dj-fade-in-rapide"
        />
      ) : null}
    </section>
  );
}
