import type { Locale } from "@/lib/i18n/locale";

// Texte d'accueil variable selon l'heure (18/08/2026, demande Bourama --
// textes fournis par lui, répartition des heures faite par Claude, à
// ajuster si besoin). Partagé entre le popup/plein écran du chat
// (ChatFlottant.tsx) et l'écran d'accueil de l'app (EcranAccueil.tsx) --
// extrait ici pour éviter que les deux dérivent chacun de leur côté.
export function texteAccueilSelonHeure(locale: Locale = "fr"): string {
  const heure = new Date().getHours();
  if (locale === "en") {
    if (heure >= 0 && heure < 3) return "Night owl, are you!";
    if (heure >= 3 && heure < 5) return "Pulling an all-nighter!!";
    if (heure >= 5 && heure < 8) return "Up early, aren't we!!";
    if (heure >= 8 && heure < 12) return "A long night or a short one?";
    if (heure >= 12 && heure < 18) return "What are we destroying this afternoon?";
    if (heure >= 18 && heure < 21) return "The day is ending, but the adventure is just beginning.";
    return "Staying up late?";
  }
  if (heure >= 0 && heure < 3) return "Oiseaux de nuit toi ?";
  if (heure >= 3 && heure < 5) return "Nuit blanche donc !!";
  if (heure >= 5 && heure < 8) return "Donc on est matinale !!";
  if (heure >= 8 && heure < 12) return "La nuit, longue ou courte ?";
  if (heure >= 12 && heure < 18) return "On détruit quoi cet après-midi ?";
  if (heure >= 18 && heure < 21) return "La journée termine, mais l'aventure commence.";
  return "On veille ?";
}

// Variante pour l'écran d'accueil / tableau de bord (18/08/2026, demande
// Bourama : textes du chat "adaptés à un écran d'accueil" -- ton
// tableau de bord plutôt qu'ouverture de conversation, mêmes tranches
// horaires que texteAccueilSelonHeure ci-dessus). Utilisée uniquement
// par EcranAccueil.tsx.
export function texteAccueilTableauDeBordSelonHeure(locale: Locale = "fr"): string {
  const heure = new Date().getHours();
  if (locale === "en") {
    if (heure >= 0 && heure < 3) return "The night belongs to you.";
    if (heure >= 3 && heure < 5) return "All-nighter, final stretch.";
    if (heure >= 5 && heure < 8) return "The day is rising, and so are you.";
    if (heure >= 8 && heure < 12) return "A new day begins.";
    if (heure >= 12 && heure < 18) return "Right in the thick of it.";
    if (heure >= 18 && heure < 21) return "The day is coming to an end.";
    return "The evening goes on.";
  }
  if (heure >= 0 && heure < 3) return "La nuit t'appartient.";
  if (heure >= 3 && heure < 5) return "Nuit blanche, dernière ligne droite.";
  if (heure >= 5 && heure < 8) return "Le jour se lève, toi aussi.";
  if (heure >= 8 && heure < 12) return "Une nouvelle journée commence.";
  if (heure >= 12 && heure < 18) return "En plein dedans.";
  if (heure >= 18 && heure < 21) return "La journée touche à sa fin.";
  return "La soirée continue.";
}
