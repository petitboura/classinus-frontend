"use client";

import { RefObject, useLayoutEffect } from "react";

// Largeur d'un tableau du chat, en trois temps.
// 1. Jusqu'à 7 colonnes, le tableau reste dans la colonne du texte.
// 2. Au delà de 7 colonnes, s'il a besoin de plus de place, il s'élargit des
//    deux côtés, vers les bords de la zone visible, sans jamais les toucher.
// 3. Si même avec toute cette place les mots (gardés entiers) ne tiennent pas,
//    comme sur téléphone ou avec beaucoup de colonnes, le tableau défile de
//    gauche à droite, sans barre, avec un fondu sur les bords. Lui seul défile,
//    jamais la page. Les règles visuelles sont dans app/globals.css
//    (.dj-table-piste). La mesure se fait avant l'affichage, sans clignotement.
const COLONNES_AVANT_ELARGISSEMENT = 7;
const MARGE_BORD = 12;
const LARGEUR_FONDU = 24;

// Premier ancêtre qui coupe ou fait défiler son contenu : c'est lui qui limite
// ce qu'on voit réellement.
function zoneVisible(depart: HTMLElement): HTMLElement | null {
  let noeud = depart.parentElement;
  while (noeud && noeud !== document.body) {
    const style = getComputedStyle(noeud);
    if (/(auto|scroll|hidden|clip)/.test(style.overflowX) || /(auto|scroll)/.test(style.overflowY)) return noeud;
    noeud = noeud.parentElement;
  }
  return null;
}

export function useTableLargeur(
  table: RefObject<HTMLTableElement | null>,
  boite: RefObject<HTMLElement | null>,
  piste: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const t = table.current;
    const b = boite.current;
    const p = piste.current;
    if (!t || !b || !p) return;
    const zone = zoneVisible(b);
    let enCours = false;

    function majFondu() {
      if (!p) return;
      if (p.dataset.defile !== "1") {
        p.style.removeProperty("--fondu-g");
        p.style.removeProperty("--fondu-d");
        return;
      }
      const gauche = Math.min(LARGEUR_FONDU, p.scrollLeft);
      const droite = Math.min(LARGEUR_FONDU, Math.max(0, p.scrollWidth - p.clientWidth - p.scrollLeft));
      p.style.setProperty("--fondu-g", `${gauche}px`);
      p.style.setProperty("--fondu-d", `${droite}px`);
    }

    function mesurer() {
      if (enCours || !t || !b || !p) return;
      enCours = true;

      p.style.marginLeft = "";
      p.style.marginRight = "";
      t.style.width = "max-content";
      const largeurMax = t.offsetWidth;
      t.style.width = "min-content";
      const largeurMin = t.offsetWidth;
      t.style.width = "";

      const largeurColonne = b.clientWidth;
      const nbColonnes = t.rows[0]?.cells.length ?? 0;
      const peutElargir = nbColonnes > COLONNES_AVANT_ELARGISSEMENT;

      let extraMax = 0;
      if (peutElargir) {
        const rect = b.getBoundingClientRect();
        const zoneGauche = zone ? zone.getBoundingClientRect().left + zone.clientLeft : 0;
        const zoneDroite = zone ? zone.getBoundingClientRect().left + zone.clientLeft + zone.clientWidth : window.innerWidth;
        const placeGauche = rect.left - zoneGauche - MARGE_BORD;
        const placeDroite = zoneDroite - rect.right - MARGE_BORD;
        extraMax = Math.max(0, Math.floor(Math.min(placeGauche, placeDroite)));
      }

      let extra = peutElargir && largeurMax > largeurColonne ? Math.min(extraMax, Math.ceil((largeurMax - largeurColonne) / 2)) : 0;
      if (largeurMin > largeurColonne + 2 * extra) extra = extraMax;

      const largeurDispo = largeurColonne + 2 * extra;
      const defile = largeurMin > largeurDispo + 1;

      if (extra > 0) {
        p.style.marginLeft = `-${extra}px`;
        p.style.marginRight = `-${extra}px`;
      }
      if (defile) {
        t.style.width = `${Math.max(largeurMin, Math.min(largeurMax, 2 * largeurDispo))}px`;
      } else if (p.scrollLeft !== 0) {
        p.scrollLeft = 0;
      }
      p.dataset.defile = defile ? "1" : "0";
      majFondu();
      enCours = false;
    }

    mesurer();
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(b);
    observateur.observe(t);
    if (zone) observateur.observe(zone);
    p.addEventListener("scroll", majFondu, { passive: true });
    return () => {
      observateur.disconnect();
      p.removeEventListener("scroll", majFondu);
    };
  }, [table, boite, piste]);
}
