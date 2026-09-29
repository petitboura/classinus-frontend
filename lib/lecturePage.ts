"use client";

// Lot U du chantier canal en direct : donner à Clovis la vue de ce que
// l'étudiant lit dans Classinus. Le scan de lib/scanElementsInteractifs.ts
// ne remonte que les éléments sur lesquels on peut agir (boutons, liens,
// champs) : ni les titres, ni les paragraphes, ni les messages d'erreur,
// ni la valeur d'un champ. Ce fichier lit tout cela, à la demande
// seulement (outil lire_page côté backend), jamais à chaque scan, pour ne
// pas alourdir le prompt de Clovis.
//
// Ce qui est lu : uniquement ce qui est réellement visible dans la
// fenêtre (mêmes idées que lib/clicGenerique.ts : élément caché, hors de
// l'écran, coupé par un parent, recouvert par une popup). Ce qui est
// écarté : les scripts, les styles, les éléments que le canal superpose
// lui même (curseur, bulle, journal), le contenu des cadres intégrés.
//
// Confidentialité : la valeur d'un champ mot de passe, ou d'un champ que
// le navigateur marque comme carte bancaire ou code à usage unique, n'est
// jamais lue.

import { decrireElement, SELECTEURS_ELEMENTS_INTERACTIFS } from "./scanElementsInteractifs";
import { estMasqueParAutreElement, ATTRIBUT_SUPERPOSITION, type CacheAffichage } from "./clicGenerique";

const NOM_ATTRIBUT_ID = "data-agent-id";
const ATTRIBUT_ZONE = "data-agent-zone";

// Utilisée seulement si la demande ne fournit pas de limite : la vraie
// limite vient du backend (LONGUEUR_MAX_LECTURE_PAGE dans
// core/canal_agent_applicatif.py), qui l'envoie avec chaque demande.
const LONGUEUR_MAX_PAR_DEFAUT = 8000;

// Une valeur de champ plus longue est coupée : une zone de texte peut
// contenir tout un devoir.
const LONGUEUR_MAX_VALEUR_CHAMP = 600;

const BALISES_IGNOREES = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "object",
  "embed",
  "head",
  "meta",
  "link",
]);

const TYPES_INPUT_BOUTON = new Set(["button", "submit", "reset", "image"]);

// Champs dont la valeur ne part jamais vers le modèle.
const AUTOCOMPLETE_SENSIBLE = /(^|\s)(cc-|one-time-code|current-password|new-password)/;

type Region = { gauche: number; haut: number; droite: number; bas: number };

function regionEcran(): Region {
  return { gauche: 0, haut: 0, droite: window.innerWidth, bas: window.innerHeight };
}

function regionVide(r: Region): boolean {
  return r.droite - r.gauche < 1 || r.bas - r.haut < 1;
}

function rectDansRegion(rect: DOMRect, r: Region): boolean {
  return rect.right > r.gauche && rect.left < r.droite && rect.bottom > r.haut && rect.top < r.bas;
}

function nettoyer(texte: string | null | undefined): string {
  if (!texte) return "";
  return texte.replace(/\s+/g, " ").trim();
}

function coupeLaSortie(valeurOverflow: string): boolean {
  return valeurOverflow !== "visible";
}

export type ResultatLecturePage = { texte: string; coupe: boolean };

class LecteurPage {
  private lignes: string[] = [];
  private ligneCourante: string[] = [];
  private prefixeCourant = "";
  private total = 0;
  private coupe = false;
  private cache: CacheAffichage = new Map();
  private masquageParParent = new Map<HTMLElement, boolean>();
  private cadreSignale = false;

  constructor(private readonly max: number) {}

  lire(): ResultatLecturePage {
    const entete = `Page : ${nettoyer(document.title) || "sans titre"} (${window.location.pathname})`;
    this.lignes.push(entete);
    this.total += entete.length;

    if (document.body) this.parcourir(document.body, regionEcran());
    this.viderLigne();

    let texte = this.lignes.join("\n");
    if (this.lignes.length <= 1) {
      texte += "\nAucun texte visible à l'écran.";
    }
    if (this.coupe) {
      texte += "\n[Lecture coupée : la limite de taille est atteinte, la suite de ce qui est affiché n'est pas incluse.]";
    }
    return { texte, coupe: this.coupe };
  }

  private viderLigne() {
    if (this.ligneCourante.length > 0) {
      this.lignes.push(this.prefixeCourant + this.ligneCourante.join(" "));
      this.ligneCourante = [];
      this.prefixeCourant = "";
    }
  }

