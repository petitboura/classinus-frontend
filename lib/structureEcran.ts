"use client";

// Base de la vision de l'écran par l'IA (canal en direct). Règle posée par
// Bourama : rien de visible ne doit échapper à l'IA, que les composants aient
// ou non pensé à se déclarer. Rien ici ne dépend donc d'un balisage écrit à la
// main : tout est déduit de la structure réelle de la page (rôles, libellés
// d'accessibilité, icônes, positions, curseur, fenêtres flottantes).
//
// Ce fichier ne décide jamais quels éléments sont listés (voir
// scanElementsInteractifs.ts) : il dit comment les nommer, dans quelle
// fenêtre ou quel panneau ils se trouvent, dans quel état ils sont, et ce
// qu'un bouton agrandir ou plein écran agrandit.

import { ATTRIBUT_SUPERPOSITION } from "./clicGenerique";

const ATTRIBUT_ZONE = "data-agent-zone";
const LONGUEUR_MAX_NOM_ZONE = 60;
const MARGE_BORD_PX = 2;

function nettoyer(texte: string | null | undefined): string {
  if (!texte) return "";
  return texte.replace(/\s+/g, " ").trim();
}

function couper(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  return `${texte.slice(0, Math.max(max - 1, 1)).trimEnd()}…`;
}

// Noms

const ICONE_LUCIDE = /(?:^|\s)lucide-([a-z0-9-]+)(?:\s|$)/;

/** Nom d'une icône d'après son titre, son libellé ou sa classe (lucide), sinon vide. */
export function nomIcone(element: Element): string {
  const svgs = element.matches("svg") ? [element] : Array.from(element.querySelectorAll("svg"));
  for (const svg of svgs) {
    const titre = nettoyer(svg.querySelector("title")?.textContent);
    if (titre) return titre;
    const libelle = nettoyer(svg.getAttribute("aria-label"));
    if (libelle) return libelle;
    const donnee = nettoyer(svg.getAttribute("data-icon"));
    if (donnee) return donnee.replace(/-/g, " ");
    const trouve = ICONE_LUCIDE.exec(svg.getAttribute("class") ?? "");
    if (trouve) {
      const brut = trouve[1].replace(/-icon$/, "").replace(/-\d+$/, "").replace(/-/g, " ").trim();
      if (brut && brut !== "icon") return brut;
    }
  }
  return "";
}

function texteDesReferences(element: HTMLElement, attribut: string): string {
  const ids = (element.getAttribute(attribut) ?? "").split(/\s+/).filter(Boolean);
  const textes = ids.map((id) => nettoyer(document.getElementById(id)?.textContent)).filter(Boolean);
  return textes.join(" ");
}

function typeEnFrancais(element: HTMLElement): string {
  const role = element.getAttribute("role");
  if (role === "tab") return "onglet";
  if (role === "menuitem" || role === "menuitemcheckbox" || role === "menuitemradio") return "choix de menu";
  if (role === "checkbox" || role === "switch" || role === "radio") return "case";
  if (role === "option") return "option";
  if (role === "link") return "lien";
  const balise = element.tagName.toLowerCase();
  if (balise === "a") return "lien";
  if (balise === "button" || role === "button") return "bouton";
  if (balise === "textarea") return "zone de texte";
  if (balise === "select") return "liste déroulante";
  if (balise === "input") return "champ";
  return "élément cliquable";
}

function positionEnFrancais(element: HTMLElement): string {
  const rect = element.getBoundingClientRect();
  const x = (rect.left + rect.width / 2) / Math.max(window.innerWidth, 1);
  const y = (rect.top + rect.height / 2) / Math.max(window.innerHeight, 1);
  const vertical = y < 0.34 ? "en haut" : y > 0.66 ? "en bas" : "au milieu";
  const horizontal = x < 0.34 ? "à gauche" : x > 0.66 ? "à droite" : "au centre";
  return `${vertical} ${horizontal}`;
}

/**
 * Nom d'un élément quand son texte, son aria-label, son titre et son
 * placeholder sont tous vides : libellés référencés, étiquette de champ,
 * valeur d'un bouton, texte alternatif d'une image, nom d'icône... Ne renvoie
 * JAMAIS une chaîne vide : à défaut de nom, le type, l'icône éventuelle et la
 * position à l'écran, pour que l'IA désigne toujours un bouton précis.
 */
export function nomDeSecours(element: HTMLElement): string {
  const reference = texteDesReferences(element, "aria-labelledby");
  if (reference) return reference;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    const etiquette = nettoyer(element.labels?.[0]?.textContent);
    if (etiquette) return etiquette;
  }
  if (element instanceof HTMLInputElement && ["button", "submit", "reset"].includes(element.type)) {
    const valeur = nettoyer(element.value);
    if (valeur) return valeur;
  }

  const alt = nettoyer(element.querySelector("img[alt]")?.getAttribute("alt"));
  if (alt) return alt;
  const nomAttribut = nettoyer(element.getAttribute("name"));
  if (nomAttribut) return nomAttribut;
  const identifiantTest = nettoyer(element.getAttribute("data-testid"));
  if (identifiantTest) return identifiantTest.replace(/[-_]/g, " ");

  const type = typeEnFrancais(element);
  const icone = nomIcone(element);
  const position = positionEnFrancais(element);
  return icone
    ? `${type} sans texte, icône « ${icone} », ${position}`
    : `${type} sans texte ni icône, ${position}`;
}

