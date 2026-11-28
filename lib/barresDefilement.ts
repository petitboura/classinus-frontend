import { EVENEMENT_LOCALE_CLASSINUS, obtenirLocale } from "@/lib/i18n/locale";
import { traduireTexteInterface } from "@/lib/i18n/interface";

/**
 * Barres de défilement de Classinus (27/11/2026, demande Bourama).
 *
 * Les barres natives sont masquées partout (voir app/globals.css) et remplacées
 * par des barres dessinées ici : posées PAR-DESSUS le contenu (aucune place
 * réservée, donc plus de "trou"), collées au bord visible de leur zone, avec
 * une petite flèche à chaque bout, toujours visibles. Même rendu sur ordinateur
 * et sur téléphone.
 *
 * Fonctionnement : un balayage repère les zones qui défilent, puis une boucle
 * d'animation (une seule pour toute l'appli) lit leur position et leur
 * défilement et déplace les barres. Les barres vivent dans une couche fixe
 * séparée, ajoutée à <html> (hors de <body>) pour ne pas déclencher les
 * observateurs de l'appli.
 *
 * Zones volontairement sans barre : classe dj-scrollbar-cachee, attribut
 * data-dj-sans-barre, ou scrollbar-width: none déclaré par le composant.
 */

type Axe = "y" | "x";
type Sens = "haut" | "bas" | "gauche" | "droite";

const COUCHE_ID = "dj-barres-couche";
const SEUIL_DEBORDEMENT = 1;
const POUCE_MIN = 28;
const PAUSE_BALAYAGE_MS = 300;
const BALAYAGE_SECURITE_MS = 2000;
const INTERVALLE_RECOUVREMENT_MS = 250;
const PAS_CLIC_PX = 60;
const DELAI_REPETITION_MS = 350;
const VITESSE_REPETITION_PX_S = 900;

const LIBELLES_FR: Record<Sens, string> = {
  haut: "Défiler vers le haut",
  bas: "Défiler vers le bas",
  gauche: "Défiler vers la gauche",
  droite: "Défiler vers la droite",
};

const SVG_FLECHE =
  '<svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true" focusable="false"><path d="M1.5 6.5 5 3l3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

interface BarreAxe {
  axe: Axe;
  boite: HTMLDivElement;
  debut: HTMLButtonElement;
  fin: HTMLButtonElement;
  piste: HTMLDivElement;
  pouce: HTMLDivElement;
  visible: boolean;
  recouvert: boolean;
  x: number;
  y: number;
  longueur: number;
  pouceLongueur: number;
  pouceDecalage: number;
  debutInactif: boolean;
  finInactif: boolean;
}

interface Suivi {
  el: HTMLElement;
  racine: boolean;
  permisY: boolean;
  permisX: boolean;
  clips: HTMLElement[];
  y: BarreAxe | null;
  x: BarreAxe | null;
  recouvrementVerifie: number;
}

interface Mesure {
  gauche: number;
  haut: number;
  droite: number;
  bas: number;
  scrollTop: number;
  scrollLeft: number;
  debordY: number;
  debordX: number;
  clientH: number;
  clientW: number;
  scrollH: number;
  scrollW: number;
}

let couche: HTMLDivElement | null = null;
const suivis = new Map<HTMLElement, Suivi>();
const barreVersSuivi = new WeakMap<HTMLElement, Suivi>();
let epaisseur = 12;
let locale = "fr";
let boucle = 0;
let observateur: MutationObserver | null = null;
let minuteurBalayage = 0;
let dernierBalayage = 0;
let intervalleSecurite = 0;
let actif = false;

function libelle(sens: Sens): string {
  return traduireTexteInterface(LIBELLES_FR[sens], locale === "en" ? "en" : "fr");
}

function elementDefilant(s: Suivi): HTMLElement {
  return s.racine ? ((document.scrollingElement as HTMLElement) ?? document.documentElement) : s.el;
}

/** Ancêtres qui rognent réellement la zone (tient compte de fixed et absolute). */
function trouverClips(el: HTMLElement): HTMLElement[] {
  const clips: HTMLElement[] = [];
  let courant: HTMLElement = el;
  let position = getComputedStyle(el).position;
  while (courant.parentElement && courant.parentElement !== document.documentElement) {
    if (position === "fixed") break;
    let parent: HTMLElement | null = courant.parentElement;
    if (position === "absolute") {
      while (parent && parent !== document.body && getComputedStyle(parent).position === "static") {
        parent = parent.parentElement;
      }
      if (!parent) break;
    }
    if (parent === document.body || parent === document.documentElement) break;
    const cs = getComputedStyle(parent);
    if (cs.overflowX !== "visible" || cs.overflowY !== "visible") clips.push(parent);
    courant = parent;
    position = cs.position;
  }
  return clips;
}

