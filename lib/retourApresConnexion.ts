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
    const href = note.href;
    const libelle = note.libelle;
    if (!recente || typeof href !== "string" || !href.startsWith("/") || href.startsWith("//")) return RETOUR_PAR_DEFAUT;
    if (typeof libelle !== "string" || !libelle) return RETOUR_PAR_DEFAUT;
    return { href, libelle };
  } catch { return RETOUR_PAR_DEFAUT; }
}
