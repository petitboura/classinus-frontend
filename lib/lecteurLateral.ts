"use client";

import { useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";

// Lecteur à côté du chat (27/11/2026, demande de Bourama : comme Claude,
// ChatGPT et Gemini, le fichier ouvert pousse le chat et s'affiche à côté).
//
// Ce module est la seule source de vérité de ce qui est ouvert dans le volet.
// Il ne contient aucun composant lourd (ni PDF, ni liseuse) : il est importé
// statiquement par le chat, donc il doit rester léger et sans API navigateur
// au chargement.
//
// Principe : le volet (components/chat/VoletLecteur.tsx) s'enregistre comme
// "hôte" quand il est monté, c'est à dire seulement sur la page du chat. Tout
// ce qui veut ouvrir un fichier appelle ouvrirDansLecteur(). Si aucun hôte n'est
// monté (chat flottant sur une autre page, fenêtre de superposition du PC), la
// fonction renvoie false et l'appelant garde son comportement d'avant (fenêtre
// ou bloc déplié). Rien ne change donc là où le volet n'existe pas.

export type ImageLecteur = {
  src: string;
  alt?: string;
  /** Ajout à la bibliothèque proposé avec le téléchargement (fichier externe ou public). */
  surCopie?: () => Promise<void>;
};

export type ContenuLecteur =
  | {
      genre: "fichier";
      /** Identifiant stable : même fichier cliqué deux fois = même contenu. */
      id: string;
      titre: string;
      url: string;
      /** Extension connue (pdf, epub, docx...), sinon null et le type MIME décide. */
      extension?: string | null;
      typeMime?: string | null;
      positionType?: "page" | "timestamp" | null;
      positionValeur?: number | null;
      titreDuModele?: string;
      descriptionLien?: string;
      /** Texte sous le titre dans l'en-tête (ex. "PDF", "Word"). */
      sousTitre?: string;
      icone?: LucideIcon;
      /** Vrai pour un fichier du chat : le bouton Télécharger apparaît dans l'en-tête. */
      telechargeable?: boolean;
      idBibliothequePublique?: string | null;
      surCopie?: () => Promise<void>;
    }
  | {
      genre: "images";
      id: string;
      liste: ImageLecteur[];
      index: number;
    }
  | {
      genre: "media";
      id: string;
      titre: string;
      url: string;
      media: "audio" | "video";
    };

type Etat = { contenu: ContenuLecteur | null; hotes: number };

let etat: Etat = { contenu: null, hotes: 0 };
const ecouteurs = new Set<() => void>();

function emettre() {
  ecouteurs.forEach((e) => e());
}

function changer(prochain: Partial<Etat>) {
  etat = { ...etat, ...prochain };
  emettre();
}

function abonner(rappel: () => void) {
  ecouteurs.add(rappel);
  return () => {
    ecouteurs.delete(rappel);
  };
}

/** Appelé par le volet quand il se monte. Renvoie la fonction qui le retire. */
export function enregistrerHoteLecteur(): () => void {
  changer({ hotes: etat.hotes + 1 });
  return () => {
    const restants = Math.max(0, etat.hotes - 1);
    // Plus aucun volet monté (on quitte la page du chat) : rien ne doit rester
    // "ouvert" pour la prochaine fois.
    changer(restants === 0 ? { hotes: 0, contenu: null } : { hotes: restants });
  };
}

/** Vrai quand un volet est monté et peut afficher un contenu. */
export function lecteurDisponible(): boolean {
  return etat.hotes > 0;
}

/**
 * Ouvre un contenu dans le volet. Renvoie false si aucun volet n'est monté :
 * l'appelant doit alors utiliser son affichage habituel.
 * Un nouveau contenu remplace celui déjà ouvert (pas d'onglets).
 */
export function ouvrirDansLecteur(contenu: ContenuLecteur): boolean {
  if (etat.hotes === 0) return false;
  changer({ contenu });
  return true;
}

/** Change seulement l'image affichée de la galerie ouverte (flèches, vignettes). */
export function allerALImage(index: number) {
  const courant = etat.contenu;
  if (!courant || courant.genre !== "images") return;
  if (index < 0 || index >= courant.liste.length || index === courant.index) return;
  changer({ contenu: { ...courant, index } });
}

export function fermerLecteur() {
  if (etat.contenu !== null) changer({ contenu: null });
}

export function useContenuLecteur(): ContenuLecteur | null {
  return useSyncExternalStore(abonner, () => etat.contenu, () => null);
}

export function useLecteurDisponible(): boolean {
  return useSyncExternalStore(abonner, () => etat.hotes > 0, () => false);
}

/** Vrai si ce fichier est celui affiché dans le volet en ce moment. */
export function useFichierOuvert(id: string): boolean {
  return useSyncExternalStore(
    abonner,
    () => etat.contenu?.genre === "fichier" && etat.contenu.id === id,
    () => false
  );
}

/** Vrai si cette image est celle affichée dans le volet en ce moment. */
export function useImageOuverte(src: string): boolean {
  return useSyncExternalStore(
    abonner,
    () => {
      const c = etat.contenu;
      return c?.genre === "images" && c.liste[c.index]?.src === src;
    },
    () => false
  );
}

// Largeur choisie par l'utilisateur en tirant la barre : mémorisée d'une
// session à l'autre. Le stockage peut être indisponible (navigation privée,
// données bloquées) : toute lecture ou écriture est protégée.
const CLE_LARGEUR = "classinus.lecteur.largeur";
export const LARGEUR_LECTEUR_DEFAUT = 640;
export const LARGEUR_LECTEUR_MIN = 360;

export function lireLargeurLecteur(): number {
  try {
    const brut = window.localStorage.getItem(CLE_LARGEUR);
    const valeur = brut ? parseInt(brut, 10) : NaN;
    return Number.isFinite(valeur) && valeur >= LARGEUR_LECTEUR_MIN ? valeur : LARGEUR_LECTEUR_DEFAUT;
  } catch {
    return LARGEUR_LECTEUR_DEFAUT;
  }
}

export function ecrireLargeurLecteur(largeur: number) {
  try {
    window.localStorage.setItem(CLE_LARGEUR, String(Math.round(largeur)));
  } catch {
    // Sans stockage, la largeur n'est simplement pas mémorisée.
  }
}

// Deux colonnes (chat + lecteur) seulement quand la fenêtre est assez large : la
// barre latérale ouverte prend 288 px, le chat garde au moins 340 px et le
// lecteur au moins 360 px. En dessous, le lecteur s'ouvre en plein écran avec
// une flèche de retour, comme sur téléphone.
const REQUETE_DEUX_COLONNES = "(min-width: 1024px)";

function abonnerLargeur(rappel: () => void) {
  const media = window.matchMedia(REQUETE_DEUX_COLONNES);
  media.addEventListener("change", rappel);
  return () => media.removeEventListener("change", rappel);
}

export function useDeuxColonnes(): boolean {
  return useSyncExternalStore(
    abonnerLargeur,
    () => window.matchMedia(REQUETE_DEUX_COLONNES).matches,
    () => true
  );
}