  private ajouter(fragment: string) {
    if (this.coupe || !fragment) return;
    const reste = this.max - this.total;
    if (fragment.length > reste) {
      if (reste > 0) {
        this.ligneCourante.push(fragment.slice(0, reste).trimEnd() + "…");
        this.total += reste;
      }
      this.coupe = true;
      return;
    }
    this.ligneCourante.push(fragment);
    // +1 pour l'espace ou le retour à la ligne qui suit.
    this.total += fragment.length + 1;
  }

  private masque(element: HTMLElement): boolean {
    const connu = this.masquageParParent.get(element);
    if (connu !== undefined) return connu;
    const resultat = estMasqueParAutreElement(element, this.cache);
    this.masquageParParent.set(element, resultat);
    return resultat;
  }

  private parcourir(element: HTMLElement, region: Region) {
    if (this.coupe) return;

    const balise = element.tagName.toLowerCase();
    if (BALISES_IGNOREES.has(balise)) return;
    if (element.hasAttribute("hidden") || element.getAttribute("aria-hidden") === "true") return;
    if (element.hasAttribute(ATTRIBUT_SUPERPOSITION)) return;

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.opacity === "0") return;

    const contenu = style.display === "contents";
    const rect = element.getBoundingClientRect();

    // Un élément fixe ou absolu échappe à la découpe de ses parents :
    // on repart de l'écran entier pour ne pas perdre une popup visible.
    const regionDepart = style.position === "fixed" || style.position === "absolute" ? regionEcran() : region;

    let regionEnfants = regionDepart;
    if (!contenu) {
      const coupeX = coupeLaSortie(style.overflowX);
      const coupeY = coupeLaSortie(style.overflowY);
      const tailleNulle = rect.width === 0 || rect.height === 0;

      // Zone repliée (hauteur ou largeur zéro qui coupe son contenu).
      if (tailleNulle && (coupeX || coupeY)) return;
      if (!tailleNulle && !rectDansRegion(rect, regionDepart)) return;

      regionEnfants = { ...regionDepart };
      if (!tailleNulle) {
        if (coupeX) {
          regionEnfants.gauche = Math.max(regionEnfants.gauche, rect.left);
          regionEnfants.droite = Math.min(regionEnfants.droite, rect.right);
        }
        if (coupeY) {
          regionEnfants.haut = Math.max(regionEnfants.haut, rect.top);
          regionEnfants.bas = Math.min(regionEnfants.bas, rect.bottom);
        }
        if (regionVide(regionEnfants)) return;
      }
    }

    // Élément d'action : une seule entrée structurée, sans descendre.
    if (element.matches(SELECTEURS_ELEMENTS_INTERACTIFS)) {
      if (!contenu && !this.masque(element)) {
        // Un lien reste dans le fil de la phrase, un champ ou un bouton
        // prend sa propre ligne pour rester lisible.
        const surSaLigne = !(element instanceof HTMLAnchorElement);
        if (surSaLigne) this.viderLigne();
        this.ajouter(this.decrireInteractif(element));
        if (surSaLigne) this.viderLigne();
      }
      return;
    }

    if (balise === "iframe") {
      if (!this.cadreSignale && !this.masque(element)) {
        this.cadreSignale = true;
        this.viderLigne();
        this.ajouter("[cadre intégré : son contenu n'est pas lisible ici]");
        this.viderLigne();
      }
      return;
    }

    if (balise === "img") {
      const alt = nettoyer(element.getAttribute("alt"));
      if (alt && !this.masque(element)) this.ajouter(`[image : ${alt}]`);
      return;
    }

    const estBloc = !style.display.startsWith("inline") && !contenu;
    const zone = nettoyer(element.getAttribute(ATTRIBUT_ZONE));
    // Le texte d'une étiquette liée à un champ figure déjà dans la ligne
    // de ce champ : le lire ici le ferait apparaître deux fois.
    const etiquetteDeChamp = element instanceof HTMLLabelElement && element.control !== null;
    const visibleSoiMeme = style.visibility !== "hidden" && !etiquetteDeChamp;

    if (estBloc) this.viderLigne();
    if (zone) {
      this.viderLigne();
      this.ajouter(`[Zone : ${zone}]`);
      this.viderLigne();
    }
    if (estBloc) {
      if (/^h[1-6]$/.test(balise)) this.prefixeCourant = "# ";
      else if (balise === "li") this.prefixeCourant = "- ";
    }

    for (const enfant of Array.from(element.childNodes)) {
      if (this.coupe) break;
      if (enfant.nodeType === Node.TEXT_NODE) {
        if (!visibleSoiMeme) continue;
        const texte = nettoyer(enfant.textContent);
        if (!texte) continue;
        if (this.masque(element)) continue;
        this.ajouter(texte);
      } else if (enfant instanceof HTMLElement) {
        this.parcourir(enfant, regionEnfants);
      }
    }

