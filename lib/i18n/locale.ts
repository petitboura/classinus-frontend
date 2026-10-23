export type Locale = "fr" | "en";

export const CLE_LOCALE_CLASSINUS = "classinus.locale";
export const EVENEMENT_LOCALE_CLASSINUS = "classinus:locale-change";

/**
 * Langue du navigateur ou du téléphone : anglais si c'est l'anglais, sinon le français
 * (arabe ou toute autre langue comprise, le français reste le repli sûr). Seule la langue
 * principale compte. Lecture seule, rien n'est enregistré nulle part.
 */
function localeDeLAppareil(): Locale {
  try {
    const principale = navigator.languages?.[0] ?? navigator.language ?? "";
    return principale.toLowerCase().startsWith("en") ? "en" : "fr";
  } catch {
    return "fr";
  }
}

/**
 * Locale de l'interface sur cet appareil. Ordre : le choix déjà fait sur l'appareil (Préférences,
 * inscription, ou langue du compte reportée ici), sinon la langue du navigateur ou du téléphone.
 * Le compte n'est jamais modifié par la simple détection (voir aChoisiLocale ci-dessous).
 */
export function obtenirLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  try {
    const choix = window.localStorage.getItem(CLE_LOCALE_CLASSINUS);
    if (choix === "fr" || choix === "en") return choix;
  } catch {
    // Stockage bloqué : on retombe sur la langue de l'appareil.
  }
  return localeDeLAppareil();
}

/** Vrai si la personne a déjà choisi une langue sur cet appareil (sinon c'est juste la langue détectée, qui ne doit jamais être enregistrée sur le compte). */
export function aChoisiLocale(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(CLE_LOCALE_CLASSINUS);
    return v === "fr" || v === "en";
  } catch {
    return false;
  }
}

/** Enregistre le choix sur l'appareil, sans requête. Le compte est mis à jour par definirLangueInterface (lib/contexteStatutUtilisateur.tsx). */
export function definirLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE_LOCALE_CLASSINUS, locale);
  } catch {
    // Le sélecteur reste fonctionnel pendant la session si le stockage est bloqué.
  }
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent(EVENEMENT_LOCALE_CLASSINUS, { detail: locale }));
}
