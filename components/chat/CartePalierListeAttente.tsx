"use client";

import { Check, Clock } from "lucide-react";
import type { PalierListeAttente } from "@/lib/listeAttente";

type Traduire = (cle: string, valeurs?: Record<string, string | number>) => string;

// Mise en page partagée avec le squelette de chargement (components/abonnements/SqueletteAbonnements.tsx),
// pour que rien ne saute quand le contenu arrive. Sur ordinateur : trois colonnes de même hauteur. Sur
// téléphone : une rangée qui défile sur le côté, la carte suivante dépassant un peu pour montrer qu'on peut
// glisser (le haut a de la marge pour que le badge et le soulèvement au survol ne soient pas coupés).
export const CLASSES_GRILLE_PALIERS =
  "-mx-4 flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto px-4 pb-4 pt-5 [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 md:pt-3 [&::-webkit-scrollbar]:hidden";
export const CLASSES_ENVELOPPE_CARTE = "w-[82%] shrink-0 snap-center sm:w-[60%] md:w-auto md:shrink";

// Carte d'un palier de la page des abonnements, sur le modèle de la page de tarification de Claude (capture
// de Bourama, 19/11/2026). De haut en bas : le nom, une courte phrase, le prix en grand, un bouton
// « Payer », un trait de séparation, puis la liste de ce qui est inclus avec des coches. Le montant du
// crédit donné à chaque palier n'est volontairement pas affiché (décision de Bourama, 19/11/2026). À partir
// du deuxième palier, un titre « Tout ce qui est inclus dans <palier précédent>, plus : » ouvre la liste, qui
// ne montre alors que ce qui s'ajoute.
//
// Refonte du 20/11/2026 (demande de Bourama) :
// - Le palier qui a un badge en base est mis en avant : bordure d'accent, badge, bouton plein. Les autres
//   ont un bouton contour. Aucun palier n'est désigné dans le code, c'est la présence du texte
//   attente_palier_<prix>_badge qui décide.
// - Les cartes ont la même hauteur et le bouton comme la liste sont au même niveau d'une carte à l'autre
//   (hauteur réservée pour la phrase, place réservée pour le titre de liste du premier palier).
// - Une ligne qui commence par « ~ » est une fonction à venir : horloge et mot « Bientôt » (le même texte
//   que le tableau, attente_comp_bientot).
// - Les cartes apparaissent l'une après l'autre et se soulèvent un peu au survol. L'animation d'entrée est
//   sur l'enveloppe et le soulèvement sur la carte : une animation qui garde son état final bloquerait
//   sinon le soulèvement.
//
// Tout vient de Supabase (textes_modeles_llm), en français et en anglais :
// attente_palier_nom_<prix>, attente_palier_<prix>_accroche, attente_palier_<prix>_inclus_titre (avec
// {precedent}), attente_palier_<prix>_inclus (lignes séparées par « | »), attente_palier_<prix>_badge et
// attente_abo_payer.
export function CartePalierListeAttente({
  palier,
  index,
  nomPrecedent,
  titreReserve,
  onPayer,
  t,
}: {
  palier: PalierListeAttente;
  index: number;
  nomPrecedent: string;
  // Au moins une autre carte a un titre de liste : on réserve sa place ici pour que les listes démarrent
  // à la même hauteur (ordinateur seulement, sur téléphone les cartes sont côte à côte sans lien de hauteur).
  titreReserve: boolean;
  onPayer: () => void;
  t: Traduire;
}) {
  const prix = palier.prix_usd;
  const badge = t(`attente_palier_${prix}_badge`);
  const enAvant = Boolean(badge);
  const nom = t(`attente_palier_nom_${prix}`);
  const accroche = t(`attente_palier_${prix}_accroche`);
  const titreInclus = nomPrecedent ? t(`attente_palier_${prix}_inclus_titre`, { precedent: nomPrecedent }) : "";
  const lignes = t(`attente_palier_${prix}_inclus`)
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => (l.startsWith("~") ? { texte: l.slice(1).trim(), bientot: true } : { texte: l, bientot: false }));
  const libelleBientot = t("attente_comp_bientot");

  return (
    <div
      className={`${CLASSES_ENVELOPPE_CARTE} animate-dj-fade-up motion-reduce:animate-none`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div
        className={`relative flex h-full flex-col gap-5 rounded-2xl border p-5 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
          enAvant ? "border-dj-accent-1 ring-1 ring-dj-accent-1" : "border-dj-bordure"
        }`}
      >
        {badge && (
          <span className="absolute -top-2.5 left-5 rounded-full bg-dj-accent-1 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-dj-sur-accent">
            {badge}
          </span>
        )}

        <div className="flex flex-col gap-1">
          <span className="text-2xl font-bold text-dj-texte">{nom}</span>
          {/* Deux lignes de hauteur réservées : le prix et le bouton restent au même niveau d'une carte à l'autre. */}
          <span className="min-h-12 text-base text-dj-texte-muet">{accroche}</span>
        </div>

        <span className="flex items-baseline gap-1.5">
          <span className="text-4xl font-extrabold leading-none text-dj-texte">${prix}</span>
          <span className="text-sm font-medium text-dj-texte-muet">{t("attente_palier_par_mois")}</span>
        </span>

        <button
          type="button"
          onClick={onPayer}
          className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-base font-bold transition-colors ${
            enAvant
              ? "bg-dj-accent-1 text-dj-sur-accent hover:bg-dj-accent-2"
              : "border border-dj-bordure-forte bg-transparent text-dj-texte hover:bg-dj-surface-haute"
          }`}
        >
          {t("attente_abo_payer")}
        </button>

        <div className="flex flex-1 flex-col gap-3 border-t border-dj-bordure pt-5">
          {titreInclus ? (
            <p className="text-sm font-bold text-dj-texte">{titreInclus}</p>
          ) : (
            titreReserve && <div aria-hidden className="hidden h-5 md:block" />
          )}
          <ul className="flex flex-col gap-3">
            {lignes.map((ligne, i) => (
              <li
                key={`${i}-${ligne.texte}`}
                className={`flex items-start gap-2.5 text-sm ${ligne.bientot ? "text-dj-texte-muet" : "text-dj-texte"}`}
              >
                {ligne.bientot ? (
                  <Clock size={16} aria-hidden className="mt-0.5 shrink-0 text-dj-texte-muet" />
                ) : (
                  <Check size={16} aria-hidden className="mt-0.5 shrink-0 text-dj-texte-muet" />
                )}
                <span className="min-w-0">
                  {ligne.texte}
                  {ligne.bientot && libelleBientot && (
                    <span className="ml-2 rounded-full border border-dj-bordure px-2 py-0.5 text-xs font-medium">
                      {libelleBientot}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
