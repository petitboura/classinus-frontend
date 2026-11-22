// Parrainage : le code d'un lien d'invitation est gardé sur l'appareil jusqu'à ce que le compte
// puisse l'enregistrer, puis le lien à partager est construit à partir du code de la personne.
//
// Pourquoi le garder : avec « Confirm email » actif dans Supabase, la personne arrive sur le lien,
// crée son compte, puis doit confirmer son email (souvent dans un autre onglet) avant d'être
// connectée. Le code doit survivre à ce détour, d'où localStorage et non sessionStorage.
// L'enregistrement se fait dans components/EnregistrementParrainage.tsx.

const CLE_CODE = "classinus:code-parrainage";

/** Nom du paramètre d'adresse (/invitation?code=ABCD2345). Une adresse à paramètre, pas à segment, pour que
 * la page reste valable dans l'export statique de l'appli mobile. */
export const PARAMETRE_CODE_PARRAINAGE = "code";
export const ROUTE_INVITATION = "/invitation";

/** Même plafond que le serveur (core/parrainage.py, LONGUEUR_MAX_CODE). */
const LONGUEUR_MAX_CODE = 32;
// Les codes sont faits de lettres et de chiffres (fonction SQL parrainage_generer_code). Tout autre
// caractère dans une adresse est refusé ici, avant d'être gardé ou envoyé.
const FORME_CODE = /^[A-Za-z0-9]+$/;

export function codeParrainageValide(code: string | null | undefined): code is string {
  return !!code && code.length <= LONGUEUR_MAX_CODE && FORME_CODE.test(code);
}

/** Garde le code d'un lien. Renvoie false si le code n'a pas la bonne forme ou si le stockage est bloqué. */
export function memoriserCodeParrainage(code: string): boolean {
  if (!codeParrainageValide(code)) return false;
  try {
    window.localStorage.setItem(CLE_CODE, code);
    return true;
  } catch {
    return false;
  }
}

export function lireCodeParrainageMemorise(): string | null {
  try {
    const code = window.localStorage.getItem(CLE_CODE);
    return codeParrainageValide(code) ? code : null;
  } catch {
    return null;
  }
}

export function oublierCodeParrainage(): void {
  try {
    window.localStorage.removeItem(CLE_CODE);
  } catch {
    // Stockage bloqué : rien à oublier.
  }
}

/**
 * Lien à partager pour inviter quelqu'un. Il part de NEXT_PUBLIC_APP_URL (fixe, correct sur le web comme
 * dans l'appli mobile, où window.location.origin vaut « https://localhost » et donnerait un lien inutilisable,
 * voir AppSidebar.tsx::partager). L'origine de la fenêtre ne sert qu'en dernier recours, sur le web.
 */
export function lienParrainage(code: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${ROUTE_INVITATION}?${PARAMETRE_CODE_PARRAINAGE}=${encodeURIComponent(code)}`;
}
