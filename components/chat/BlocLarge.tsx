"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";

// 20/09/2026, demande Bourama : un bloc large (tableau, bloc de code,
// aperçu de fichier) ne doit plus rester enfermé dans la bulle, ni obliger
// à glisser sur le côté. Il s'élargit des deux côtés de la colonne de
// texte quand son contenu le demande, jusqu'aux bords de la zone du chat
// (avec une petite marge), et le texte des messages autour ne bouge jamais.
//
// Règle pour tout futur bloc large : l'envelopper dans <BlocLarge> (ou
// poser la même logique via ce composant), rien d'autre à prévoir.
//
// Fonctionnement :
//   - la zone de défilement du chat porte l'attribut data-zone-chat et
//     centre la colonne de texte avec un remplissage latéral (voir
//     ChatIA.tsx) : ce remplissage est l'espace libre de chaque côté ;
//   - le bloc prend sa largeur naturelle (width: max-content), jamais
//     moins que sa place normale (min-width: 100%), jamais plus que la zone
//     moins la marge (max-width) ;
//   - s'il dépasse la colonne de texte, il est recentré dessus avec une
//     marge gauche négative. Un bloc qui tient dans la colonne n'est pas
//     déplacé du tout.
// Hors du chat (aucune zone trouvée), le composant ne change rien : le
// bloc garde son comportement normal.
//
// Choix volontaire : une mesure en JavaScript plutôt que des container
// queries CSS. container-type: inline-size applique un confinement de
// mise en page qui recadrerait les éléments en position fixed contenus
// dans les messages (bouton Expliquer, plein écran...).
const MARGE_BORD_PX = 16;

// useLayoutEffect évite un flash (bloc d'abord étroit puis élargi) mais
// avertit lors du rendu serveur : repli sur useEffect là où window n'existe pas.
const useEffetMesure = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function BlocLarge({
  className,
  actif = true,
  children,
}: {
  className?: string;
  actif?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffetMesure(() => {
    const el = ref.current;
    if (!el || !actif) return;
    const zone = el.closest<HTMLElement>("[data-zone-chat]");
    if (!zone) return;

    function appliquer() {
      if (!el || !zone) return;
      const style = window.getComputedStyle(zone);
      const remplissageGauche = parseFloat(style.paddingLeft) || 0;
      const remplissageDroit = parseFloat(style.paddingRight) || 0;
      // clientWidth exclut la barre de défilement verticale de la zone.
      const largeurZone = zone.clientWidth;
      const rectZone = zone.getBoundingClientRect();
      const bordGaucheZone = rectZone.left + zone.clientLeft;
      const largeurColonne = largeurZone - remplissageGauche - remplissageDroit;
      const largeurMax = Math.max(largeurZone - 2 * MARGE_BORD_PX, largeurColonne);

      // Remise à zéro avant mesure : la largeur naturelle ne doit pas
      // dépendre du décalage posé au passage précédent.
      el.style.marginLeft = "0px";
      el.style.width = "max-content";
      el.style.minWidth = "100%";
      el.style.maxWidth = `${largeurMax}px`;

      const largeur = el.offsetWidth;
      if (largeur === 0 || largeur <= largeurColonne + 1) return;

      const gaucheNaturelle = el.getBoundingClientRect().left;
      const gaucheVoulue = bordGaucheZone + remplissageGauche + (largeurColonne - largeur) / 2;
      const gaucheMin = bordGaucheZone + MARGE_BORD_PX;
      const gaucheMax = bordGaucheZone + largeurZone - MARGE_BORD_PX - largeur;
      const gauche = Math.min(Math.max(gaucheVoulue, gaucheMin), Math.max(gaucheMin, gaucheMax));
      el.style.marginLeft = `${gauche - gaucheNaturelle}px`;
    }

    // 23/09/2026, correctif Bourama ("le code tremble tant qu'il n'est
    // pas fini") : pendant le streaming, le contenu du bloc (code, ligne
    // par ligne) change en permanence, donc le ResizeObserver ci-dessous
    // se redéclenchait à chaque changement de taille -- recalcul de
    // largeur ET repositionnement (marge gauche) à chaque fois, d'où le
    // tremblement visuel tant que le bloc grandit. Le tout premier calcul
    // (appelé juste en dessous, hors ResizeObserver) reste immédiat pour
    // éviter le flash documenté plus haut (bloc d'abord étroit puis
    // élargi) ; seuls les recalculs déclenchés par le ResizeObserver
    // ensuite (donc pendant que le contenu continue de bouger) attendent
    // désormais 500ms sans nouveau redimensionnement avant de s'appliquer
    // -- même principe de stabilité que QCMInteractif.tsx/CarteMessage.tsx/
    // WidgetSandbox.tsx. Le bloc grandit toujours normalement en largeur
    // naturelle pendant ce temps (rien ne bloque le flux visuel), seul le
    // repositionnement/recentrage est différé.
    let delaiRecalcul: ReturnType<typeof setTimeout> | null = null;
    function appliquerAvecDelai() {
      if (delaiRecalcul) clearTimeout(delaiRecalcul);
      delaiRecalcul = setTimeout(appliquer, 500);
    }

    appliquer();
    const observateur = new ResizeObserver(appliquerAvecDelai);
    observateur.observe(zone);
    observateur.observe(el);
    return () => {
      if (delaiRecalcul) clearTimeout(delaiRecalcul);
      observateur.disconnect();
      el.style.marginLeft = "";
      el.style.width = "";
      el.style.minWidth = "";
      el.style.maxWidth = "";
    };
  }, [actif]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
