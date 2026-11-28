// Titre d'accueil du chat révélé lettre par lettre (voir ChatIA.tsx).
// 28/11/2026, demande de Bourama : il ne doit s'animer qu'une seule fois, à
// l'ouverture de la page ou à l'ouverture du chat après l'avoir fermé, et plus
// à chaque changement d'affichage (chat collé, plein écran, nouvelle
// conversation). Le chat est monté à plusieurs endroits (colonne collée, page
// plein écran), donc la mémoire vit ici, hors des composants : elle survit à
// leur démontage. Elle repart de zéro à chaque chargement de la page.

let dejaRevele = false;

/** Vrai si le titre a déjà fini de s'animer depuis l'ouverture de la page ou du chat. */
export function titreAccueilDejaRevele(): boolean {
  return dejaRevele;
}

/** À appeler quand l'animation du titre vient de se terminer. */
export function marquerTitreAccueilRevele() {
  dejaRevele = true;
}

/** À appeler quand le chat se ferme : à sa prochaine ouverture, le titre s'animera de nouveau. */
export function reinitialiserRevelationTitreAccueil() {
  dejaRevele = false;
}
