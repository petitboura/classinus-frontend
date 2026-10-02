import { telechargerImageElement } from "@/lib/telechargerImageElement";

// Export PNG des graphiques (```chart) et des figures (```geometrie).
//
// Correctif du 29/09/2026 : l'ancienne méthode copiait le <svg> seul et le
// transformait en image. Or les couleurs de ces graphiques sont des variables
// du thème (var(--dj-...)), qui n'existent plus une fois le svg sorti de la
// page : tout sortait noir sur fond sombre (traits, barres, textes). On passe
// désormais par la capture commune (voir telechargerImageElement.ts), qui
// résout les couleurs réelles et prend aussi la légende du graphique, qui est
// du HTML et non du svg.
//
// Le paramètre "legende" n'est plus utilisé (la légende est capturée telle
// qu'affichée) ; il reste dans la signature pour ne pas toucher aux appelants.
export function telechargerImage(
  conteneur: HTMLDivElement | null,
  nomFichier: string,
  onSucces: () => void,
  _legende?: { libelle: string; couleur: string }[]
) {
  void telechargerImageElement(conteneur, nomFichier).then((reussi) => {
    if (reussi) onSucces();
  });
}
