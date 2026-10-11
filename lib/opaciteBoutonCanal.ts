// Créé le 01/10/2026, demande Bourama : le bouton permanent du canal en
// direct (superposition Electron) doit pouvoir être rendu discret au repos.
// Le réglage se fait directement depuis le bouton, une fois le canal activé
// (voir components/ReglageOpaciteBoutonCanal.tsx).
//
// Mémorisé dans le stockage local de la superposition, seule fenêtre qui
// l'utilise. Chaque lecture et chaque écriture est protégée : un stockage
// vide ou refusé ne doit jamais empêcher le bouton de s'afficher.

// Jamais en dessous (décision Bourama, 01/10/2026) : on ne perd pas le bouton.
export const OPACITE_REPOS_MIN = 0.15;
export const OPACITE_REPOS_MAX = 1;
// Valeur de départ, avant tout réglage de l'étudiant.
export const OPACITE_REPOS_DEFAUT = 0.5;

const CLE_STOCKAGE = "dj_opacite_repos_bouton_canal";

export function limiterOpacite(valeur: number): number {
  if (!Number.isFinite(valeur)) return OPACITE_REPOS_DEFAUT;
  return Math.min(OPACITE_REPOS_MAX, Math.max(OPACITE_REPOS_MIN, valeur));
}

export function lireOpaciteRepos(): number {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    if (brut === null) return OPACITE_REPOS_DEFAUT;
    return limiterOpacite(Number(brut));
  } catch {
    return OPACITE_REPOS_DEFAUT;
  }
}

export function ecrireOpaciteRepos(valeur: number): void {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, String(limiterOpacite(valeur)));
  } catch {
    // Stockage indisponible : le réglage vaut pour la session en cours seulement.
  }
}