    if (estBloc || zone) this.viderLigne();
  }

  private nomDuChamp(element: HTMLElement): string {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
      const etiquette = nettoyer(element.labels?.[0]?.textContent);
      if (etiquette) return etiquette;
    }
    // Le texte d'une liste déroulante est celui de toutes ses options :
    // ce n'est pas son nom.
    if (element instanceof HTMLSelectElement) {
      return (
        nettoyer(element.getAttribute("aria-label")) ||
        nettoyer(element.getAttribute("title")) ||
        nettoyer(element.getAttribute("name")) ||
        "liste sans nom"
      );
    }
    return decrireElement(element);
  }

  private genre(element: HTMLElement): string {
    if (element instanceof HTMLAnchorElement) return "lien";
    if (element instanceof HTMLSelectElement) return "liste";
    if (element instanceof HTMLTextAreaElement) return "champ";
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox") return "case à cocher";
      if (element.type === "radio") return "choix";
      if (element.type === "file") return "champ fichier";
      if (TYPES_INPUT_BOUTON.has(element.type)) return "bouton";
      return "champ";
    }
    return "bouton";
  }

  private decrireInteractif(element: HTMLElement): string {
    const details: string[] = [];

    if (element.hasAttribute("disabled") || element.getAttribute("aria-disabled") === "true") {
      details.push("désactivé");
    }

    const expanded = element.getAttribute("aria-expanded");
    if (expanded === "true") details.push("déplié");
    else if (expanded === "false") details.push("replié");

    if (element.getAttribute("aria-selected") === "true") details.push("sélectionné");
    if (element.getAttribute("aria-pressed") === "true") details.push("enfoncé");
    const courant = element.getAttribute("aria-current");
    if (courant && courant !== "false") details.push("page actuelle");
    if (element.getAttribute("aria-invalid") === "true") details.push("invalide");

    const roleCoche = element.getAttribute("aria-checked");
    if (roleCoche === "true") details.push("coché");
    else if (roleCoche === "false") details.push("non coché");

    if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
      details.push(element.checked ? "coché" : "non coché");
    } else if (element instanceof HTMLSelectElement) {
      const choix = Array.from(element.selectedOptions)
        .map((option) => nettoyer(option.textContent))
        .filter(Boolean)
        .join(", ");
      details.push(choix ? `choix : « ${choix} »` : "aucun choix");
    } else if (element instanceof HTMLInputElement && element.type === "file") {
      const noms = Array.from(element.files ?? []).map((f) => f.name);
      details.push(noms.length > 0 ? `fichiers : ${noms.join(", ")}` : "aucun fichier");
    } else if (
      (element instanceof HTMLInputElement && !TYPES_INPUT_BOUTON.has(element.type)) ||
      element instanceof HTMLTextAreaElement
    ) {
      const sensible =
        (element instanceof HTMLInputElement && element.type === "password") ||
        AUTOCOMPLETE_SENSIBLE.test(element.getAttribute("autocomplete") ?? "");
      if (sensible) {
        details.push("valeur masquée");
      } else {
        const valeur = element.value;
        if (!valeur) {
          details.push("vide");
        } else {
          const court =
            valeur.length > LONGUEUR_MAX_VALEUR_CHAMP
              ? `${valeur.slice(0, LONGUEUR_MAX_VALEUR_CHAMP).trimEnd()}…`
              : valeur;
          details.push(`valeur : « ${court} »`);
        }
      }
    }

    const id = element.getAttribute(NOM_ATTRIBUT_ID);
    const identifiant = id ? ` #${id}` : "";
    const suite = details.length > 0 ? ` (${details.join(", ")})` : "";
    return `[${this.genre(element)} « ${this.nomDuChamp(element)} »${identifiant}${suite}]`;
  }
}

/**
 * Texte de ce qui est réellement visible dans la fenêtre à cet instant :
 * titres, paragraphes, messages, et pour chaque élément d'action son nom,
 * son identifiant (celui de la liste de Clovis), sa valeur et son état.
 * `longueurMax` plafonne la taille du texte lu.
 */
export function lirePageVisible(longueurMax?: number): ResultatLecturePage {
  if (typeof document === "undefined") return { texte: "", coupe: false };
  const max = typeof longueurMax === "number" && Number.isFinite(longueurMax) && longueurMax > 0 ? longueurMax : LONGUEUR_MAX_PAR_DEFAUT;
  return new LecteurPage(max).lire();
}