function creerFleche(sens: Sens): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "dj-barre-fleche";
  b.dataset.sens = sens;
  b.tabIndex = -1;
  b.setAttribute("aria-label", libelle(sens));
  b.innerHTML = SVG_FLECHE;
  return b;
}

function creerBarre(s: Suivi, axe: Axe): BarreAxe {
  const boite = document.createElement("div");
  boite.className = `dj-barre dj-barre-${axe}`;
  const debut = creerFleche(axe === "y" ? "haut" : "gauche");
  const fin = creerFleche(axe === "y" ? "bas" : "droite");
  const piste = document.createElement("div");
  piste.className = "dj-barre-piste";
  piste.setAttribute("aria-hidden", "true");
  const pouce = document.createElement("div");
  pouce.className = "dj-barre-pouce";
  pouce.setAttribute("aria-hidden", "true");
  piste.appendChild(pouce);
  boite.append(debut, piste, fin);
  couche?.appendChild(boite);
  const b: BarreAxe = {
    axe, boite, debut, fin, piste, pouce,
    visible: false, recouvert: false,
    x: NaN, y: NaN, longueur: NaN, pouceLongueur: NaN, pouceDecalage: NaN,
    debutInactif: false, finInactif: false,
  };
  barreVersSuivi.set(boite, s);
  brancherFleche(s, b, debut, -1);
  brancherFleche(s, b, fin, 1);
  brancherPouce(s, b);
  brancherPiste(s, b);
  return b;
}

function defiler(s: Suivi, axe: Axe, delta: number): void {
  const el = elementDefilant(s);
  el.scrollBy({ top: axe === "y" ? delta : 0, left: axe === "x" ? delta : 0, behavior: "instant" as ScrollBehavior });
}

function brancherFleche(s: Suivi, b: BarreAxe, bouton: HTMLButtonElement, signe: 1 | -1): void {
  let attente = 0;
  let raf = 0;
  const arreter = () => {
    window.clearTimeout(attente);
    window.cancelAnimationFrame(raf);
    attente = 0;
    raf = 0;
  };
  bouton.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    bouton.setPointerCapture(e.pointerId);
    defiler(s, b.axe, signe * PAS_CLIC_PX);
    attente = window.setTimeout(() => {
      let precedent = performance.now();
      const pas = (maintenant: number) => {
        const dt = maintenant - precedent;
        precedent = maintenant;
        defiler(s, b.axe, (signe * VITESSE_REPETITION_PX_S * dt) / 1000);
        raf = window.requestAnimationFrame(pas);
      };
      raf = window.requestAnimationFrame(pas);
    }, DELAI_REPETITION_MS);
  });
  for (const nom of ["pointerup", "pointercancel", "lostpointercapture"]) {
    bouton.addEventListener(nom, arreter);
  }
}

function brancherPouce(s: Suivi, b: BarreAxe): void {
  let glisse = false;
  let departPointeur = 0;
  let departScroll = 0;
  b.pouce.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const m = mesurer(s);
    if (!m) return;
    glisse = true;
    b.pouce.setPointerCapture(e.pointerId);
    b.pouce.dataset.actif = "1";
    departPointeur = b.axe === "y" ? e.clientY : e.clientX;
    departScroll = b.axe === "y" ? m.scrollTop : m.scrollLeft;
  });
  b.pouce.addEventListener("pointermove", (e) => {
    if (!glisse) return;
    const m = mesurer(s);
    if (!m) return;
    const piste = b.longueur - 2 * epaisseur;
    const libre = piste - b.pouceLongueur;
    const debord = b.axe === "y" ? m.debordY : m.debordX;
    if (libre <= 0 || debord <= 0) return;
    const delta = (b.axe === "y" ? e.clientY : e.clientX) - departPointeur;
    const el = elementDefilant(s);
    const cible = departScroll + (delta * debord) / libre;
    if (b.axe === "y") el.scrollTop = cible;
    else el.scrollLeft = cible;
  });
  const fin = () => {
    glisse = false;
    delete b.pouce.dataset.actif;
  };
  for (const nom of ["pointerup", "pointercancel", "lostpointercapture"]) {
    b.pouce.addEventListener(nom, fin);
  }
}

