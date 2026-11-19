// Brouillon du parcours de paiement de la page Abonnements (19/11/2026, demande de Bourama). Quand la
// personne doit créer un compte ou se connecter au milieu du parcours, elle quitte la page : on garde
// le palier choisi et son accord aux conditions pour la ramener au choix du moyen de paiement. Gardé
// dans l'onglet seulement (sessionStorage) et pendant quelques minutes, jamais de donnée personnelle.
const CLE = "classinus:brouillon-paiement";
const DUREE_VALIDITE_MS = 15 * 60 * 1000;

export type BrouillonPaiement = { palier: number };

export function memoriserBrouillonPaiement(brouillon: BrouillonPaiement) {
  try {
    window.sessionStorage.setItem(CLE, JSON.stringify({ ...brouillon, a: Date.now() }));
  } catch {}
}

export function effacerBrouillonPaiement() {
  try {
    window.sessionStorage.removeItem(CLE);
  } catch {}
}

export function lireBrouillonPaiement(): BrouillonPaiement | null {
  try {
    const brut = window.sessionStorage.getItem(CLE);
    if (!brut) return null;
    const note = JSON.parse(brut) as { palier?: unknown; a?: unknown };
    const recent = typeof note.a === "number" && Date.now() - note.a < DUREE_VALIDITE_MS;
    if (!recent || typeof note.palier !== "number") {
      window.sessionStorage.removeItem(CLE);
      return null;
    }
    return { palier: note.palier };
  } catch {
    return null;
  }
}
