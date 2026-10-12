"use client";

// Chantier agent applicatif (voir plan-agent-applicatif-clovis.md et
// plan-scan-generique-agent-applicatif.md), remplacement des chantiers
// A/D (déclaration manuelle via lib/actionsApplicatives.ts) par un scan
// générique et automatique du DOM. Décision (17/09/2026) : câbler
// chaque élément à la main ne passe pas à l'échelle vu la fréquence des
// changements d'interface -- ce fichier détecte automatiquement ce qui
// est cliquable à l'écran, sans jamais qu'une description soit écrite
// à la main quelque part dans un composant.
//
// Étape 1 du plan : ce fichier est isolé, rien ne l'appelle encore.
// L'intégration dans lib/canalAgentApplicatif.ts fait l'objet d'une
// étape séparée du plan.

import { estVisibleEtActif, type CacheAffichage } from "./clicGenerique";
import {
  cibleDeLAgrandissement,
  estUnBoutonAgrandir,
  etatsDeLElement,
  nomDeSecours,
  zoneDeLElement,
  type CacheZones,
} from "./structureEcran";

export type ElementInteractifDetecte = {
  id: string;
  description: string;
  // Champ `sensible` retiré (19/09/2026, décision Bourama) : plus de
  // confirmation nulle part dans ce chantier, la notion de sensibilité
  // n'a donc plus d'effet -- voir lib/canalAgentApplicatif.ts.
  continuerEnArrierePlan: false;
};

// Liste des sélecteurs CSS considérés comme "potentiellement
// actionnables" par le scan. Volontairement centralisée ici pour
// rester facile à ajuster sans toucher au reste de la logique.
export const SELECTEURS_ELEMENTS_INTERACTIFS = [
  "button",
  "a[href]",
  "summary",
  'input:not([type="hidden"])',
  "textarea",
  "select",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="link"]',
  '[role="combobox"]',
  '[role="slider"]',
  '[role="treeitem"]',
].join(", ");

// Prefixe des proprietes que React pose sur chaque noeud du DOM qu'il rend :
// c'est la seule facon de savoir qu'un simple div ou span reagit au clic quand
// aucun composant n'a pense a lui donner un role.
const PREFIXE_PROPRIETES_REACT = "__reactProps$";
const GESTIONNAIRES_DE_CLIC = ["onClick", "onMouseDown", "onPointerDown"];
const INDICES_CURSEUR_MAIN = '[class*="cursor-pointer"], [onclick], [style*="cursor: pointer"], [style*="cursor:pointer"]';

/**
 * Vrai pour un element qui reagit au clic sans etre un bouton, un lien ou un
 * champ : div ou span avec onClick, curseur main, attribut onclick. Les
 * composants n'ont rien a declarer : c'est ce qui garantit qu'un element
 * cliquable ajoute demain, ou dont l'auteur a oublie le role, est quand meme vu.
 */
function reagitAuClicSansRole(element: HTMLElement): boolean {
  if (element.matches(SELECTEURS_ELEMENTS_INTERACTIFS)) return false;
  let reagit = element.matches(INDICES_CURSEUR_MAIN);
  if (!reagit) {
    for (const cle of Object.keys(element)) {
      if (!cle.startsWith(PREFIXE_PROPRIETES_REACT)) continue;
      const proprietes = (element as unknown as Record<string, Record<string, unknown> | undefined>)[cle];
      if (proprietes && GESTIONNAIRES_DE_CLIC.some((nom) => typeof proprietes[nom] === "function")) reagit = true;
      break;
    }
  }
  if (!reagit) return false;
  // Un element deja couvert par un vrai bouton ou lien, ou qui en contient un,
  // n'est pas liste une seconde fois : l'element interieur est deja dans la liste.
  if (element.closest(SELECTEURS_ELEMENTS_INTERACTIFS)) return false;
  if (element.querySelector(SELECTEURS_ELEMENTS_INTERACTIFS)) return false;
  return true;
}