function brancherPiste(s: Suivi, b: BarreAxe): void {
  // Un clic sur la piste (souris seulement : au doigt, la piste laisse passer
  // le toucher vers le contenu) fait défiler d'une page vers le point cliqué.
  b.piste.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target !== b.piste) return;
    const m = mesurer(s);
    if (!m) return;
    const rect = b.pouce.getBoundingClientRect();
    const avant = b.axe === "y" ? e.clientY < rect.top : e.clientX < rect.left;
    const page = (b.axe === "y" ? m.clientH : m.clientW) * 0.9;
    defiler(s, b.axe, avant ? -page : page);
  });
}

function mesurer(s: Suivi): Mesure | null {
  if (!s.el.isConnected) return null;
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const vh = doc.clientHeight;
  const el = elementDefilant(s);
  let gauche: number, haut: number, droite: number, bas: number;
  if (s.racine) {
    gauche = 0; haut = 0; droite = vw; bas = vh;
  } else {
    const r = s.el.getBoundingClientRect();
    gauche = Math.max(r.left, 0); haut = Math.max(r.top, 0);
    droite = Math.min(r.right, vw); bas = Math.min(r.bottom, vh);
    for (const clip of s.clips) {
      if (!clip.isConnected) continue;
      const c = clip.getBoundingClientRect();
      gauche = Math.max(gauche, c.left); haut = Math.max(haut, c.top);
      droite = Math.min(droite, c.right); bas = Math.min(bas, c.bottom);
    }
  }
  const clientH = s.racine ? vh : el.clientHeight;
  const clientW = s.racine ? vw : el.clientWidth;
  const scrollH = el.scrollHeight;
  const scrollW = el.scrollWidth;
  return {
    gauche, haut, droite, bas,
    scrollTop: el.scrollTop, scrollLeft: el.scrollLeft,
    debordY: scrollH - clientH, debordX: scrollW - clientW,
    clientH, clientW, scrollH, scrollW,
  };
}

function testerRecouvrement(s: Suivi, b: BarreAxe, m: Mesure): boolean {
  if (s.racine) return false;
  const longueurVisible = b.axe === "y" ? m.bas - m.haut : m.droite - m.gauche;
  const points = [0.25, 0.5, 0.75].map((f) =>
    b.axe === "y"
      ? [m.droite - epaisseur / 2, m.haut + longueurVisible * f]
      : [m.gauche + longueurVisible * f, m.bas - epaisseur / 2]
  );
  for (const [px, py] of points) {
    const pile = document.elementsFromPoint(px, py);
    const premier = pile.find((n) => !couche?.contains(n));
    if (premier && s.el.contains(premier)) return false;
  }
  return true;
}

function ecrireBarre(s: Suivi, b: BarreAxe, m: Mesure, afficher: boolean, autreAxe: boolean): void {
  const e = epaisseur;
  const longueurTotale = b.axe === "y" ? m.bas - m.haut - (autreAxe ? e : 0) : m.droite - m.gauche - (autreAxe ? e : 0);
  const x = b.axe === "y" ? m.droite - e : m.gauche;
  const y = b.axe === "y" ? m.haut : m.bas - e;
  const assezGrand = m.droite - m.gauche >= 2 * e && m.bas - m.haut >= 2 * e;
  const visible = afficher && assezGrand && longueurTotale >= 3 * e;
  if (visible !== b.visible) {
    b.visible = visible;
    b.boite.dataset.visible = visible ? "1" : "0";
  }
  if (!visible) return;
  if (x !== b.x || y !== b.y) {
    b.x = x; b.y = y;
    b.boite.style.transform = `translate3d(${x}px,${y}px,0)`;
  }
  if (longueurTotale !== b.longueur) {
    b.longueur = longueurTotale;
    if (b.axe === "y") b.boite.style.height = `${longueurTotale}px`;
    else b.boite.style.width = `${longueurTotale}px`;
  }
  const debord = b.axe === "y" ? m.debordY : m.debordX;
  const client = b.axe === "y" ? m.clientH : m.clientW;
  const defile = b.axe === "y" ? m.scrollTop : m.scrollLeft;
  const piste = longueurTotale - 2 * e;
  const total = client + debord;
  const pouceLongueur = Math.max(POUCE_MIN, Math.min(piste, (piste * client) / total));
  const libre = piste - pouceLongueur;
  const decalage = debord > 0 ? Math.min(libre, Math.max(0, (libre * defile) / debord)) : 0;
  if (pouceLongueur !== b.pouceLongueur) {
    b.pouceLongueur = pouceLongueur;
    if (b.axe === "y") b.pouce.style.height = `${pouceLongueur}px`;
    else b.pouce.style.width = `${pouceLongueur}px`;
  }
  if (decalage !== b.pouceDecalage) {
    b.pouceDecalage = decalage;
    b.pouce.style.transform = b.axe === "y" ? `translate3d(0,${decalage}px,0)` : `translate3d(${decalage}px,0,0)`;
  }
  const debutInactif = defile <= 1;
  const finInactif = defile >= debord - 1;
  if (debutInactif !== b.debutInactif) {
    b.debutInactif = debutInactif;
    b.debut.setAttribute("aria-disabled", debutInactif ? "true" : "false");
  }
  if (finInactif !== b.finInactif) {
    b.finInactif = finInactif;
    b.fin.setAttribute("aria-disabled", finInactif ? "true" : "false");
  }
}

