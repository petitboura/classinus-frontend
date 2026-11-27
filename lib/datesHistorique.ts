// Dates des conversations de l'historique du chat (27/11/2026, demande
// Bourama) : texte court sur la ligne, date complete dans la bulle de survol.
// Une conversation d'aujourd'hui montre le temps ecoule au lieu d'une date.
// Calcul pur, en francais et en anglais.

import type { Locale } from "@/lib/i18n/locale";

const MINUTE_MS = 60_000;

function debutJour(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function ecartEnJours(d: Date, maintenant: Date): number {
  return Math.round((debutJour(maintenant) - debutJour(d)) / 86_400_000);
}

// "a l'instant", "il y a 12 min", "il y a 3 h". Une date legerement dans le
// futur (horloge du telephone en retard) compte comme "a l'instant".
function tempsEcoule(d: Date, maintenant: Date, locale: Locale): string {
  const minutes = Math.floor((maintenant.getTime() - d.getTime()) / MINUTE_MS);
  if (minutes < 1) return locale === "en" ? "just now" : "à l'instant";
  if (minutes < 60) return locale === "en" ? `${minutes} min ago` : `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return locale === "en" ? `${heures} h ago` : `il y a ${heures} h`;
}

// Texte court d'une ligne : temps ecoule aujourd'hui, Hier, puis jour et mois
// (avec l'annee seulement si ce n'est pas l'annee en cours). Chaine vide si la
// date est illisible.
export function dateCourteFil(iso: string, maintenant: Date, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ecart = ecartEnJours(d, maintenant);
  if (ecart <= 0) return tempsEcoule(d, maintenant, locale);
  if (ecart === 1) return locale === "en" ? "Yesterday" : "Hier";
  const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (d.getFullYear() !== maintenant.getFullYear()) options.year = "numeric";
  return d.toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", options);
}

// Date de la bulle de survol : temps ecoule aujourd'hui, sinon la date complete
// avec le jour de la semaine et l'heure.
export function dateBulleFil(iso: string, maintenant: Date, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);
  if (ecartEnJours(d, maintenant) <= 0) return majuscule(tempsEcoule(d, maintenant, locale));
  const langue = locale === "en" ? "en-US" : "fr-FR";
  const jour = d.toLocaleDateString(langue, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const heure = d.toLocaleTimeString(langue, { hour: "numeric", minute: "2-digit" });
  return `${majuscule(jour)} ${locale === "en" ? "at" : "à"} ${heure}`;
}