// Fenêtres et panneaux

export type ZoneEcran = {
  /** Texte placé devant l'élément, par exemple « Fenêtre flottante « Réglages » ». */
  libelle: string;
  /** Nom propre de la zone (titre), vide si elle n'en a pas. */
  nom: string;
  genre: "explicite" | "fenetre" | "menu" | "panneau_fixe" | "fenetre_flottante" | "plein_ecran";
  racine: HTMLElement;
};

/** Mémoire d'un scan : ce que l'on a déjà conclu sur chaque ancêtre. */
export type CacheZones = Map<HTMLElement, ZoneEcran | null>;

const ROLES_FENETRE = new Set(["dialog", "alertdialog"]);
const ROLES_MENU = new Set(["menu", "listbox", "tooltip"]);

function titreDuConteneur(conteneur: HTMLElement): string {
  const reference = texteDesReferences(conteneur, "aria-labelledby");
  if (reference) return couper(reference, LONGUEUR_MAX_NOM_ZONE);
  const libelle = nettoyer(conteneur.getAttribute("aria-label"));
  if (libelle) return couper(libelle, LONGUEUR_MAX_NOM_ZONE);
  const titre = nettoyer(conteneur.getAttribute("title"));
  if (titre) return couper(titre, LONGUEUR_MAX_NOM_ZONE);
  const entete = conteneur.querySelector<HTMLElement>("h1, h2, h3, h4, [role='heading']");
  const texteEntete = nettoyer(entete?.textContent);
  return texteEntete ? couper(texteEntete, LONGUEUR_MAX_NOM_ZONE) : "";
}

function bordsTouches(rect: DOMRect): number {
  let nombre = 0;
  if (rect.left <= MARGE_BORD_PX) nombre += 1;
  if (rect.top <= MARGE_BORD_PX) nombre += 1;
  if (rect.right >= window.innerWidth - MARGE_BORD_PX) nombre += 1;
  if (rect.bottom >= window.innerHeight - MARGE_BORD_PX) nombre += 1;
  return nombre;
}

function composerLibelle(genre: ZoneEcran["genre"], nom: string): string {
  const base =
    genre === "fenetre"
      ? "Fenêtre"
      : genre === "menu"
        ? "Menu ouvert"
        : genre === "panneau_fixe"
          ? "Panneau"
          : genre === "plein_ecran"
            ? "Fenêtre plein écran"
            : "Fenêtre flottante";
  return nom ? `${base} « ${nom} »` : base;
}

function zoneDeCetAncetre(ancetre: HTMLElement): ZoneEcran | null {
  const explicite = nettoyer(ancetre.getAttribute(ATTRIBUT_ZONE));
  if (explicite) return { libelle: explicite, nom: explicite, genre: "explicite", racine: ancetre };

  const role = ancetre.getAttribute("role") ?? "";
  const balise = ancetre.tagName.toLowerCase();
  if (ROLES_FENETRE.has(role) || ancetre.getAttribute("aria-modal") === "true" || balise === "dialog") {
    const nom = titreDuConteneur(ancetre);
    return { libelle: composerLibelle("fenetre", nom), nom, genre: "fenetre", racine: ancetre };
  }
  if (ROLES_MENU.has(role) || ancetre.hasAttribute("popover")) {
    const nom = titreDuConteneur(ancetre);
    return { libelle: composerLibelle("menu", nom), nom, genre: "menu", racine: ancetre };
  }

  const style = window.getComputedStyle(ancetre);
  const zIndex = Number.parseInt(style.zIndex, 10);
  const flottant = style.position === "fixed" || (style.position === "absolute" && Number.isFinite(zIndex) && zIndex > 0);
  if (!flottant) return null;

  const rect = ancetre.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const bords = bordsTouches(rect);
  const nom = titreDuConteneur(ancetre);
  // Quatre bords : soit le conteneur de toute l'application (sans z-index,
  // ce n'est pas une fenêtre), soit un voile ou une fenêtre plein écran posé
  // par dessus (z-index positif).
  if (bords >= 4) {
    if (!Number.isFinite(zIndex) || zIndex <= 0) return null;
    return { libelle: composerLibelle("plein_ecran", nom), nom, genre: "plein_ecran", racine: ancetre };
  }
  if (bords >= 2) return { libelle: composerLibelle("panneau_fixe", nom), nom, genre: "panneau_fixe", racine: ancetre };
  return { libelle: composerLibelle("fenetre_flottante", nom), nom, genre: "fenetre_flottante", racine: ancetre };
}

