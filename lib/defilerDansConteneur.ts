// Amène un élément au milieu de la zone qui défile autour de lui, et rien
// d'autre. Remplace scrollIntoView pour les renvois de notes de bas de page :
// scrollIntoView fait aussi défiler les parents "overflow: hidden" (la page
// entière de l'appli), ce qui décalait toute la mise en page, la barre de
// saisie comprise, et faisait apparaître une seconde barre de défilement.
//
// Seuls les conteneurs réellement défilables (overflow auto ou scroll, avec du
// contenu en trop) sont touchés. Le corps de la page n'est jamais défilé.

function conteneurDefilant(element: Element): HTMLElement | null {
  let parent = element.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const { overflowY } = getComputedStyle(parent);
    if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
}

export function defilerDansConteneur(cible: Element): void {
  const conteneur = conteneurDefilant(cible);
  if (!conteneur) return;
  const boiteCible = cible.getBoundingClientRect();
  const boiteConteneur = conteneur.getBoundingClientRect();
  const haut =
    conteneur.scrollTop + (boiteCible.top - boiteConteneur.top) - (conteneur.clientHeight - boiteCible.height) / 2;
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  conteneur.scrollTo({ top: Math.max(0, haut), behavior: reduit ? "auto" : "smooth" });
}