const NOM_ATTRIBUT = "data-agent-id";
const PREFIXE_ID = "el";

// Mémorise l'id déjà attribué à chaque élément d'un scan à l'autre --
// voir le commentaire de scannerElementsInteractifs plus bas. WeakMap
// pour ne jamais retenir un élément détaché du DOM (garbage collecté
// normalement une fois le noeud vraiment retiré).
const idsConnus = new WeakMap<HTMLElement, string>();
// Jamais réinitialisé (contrairement à l'ancien compteur local par
// scan) : un nouvel élément reçoit toujours un id jamais utilisé
// avant, pour qu'aucune collision ne soit possible avec un ancien id
// encore détenu (côté backend, LLM) par un élément différent.
let prochainIndex = 0;

// Longueur maximale d'une description dérivée du texte visible d'un
// élément, pour éviter d'envoyer un pavé de texte au modèle si un
// bouton contient accidentellement un long paragraphe.
const LONGUEUR_MAX_DESCRIPTION = 120;

function nettoyerTexte(texte: string | null | undefined): string {
  if (!texte) return "";
  return texte.replace(/\s+/g, " ").trim();
}

function tronquer(texte: string): string {
  if (texte.length <= LONGUEUR_MAX_DESCRIPTION) return texte;
  return `${texte.slice(0, LONGUEUR_MAX_DESCRIPTION - 1).trimEnd()}…`;
}

/** Vrai pour tout élément sur lequel on peut agir, qu'il ait un rôle ou non. */
export function estElementInteractif(element: HTMLElement): boolean {
  return element.matches(SELECTEURS_ELEMENTS_INTERACTIFS) || reagitAuClicSansRole(element);
}

/**
 * Description automatique d'un élément, jamais écrite à la main.
 * Ordre de priorité : texte visible, puis aria-label, puis title, puis
 * placeholder (utile pour les champs de saisie), puis nomDeSecours
 * (libellés référencés, icône, position) : jamais une chaîne vide ni un
 * texte générique qui ne désigne aucun bouton précis.
 */
export function decrireElement(element: HTMLElement): string {
  const texteVisible = nettoyerTexte(element.textContent);
  if (texteVisible.length > 1) return tronquer(texteVisible);

  const ariaLabel = nettoyerTexte(element.getAttribute("aria-label"));
  if (ariaLabel) return tronquer(ariaLabel);

  const title = nettoyerTexte(element.getAttribute("title"));
  if (title) return tronquer(title);

  // Un seul caractère (x, ×, …) ne vaut qu'à défaut de tout libellé : il ne
  // désigne aucun bouton quand un aria-label ou un titre existe.
  if (texteVisible) return texteVisible;

  const placeholder = nettoyerTexte(element.getAttribute("placeholder"));
  if (placeholder) return tronquer(placeholder);

  return tronquer(nomDeSecours(element));
}

// Longueur maximale d'une ligne de la liste vue par Clovis, alignée sur
// la coupe faite côté backend (core/construction_system_prompt.py).
const LONGUEUR_MAX_POUR_IA = 220;
// Un nom plus court que ça serait inutilisable : le préfixe et les notes
// cèdent la place avant lui.
const LONGUEUR_MIN_NOM = 30;

/**
 * Description destinée à Clovis dans la liste des éléments à l'écran
 * (jamais affichée à l'étudiant, elle ne remplace donc pas
 * decrireElement pour la bulle et le journal). Chaque ligne dit : où se trouve
 * l'élément (fenêtre, panneau, menu, zone), comment il s'appelle, dans quel
 * état il est (désactivé, ouvert, fermé, coché...) et, pour un bouton agrandir
 * ou plein écran, ce qu'il agrandit. Ajoutée le 20/09/2026 (Bourama : "il
 * décide d'ouvrir des sections là où il est déjà"), étendue en octobre 2026.
 */
