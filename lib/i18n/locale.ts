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

/** Vrai si la personne a déjà choisi une langue sur cet appareil (sinon c'est juste le français par défaut). */
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
