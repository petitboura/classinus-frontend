export type Locale = "fr" | "en";

export const CLE_LOCALE_CLASSINUS = "classinus.locale";
export const EVENEMENT_LOCALE_CLASSINUS = "classinus:locale-change";

/** Locale de l'interface sur cet appareil. Le français reste le repli sûr. */
export function obtenirLocale(): Locale {
  if (typeof window === "undefined") return "fr";
  try {
    return window.localStorage.getItem(CLE_LOCALE_CLASSINUS) === "en" ? "en" : "fr";
  } catch {
    return "fr";
  }
}

/** Enregistre le choix sans requête ni effet sur les données du compte. */
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