export function decrirePourIA(element: HTMLElement, cacheZones?: CacheZones): string {
  const base = decrireElement(element);
  const zone = zoneDeLElement(element, cacheZones);
  const courant = element.getAttribute("aria-current");
  const estPageActuelle = Boolean(courant) && courant !== "false";

  const notes: string[] = [];
  if (estPageActuelle) notes.push("page actuelle, déjà ouverte");
  notes.push(...etatsDeLElement(element));
  if (estUnBoutonAgrandir(element, base)) notes.push(cibleDeLAgrandissement(element, cacheZones));

  const prefixe = zone ? `${zone.libelle}, ` : "";
  const suffixe = notes.length > 0 ? ` (${notes.join(", ")})` : "";
  // Le backend coupe chaque ligne : on raccourcit le nom du bouton plutôt que
  // de laisser cette coupe effacer la fin de la ligne, où se trouvent l'état
  // et la cible d'un agrandissement.
  const place = Math.max(LONGUEUR_MAX_POUR_IA - prefixe.length - suffixe.length, LONGUEUR_MIN_NOM);
  const nom = base.length > place ? `${base.slice(0, Math.max(place - 1, 10)).trimEnd()}…` : base;
  return `${prefixe}${nom}${suffixe}`;
}

/**
 * Scanne le DOM actuel et renvoie la liste des éléments réellement
 * visibles, actifs et potentiellement cliquables à cet instant précis
 * -- la liste est toujours recalculée au moment de l'appel (même
 * principe que l'ancien obtenirActionsDisponibles), mais l'attribut
 * data-agent-id assigné à chaque élément retenu est désormais STABLE
 * par élément (mémorisé dans idsConnus, un WeakMap<élément, id>) --
 * réutilisé tel quel tant que c'est le même noeud DOM, jamais
 * recalculé depuis sa position dans la liste. Correctif du 19/09/2026
 * (Bourama, bug "tous les boutons du rail répondent élément disparu") :
 * avant, l'id d'un élément dépendait de sa position parmi TOUS les
 * éléments détectés sur la page (compteur reparti de zéro à chaque
 * scan) -- un simple bouton qui apparaissait/disparaissait ailleurs
 * (ex: dans le chat, en streaming) décalait la position, donc l'id, de
 * tous les éléments suivants, y compris ceux du rail jamais vraiment
 * remontés par React. L'id que Clovis recevait devenait alors
 * introuvable au moment du clic, même si le bouton visé n'avait jamais
 * bougé. Un élément réellement remplacé par React (vrai remount, cas
 * distinct déjà géré par la re-résolution juste avant le clic dans
 * lib/canalAgentApplicatif.ts) reçoit lui un nouvel id, normal
 * puisque c'est un nouveau noeud.
 */
export function scannerElementsInteractifs(): ElementInteractifDetecte[] {
  if (typeof document === "undefined") return [];

  const elements = document.body ? document.body.querySelectorAll<HTMLElement>("*") : [];
  const resultat: ElementInteractifDetecte[] = [];
  // Un seul cache par scan : les éléments partagent les mêmes parents.
  const cache: CacheAffichage = new Map();
  const cacheZones: CacheZones = new Map();

  for (const element of elements) {
    if (element.closest("[data-agent-superposition]")) continue;
    if (!estElementInteractif(element)) continue;
    // Un bouton grisé mais bien affiché reste dans la liste, marqué désactivé :
    // l'IA doit savoir qu'il existe et qu'il ne répondra pas.
    if (!estVisibleEtActif(element, cache, { accepterDesactive: true })) continue;

    let id = idsConnus.get(element);
    if (!id) {
      id = `${PREFIXE_ID}-${prochainIndex}`;
      prochainIndex += 1;
      idsConnus.set(element, id);
    }
    element.setAttribute(NOM_ATTRIBUT, id);

    resultat.push({
      id,
      description: decrirePourIA(element, cacheZones),
      continuerEnArrierePlan: false,
    });
  }

  return resultat;
}