function image(): void {
  boucle = 0;
  if (!actif || document.hidden) return;
  const maintenant = performance.now();
  const lectures: Array<[Suivi, Mesure]> = [];
  for (const [el, s] of suivis) {
    if (!el.isConnected) {
      s.y?.boite.remove();
      s.x?.boite.remove();
      suivis.delete(el);
      continue;
    }
    const m = mesurer(s);
    if (!m) continue;
    // Le test de recouvrement (modale par-dessus, etc.) coûte plus cher :
    // il n'est refait que toutes les 250 ms.
    const verifier = maintenant - s.recouvrementVerifie > INTERVALLE_RECOUVREMENT_MS;
    const veutY = s.permisY && m.debordY > SEUIL_DEBORDEMENT;
    const veutX = s.permisX && m.debordX > SEUIL_DEBORDEMENT;
    if (veutY && !s.y) s.y = creerBarre(s, "y");
    if (veutX && !s.x) s.x = creerBarre(s, "x");
    if (verifier) {
      s.recouvrementVerifie = maintenant;
      if (s.y && veutY) s.y.recouvert = testerRecouvrement(s, s.y, m);
      if (s.x && veutX) s.x.recouvert = testerRecouvrement(s, s.x, m);
    }
    lectures.push([s, m]);
  }
  for (const [s, m] of lectures) {
    const veutY = s.permisY && m.debordY > SEUIL_DEBORDEMENT;
    const veutX = s.permisX && m.debordX > SEUIL_DEBORDEMENT;
    if (s.y) ecrireBarre(s, s.y, m, veutY && !s.y.recouvert, veutX);
    if (s.x) ecrireBarre(s, s.x, m, veutX && !s.x.recouvert, veutY);
  }
  if (suivis.size > 0) boucle = window.requestAnimationFrame(image);
}

function demarrerBoucle(): void {
  if (!boucle && actif && suivis.size > 0) boucle = window.requestAnimationFrame(image);
}

function exclu(el: HTMLElement, cs: CSSStyleDeclaration): boolean {
  return (
    el.classList.contains("dj-scrollbar-cachee") ||
    el.classList.contains("dj-table-piste") ||
    el.hasAttribute("data-dj-sans-barre") ||
    cs.scrollbarWidth === "none" ||
    el.tagName === "IFRAME"
  );
}

const defilable = (v: string) => v === "auto" || v === "scroll" || v === "overlay";

