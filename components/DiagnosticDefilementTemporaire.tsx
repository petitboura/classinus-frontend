"use client";

import { useEffect, useState } from "react";

// OUTIL TEMPORAIRE du 18/10/2026, demande de Bourama : les barres de
// défilement de la page entière (en bas et à droite) ont une cause encore
// inconnue. Ce cadre noir, posé en bas de l'écran et sans effet sur la
// page, écrit en direct ce qui défile et ce qui dépasse de la fenêtre.
// Bourama envoie une capture de l'écran, ce qui donne la cause sans qu'il
// ait à ouvrir quoi que ce soit. À SUPPRIMER (ce fichier et son appel dans
// AppShell.tsx) dès que la cause est trouvée et corrigée.

function aUnAncetreFixe(el: Element, cache: WeakMap<Element, boolean>): boolean {
  const connu = cache.get(el);
  if (connu !== undefined) return connu;
  const parent = el.parentElement;
  const resultat =
    getComputedStyle(el).position === "fixed" || (parent !== null && aUnAncetreFixe(parent, cache));
  cache.set(el, resultat);
  return resultat;
}

function nomCourt(el: Element): string {
  const classe = (el.getAttribute("class") ?? "").replace(/\s+/g, " ").slice(0, 70);
  return `${el.tagName.toLowerCase()}${classe ? "." + classe : ""}`;
}

function mesurer(): string {
  const html = document.documentElement;
  const corps = document.body;
  const zone = document.querySelector<HTMLElement>('[data-agent-zone="Page"]');
  const lignes: string[] = [];
  lignes.push(`fenetre ${window.innerWidth} x ${window.innerHeight}, zoom ${window.devicePixelRatio}`);
  lignes.push(
    `PAGE (html) largeur ${html.scrollWidth}/${html.clientWidth} hauteur ${html.scrollHeight}/${html.clientHeight}, decalee de ${Math.round(window.scrollX)},${Math.round(window.scrollY)}, overflow ${getComputedStyle(html).overflow}`
  );
  lignes.push(
    `CORPS (body) largeur ${corps.scrollWidth}/${corps.clientWidth} hauteur ${corps.scrollHeight}/${corps.clientHeight}, overflow ${getComputedStyle(corps).overflow}`
  );
  if (zone) {
    lignes.push(
      `ZONE CENTRALE (main) largeur ${zone.scrollWidth}/${zone.clientWidth} hauteur ${zone.scrollHeight}/${zone.clientHeight}, decalee de ${Math.round(zone.scrollLeft)},${Math.round(zone.scrollTop)}`
    );
  } else {
    lignes.push("ZONE CENTRALE (main) introuvable");
  }

  // Éléments qui sortent de la fenêtre (hors éléments collés à l'écran,
  // qui ne peuvent pas agrandir la page).
  const cache = new WeakMap<Element, boolean>();
  const largeur = html.clientWidth;
  const hauteur = html.clientHeight;
  const dehors: { texte: string; exces: number }[] = [];
  corps.querySelectorAll("*").forEach((el) => {
    if (el.closest("[data-diagnostic-defilement]")) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const excesDroite = r.right - largeur;
    const excesBas = r.bottom - hauteur;
    if (excesDroite <= 1 && excesBas <= 1 && r.left >= -1) return;
    if (aUnAncetreFixe(el, cache)) return;
    const style = getComputedStyle(el);
    dehors.push({
      exces: Math.max(excesDroite, excesBas, -r.left),
      texte: `${nomCourt(el)} | droite ${Math.round(r.right)} bas ${Math.round(r.bottom)} gauche ${Math.round(r.left)} | ${style.position}`,
    });
  });
  dehors.sort((a, b) => b.exces - a.exces);
  lignes.push(`DEHORS : ${dehors.length} element(s)`);
  dehors.slice(0, 8).forEach((d) => lignes.push(`- ${d.texte}`));
  return lignes.join("\n");
}

export function DiagnosticDefilementTemporaire() {
  const [texte, setTexte] = useState("mesure en cours...");

  useEffect(() => {
    const lancer = () => setTexte(mesurer());
    lancer();
    const minuteur = window.setInterval(lancer, 2000);
    window.addEventListener("resize", lancer);
    return () => {
      window.clearInterval(minuteur);
      window.removeEventListener("resize", lancer);
    };
  }, []);

  return (
    <pre
      data-diagnostic-defilement
      className="pointer-events-none fixed bottom-2 left-16 z-[99999] max-h-[55vh] max-w-[min(46rem,calc(100vw-5rem))] overflow-hidden whitespace-pre-wrap break-all rounded bg-black/90 p-2 font-mono text-[10px] leading-tight text-lime-300"
    >
      {texte}
    </pre>
  );
}
