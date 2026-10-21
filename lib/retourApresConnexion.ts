const CLE = "classinus:retour-apres-connexion";
const DUREE_VALIDITE_MS = 10 * 60 * 1000;
export type RetourApresConnexion = { href: string; libelle: string };
export const RETOUR_PAR_DEFAUT: RetourApresConnexion = { href: "/", libelle: "au chat" };
export function memoriserRetourConnexion(retour: RetourApresConnexion) {
  try { window.sessionStorage.setItem(CLE, JSON.stringify({ ...retour, a: Date.now() })); } catch {}
}
export function oublierRetourConnexion() {
  try { window.sessionStorage.removeItem(CLE); } catch {}
}
export function lireRetourConnexion(): RetourApresConnexion {
  try {
    const brut = window.sessionStorage.getItem(CLE);
    window.sessionStorage.removeItem(CLE);
    if (!brut) return RETOUR_PAR_DEFAUT;
    const note = JSON.parse(brut) as Partial<RetourApresConnexion> & { a?: number };
    const recente = typeof note.a === "number" && Date.now() - note.a < DUREE_VALIDITE_MS;
    const interne = typeof note.href === "string" && note.href.startsWith("/") && !note.href.startsWith("//");
    if (!recente || !interne || typeof note.libelle !== "string" || !note.libelle) return RETOUR_PAR_DEFAUT;
    return { href: note.href, libelle: note.libelle };
  } catch { return RETOUR_PAR_DEFAUT; }
}