function balayer(): void {
  dernierBalayage = performance.now();
  epaisseur = window.matchMedia("(pointer: coarse)").matches ? 16 : 12;
  document.documentElement.style.setProperty("--dj-barre-e", `${epaisseur}px`);

  // Zone de défilement de la page elle-même.
  const racineEl = (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  const csHtml = getComputedStyle(document.documentElement);
  const csBody = getComputedStyle(document.body);
  const csVue = csHtml.overflowY !== "visible" ? csHtml : csBody;
  const csVueX = csHtml.overflowX !== "visible" ? csHtml : csBody;
  const permisRacineY = csVue.overflowY !== "hidden" && csVue.overflowY !== "clip";
  const permisRacineX = csVueX.overflowX !== "hidden" && csVueX.overflowX !== "clip";
  let racine = suivis.get(racineEl);
  if (!racine) {
    racine = { el: racineEl, racine: true, permisY: permisRacineY, permisX: permisRacineX, clips: [], y: null, x: null, recouvrementVerifie: 0 };
    suivis.set(racineEl, racine);
    document.documentElement.setAttribute("data-dj-barre", "1");
  } else {
    racine.permisY = permisRacineY;
    racine.permisX = permisRacineX;
  }

  // Zones internes.
  const tous = [document.body, ...Array.from(document.body.querySelectorAll<HTMLElement>("*"))];
  for (const el of tous) {
    const dejaSuivi = suivis.get(el);
    if (dejaSuivi) {
      const cs = getComputedStyle(el);
      dejaSuivi.permisY = defilable(cs.overflowY);
      dejaSuivi.permisX = defilable(cs.overflowX);
      continue;
    }
    const debY = el.scrollHeight - el.clientHeight > SEUIL_DEBORDEMENT;
    const debX = el.scrollWidth - el.clientWidth > SEUIL_DEBORDEMENT;
    if (!debY && !debX) continue;
    const cs = getComputedStyle(el);
    const permisY = defilable(cs.overflowY);
    const permisX = defilable(cs.overflowX);
    if (!(permisY && debY) && !(permisX && debX)) continue;
    if (exclu(el, cs)) continue;
    suivis.set(el, { el, racine: false, permisY, permisX, clips: trouverClips(el), y: null, x: null, recouvrementVerifie: 0 });
    el.setAttribute("data-dj-barre", "1");
  }
  demarrerBoucle();
}

function planifierBalayage(): void {
  if (minuteurBalayage) return;
  const attente = Math.max(0, PAUSE_BALAYAGE_MS - (performance.now() - dernierBalayage));
  minuteurBalayage = window.setTimeout(() => {
    minuteurBalayage = 0;
    balayer();
  }, Math.max(attente, 50));
}

function majLibelles(): void {
  locale = obtenirLocale();
  for (const s of suivis.values()) {
    for (const b of [s.y, s.x]) {
      if (!b) continue;
      b.debut.setAttribute("aria-label", libelle(b.axe === "y" ? "haut" : "gauche"));
      b.fin.setAttribute("aria-label", libelle(b.axe === "y" ? "bas" : "droite"));
    }
  }
}

function surRoue(e: WheelEvent): void {
  const cible = e.target as HTMLElement | null;
  const boite = cible?.closest<HTMLElement>(".dj-barre");
  const s = boite ? barreVersSuivi.get(boite) : undefined;
  if (!s) return;
  e.preventDefault();
  const facteur = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
  elementDefilant(s).scrollBy({ left: e.deltaX * facteur, top: e.deltaY * facteur, behavior: "instant" as ScrollBehavior });
}

function surVisibilite(): void {
  if (!document.hidden) demarrerBoucle();
}

/** Active les barres de défilement maison. Renvoie la fonction qui les retire. */
export function activerBarresDefilement(): () => void {
  if (typeof document === "undefined" || actif) return () => {};
  actif = true;
  locale = obtenirLocale();
  couche = document.createElement("div");
  couche.id = COUCHE_ID;
  couche.addEventListener("wheel", surRoue, { passive: false });
  document.documentElement.appendChild(couche);

  observateur = new MutationObserver(planifierBalayage);
  observateur.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "style", "hidden"],
  });
  window.addEventListener("resize", planifierBalayage);
  window.addEventListener("load", planifierBalayage, true);
  window.addEventListener(EVENEMENT_LOCALE_CLASSINUS, majLibelles);
  document.addEventListener("visibilitychange", surVisibilite);
  intervalleSecurite = window.setInterval(() => {
    if (!document.hidden) planifierBalayage();
  }, BALAYAGE_SECURITE_MS);
  balayer();

  return () => {
    actif = false;
    observateur?.disconnect();
    observateur = null;
    window.removeEventListener("resize", planifierBalayage);
    window.removeEventListener("load", planifierBalayage, true);
    window.removeEventListener(EVENEMENT_LOCALE_CLASSINUS, majLibelles);
    document.removeEventListener("visibilitychange", surVisibilite);
    window.clearInterval(intervalleSecurite);
    window.clearTimeout(minuteurBalayage);
    minuteurBalayage = 0;
    window.cancelAnimationFrame(boucle);
    boucle = 0;
    for (const el of suivis.keys()) el.removeAttribute("data-dj-barre");
    document.documentElement.removeAttribute("data-dj-barre");
    suivis.clear();
    couche?.remove();
    couche = null;
  };
}
