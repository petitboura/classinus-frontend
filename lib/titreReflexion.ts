import type { Locale } from "@/lib/i18n/locale";

// Titre d'une ligne de réflexion dans la roue (26/11/2026, demande Bourama) : un mot de la famille
// de la réflexion, deux points, puis la première phrase de ce que le modèle pense. Le mot change
// d'une réflexion à l'autre pour que la roue ne répète pas le même titre. Il se choisit sur le
// numéro de la réflexion dans le message (jamais sur le texte, qui grandit pendant qu'il s'écrit :
// le mot changerait sous les yeux).
const MOTS: Record<Locale, string[]> = {
  fr: ["Réflexion", "Raisonnement", "Analyse", "Pensée"],
  en: ["Reasoning", "Thinking", "Analysis", "Reflection"],
};

// Même plafond que les textes de ligne d'outil écrits par l'IA (LONGUEUR_MAX_LIBELLE côté serveur).
const LONGUEUR_MAX_PHRASE = 160;

// Première phrase d'un texte de réflexion, nettoyée pour l'affichage : la première ligne non vide
// (souvent un titre en gras que le modèle écrit lui-même), coupée à la fin de sa première phrase.
// Sans balises de mise en forme ni tirets doubles ou longs, comme tous les textes écrits pour la
// personne. Chaîne vide tant que le modèle n'a rien écrit d'utilisable.
export function premierePhraseReflexion(brut: string): string {
  const ligne = brut
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/^[\s>#*_\-`]+/, "").trim())
    .find((l) => /[^\W\d_]/u.test(l));
  if (!ligne) return "";
  const nettoyee = ligne
    .replace(/[*_`]+/g, "")
    .replace(/\s*(-{2,}|—|–)\s*/g, ", ")
    .replace(/\s+/g, " ")
    .trim();
  const fin = nettoyee.match(/^(.+?[.!?…])(?:\s|$)/u);
  const phrase = fin ? fin[1] : nettoyee;
  if (phrase.length <= LONGUEUR_MAX_PHRASE) return phrase;
  return `${phrase.slice(0, LONGUEUR_MAX_PHRASE).replace(/\s+\S*$/, "").replace(/[\s,;:.!?…]+$/, "")}…`;
}

// « Réflexion : première phrase » (« Reasoning: first sentence » en anglais). Seul le mot est
// affiché tant que le modèle n'a pas écrit de phrase.
export function titreReflexion(brut: string, numero: number, locale: Locale): string {
  const mots = MOTS[locale] ?? MOTS.fr;
  const mot = mots[((numero % mots.length) + mots.length) % mots.length];
  const phrase = premierePhraseReflexion(brut);
  const deuxPoints = locale === "en" ? ":" : " :";
  return phrase ? `${mot}${deuxPoints} ${phrase}` : mot;
}