/**
 * Zone la plus proche de l'élément : la fenêtre, le menu ou le panneau
 * dans lequel il se trouve réellement. Une zone déclarée à la main n'est
 * retenue que si aucune fenêtre ou aucun panneau n'est plus proche de
 * l'élément (sinon une zone « Page » qui entoure tout cacherait toutes les
 * fenêtres flottantes qu'elle contient).
 */
export function zoneDeLElement(element: HTMLElement, cache?: CacheZones): ZoneEcran | null {
  let ancetre: HTMLElement | null = element.parentElement;
  while (ancetre && ancetre !== document.body && ancetre !== document.documentElement) {
    if (ancetre.hasAttribute(ATTRIBUT_SUPERPOSITION)) return null;
    let zone = cache?.get(ancetre);
    if (zone === undefined) {
      zone = zoneDeCetAncetre(ancetre);
      cache?.set(ancetre, zone);
    }
    if (zone) return zone;
    ancetre = ancetre.parentElement;
  }
  return null;
}

function estAfficheeAssez(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return false;
  const style = window.getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

/**
 * Toutes les fenêtres, menus et panneaux actuellement affichés, trouvés par
 * leur structure et non par un balisage : sert à dire à l'IA qu'une fenêtre
 * existe même si le reste de la lecture de la page ne l'a pas décrite.
 */
export function listerZonesVisibles(cache: CacheZones): ZoneEcran[] {
  const trouvees: ZoneEcran[] = [];
  if (typeof document === "undefined" || !document.body) return trouvees;
  for (const element of document.body.querySelectorAll<HTMLElement>("*")) {
    if (element.closest(`[${ATTRIBUT_SUPERPOSITION}]`)) continue;
    let zone = cache.get(element);
    if (zone === undefined) {
      zone = zoneDeCetAncetre(element);
      cache.set(element, zone);
    }
    if (zone && zone.genre !== "explicite" && estAfficheeAssez(element)) trouvees.push(zone);
  }
  return trouvees;
}

// États

/** États visibles d'un élément, que l'IA doit connaître avant d'agir. */
export function etatsDeLElement(element: HTMLElement): string[] {
  const etats: string[] = [];
  const desactive = element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true";
  if (desactive) etats.push("désactivé");
  const deplie = element.getAttribute("aria-expanded");
  if (deplie === "true") etats.push("ouvert");
  else if (deplie === "false") etats.push("fermé");
  const popup = element.getAttribute("aria-haspopup");
  if (popup && popup !== "false") etats.push("ouvre un menu ou une fenêtre");
  const coche = element.getAttribute("aria-checked") ?? (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(element.type) ? String(element.checked) : null);
  if (coche === "true") etats.push("coché");
  else if (coche === "false") etats.push("non coché");
  if (element.getAttribute("aria-pressed") === "true") etats.push("activé");
  if (element.getAttribute("aria-selected") === "true") etats.push("sélectionné");
  return etats;
}

// Agrandir / plein écran

const MOTS_AGRANDIR =
  /agrandi|plein\s*[ée]cran|maximi[sz]|enlarge|expand|full\s*-?\s*screen|r[ée]duire|minimi[sz]|restaurer|restore|shrink|scaling/i;

/** Vrai si le nom, le libellé ou l'icône du bouton parle d'agrandir ou de réduire. */
export function estUnBoutonAgrandir(element: HTMLElement, nom: string): boolean {
  if (MOTS_AGRANDIR.test(nom)) return true;
  if (MOTS_AGRANDIR.test(element.getAttribute("aria-label") ?? "")) return true;
  if (MOTS_AGRANDIR.test(element.getAttribute("title") ?? "")) return true;
  return MOTS_AGRANDIR.test(nomIcone(element));
}

/**
 * Ce que le bouton agrandit, dit sans deviner : l'élément qu'il contrôle
 * (aria-controls) quand il le déclare, sinon la zone ou la section nommée qui
 * le contient. Si rien ne permet de le dire, l'IA en est avertie.
 */
export function cibleDeLAgrandissement(element: HTMLElement, cache?: CacheZones): string {
  const controle = element.getAttribute("aria-controls");
  if (controle) {
    const cible = document.getElementById(controle.split(/\s+/)[0]);
    if (cible) {
      const nom = titreDuConteneur(cible);
      return nom ? `agrandit « ${nom} »` : `agrandit l'élément qu'il contrôle (${cible.tagName.toLowerCase()})`;
    }
  }
  const section = element.closest<HTMLElement>("section, article, figure, [role='region'], [role='dialog'], dialog");
  const nomSection = section ? titreDuConteneur(section) : "";
  if (nomSection) return `agrandit « ${nomSection} »`;
  const zone = zoneDeLElement(element, cache);
  if (zone && zone.nom) return `agrandit ${zone.libelle}`;
  if (zone) return `agrandit ${zone.libelle.toLowerCase()}`;
  return "cible non précisée par la page : regarde ce que change le clic";
}
