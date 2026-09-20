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
const SELECTEURS_ELEMENTS_INTERACTIFS = [
  "button",
  "a[href]",
  '[role="button"]',
  'input:not([type="hidden"])',
  "textarea",
  "select",
].join(", ");

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

/**
 * Description automatique d'un élément, jamais écrite à la main.
 * Ordre de priorité : texte visible, puis aria-label, puis title, puis
 * placeholder (utile pour les champs de saisie) -- et un texte
 * générique de repli si rien de tout ça n'est disponible, jamais une
 * chaîne vide.
 */
export function decrireElement(element: HTMLElement): string {
  const texteVisible = nettoyerTexte(element.textContent);
  if (texteVisible) return tronquer(texteVisible);

  const ariaLabel = nettoyerTexte(element.getAttribute("aria-label"));
  if (ariaLabel) return tronquer(ariaLabel);

  const title = nettoyerTexte(element.getAttribute("title"));
  if (title) return tronquer(title);

  const placeholder = nettoyerTexte(element.getAttribute("placeholder"));
  if (placeholder) return tronquer(placeholder);

  const balise = element.tagName.toLowerCase();
  return `élément ${balise} sans texte visible`;
}

// Nom de l'attribut posé par les composants sur leur zone principale
// (barre latérale, page, fenêtre flottante...). Le libellé vient donc du
// composant lui même, jamais d'une liste écrite ici.
const ATTRIBUT_ZONE = "data-agent-zone";

// Longueur maximale d'une ligne de la liste vue par Clovis, alignée sur
// la coupe faite côté backend.
const LONGUEUR_MAX_POUR_IA = 100;

/**
 * Description destinée à Clovis dans la liste des éléments à l'écran
 * (jamais affichée à l'étudiant, elle ne remplace donc pas
 * decrireElement pour la bulle et le journal). Ajoutée le 20/09/2026
 * (Bourama : "il décide d'ouvrir des sections là où il est déjà") :
 * jusque là, Clovis ne recevait que le nom du bouton, sans savoir où il
 * se trouve (deux boutons de même nom sont indiscernables) ni si la
 * page qu'il représente est celle qui est déjà ouverte.
 */
export function decrirePourIA(element: HTMLElement): string {
  const base = decrireElement(element);
  const zone = nettoyerTexte(element.closest(`[${ATTRIBUT_ZONE}]`)?.getAttribute(ATTRIBUT_ZONE));
  const courant = element.getAttribute("aria-current");
  const estPageActuelle = Boolean(courant) && courant !== "false";

  const prefixe = zone ? `${zone}, ` : "";
  const suffixe = estPageActuelle ? " (page actuelle, déjà ouverte)" : "";
  // Le backend coupe chaque ligne à 100 caractères quand il construit la
  // liste de Clovis (core/construction_system_prompt.py) : on raccourcit
  // le nom du bouton plutôt que de laisser cette coupe effacer la fin de
  // la ligne, où se trouve l'indication de page actuelle.
  const place = LONGUEUR_MAX_POUR_IA - prefixe.length - suffixe.length;
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

  const elements = document.querySelectorAll<HTMLElement>(SELECTEURS_ELEMENTS_INTERACTIFS);
  const resultat: ElementInteractifDetecte[] = [];
  // Un seul cache par scan : les éléments partagent les mêmes parents.
  const cache: CacheAffichage = new Map();

  for (const element of elements) {
    if (!estVisibleEtActif(element, cache)) continue;

    let id = idsConnus.get(element);
    if (!id) {
      id = `${PREFIXE_ID}-${prochainIndex}`;
      prochainIndex += 1;
      idsConnus.set(element, id);
    }
    element.setAttribute(NOM_ATTRIBUT, id);

    resultat.push({
      id,
      description: decrirePourIA(element),
      continuerEnArrierePlan: false,
    });
  }

  return resultat;
}
