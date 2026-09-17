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

import { estVisibleEtActif } from "./clicGenerique";

export type ElementInteractifDetecte = {
  id: string;
  description: string;
  // Défaut prudent (même principe que le chantier F, lib/clicGenerique.ts) :
  // un élément détecté automatiquement est TOUJOURS sensible, sans
  // exception -- aucun jugement de sensibilité n'est possible sur un
  // élément dont on ne sait rien d'autre que sa présence à l'écran.
  sensible: true;
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
function decrireElement(element: HTMLElement): string {
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

/**
 * Scanne le DOM actuel et renvoie la liste des éléments réellement
 * visibles, actifs et potentiellement cliquables à cet instant précis
 * -- jamais mémorisé, toujours recalculé au moment de l'appel (même
 * principe que l'ancien obtenirActionsDisponibles). Assigne à chaque
 * élément retenu un attribut data-agent-id unique, valable seulement
 * pour ce scan (réassigné/écrasé au scan suivant, jamais persistant
 * d'un scan à l'autre).
 */
export function scannerElementsInteractifs(): ElementInteractifDetecte[] {
  if (typeof document === "undefined") return [];

  const elements = document.querySelectorAll<HTMLElement>(SELECTEURS_ELEMENTS_INTERACTIFS);
  const resultat: ElementInteractifDetecte[] = [];
  let compteur = 0;

  for (const element of elements) {
    if (!estVisibleEtActif(element)) continue;

    const id = `${PREFIXE_ID}-${compteur}`;
    compteur += 1;
    element.setAttribute(NOM_ATTRIBUT, id);

    resultat.push({
      id,
      description: decrireElement(element),
      sensible: true,
      continuerEnArrierePlan: false,
    });
  }

  return resultat;
}
