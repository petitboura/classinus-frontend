"use client";

// Editeur de code piloté par l'IA (28/09/2026, demande Bourama) : les
// opérations bas niveau sur la vue CodeMirror (écrire avec une frappe
// visible, surligner et montrer des lignes). Rien ici ne connaît le canal
// ni React : le pont (lib/pontEditeurAgent.ts) et le canal
// (lib/canalEditeurAgent.ts) s'appuient dessus.
//
// Toutes les écritures passent par des transactions CodeMirror : l'étudiant
// peut annuler ce que l'IA a écrit avec l'historique de l'éditeur, et l'état
// React de la page reste synchronisé par le onChange habituel.

import { EditorView, Decoration, StateEffect, StateField, type DecorationSet, type Extension } from "@uiw/react-codemirror";

export type ModeEcritureEditeur = "tout" | "lignes" | "apres_ligne";

export type OperationEcritureEditeur = {
  mode: ModeEcritureEditeur;
  texte: string;
  ligneDebut?: number | null;
  ligneFin?: number | null;
};

// Frappe visible : au plus NB_ETAPES_MAX_FRAPPE morceaux, un morceau toutes
// les DELAI_FRAPPE_MS. Un long code ne dépasse donc jamais quelques
// secondes, un court texte reste tapé caractère par caractère.
const NB_ETAPES_MAX_FRAPPE = 90;
const DELAI_FRAPPE_MS = 28;
const DUREE_SURLIGNAGE_MS = 2800;
const DELAI_MAX_ATTENTE_AFFICHAGE_MS = 120;

const ajouterSurlignage = StateEffect.define<{ debut: number; fin: number }>();
const retirerSurlignage = StateEffect.define<null>();

const marqueLigneAgent = Decoration.line({ class: "cm-ligne-agent" });

const champSurlignageAgent = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decorations, transaction) {
    let suivantes = decorations.map(transaction.changes);
    for (const effet of transaction.effects) {
      if (effet.is(ajouterSurlignage)) {
        const doc = transaction.state.doc;
        const debut = Math.max(1, Math.min(effet.value.debut, doc.lines));
        const fin = Math.max(debut, Math.min(effet.value.fin, doc.lines));
        const marques = [];
        for (let n = debut; n <= fin; n += 1) marques.push(marqueLigneAgent.range(doc.line(n).from));
        suivantes = Decoration.set(marques, true);
      } else if (effet.is(retirerSurlignage)) {
        suivantes = Decoration.none;
      }
    }
    return suivantes;
  },
  provide: (champ) => EditorView.decorations.from(champ),
});

// A ajouter aux extensions de l'éditeur (components/bureau/EditeurCode.tsx).
export const extensionsAgentEditeur: Extension[] = [champSurlignageAgent];

const minuteursSurlignage = new WeakMap<EditorView, ReturnType<typeof setTimeout>>();

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deux images pour laisser CodeMirror défiler et dessiner. Une page en
// arrière plan ne déclenche jamais requestAnimationFrame : le délai maximal
// évite d'attendre indéfiniment.
function attendreAffichage(): Promise<void> {
  const deuxImages = new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  return Promise.race([deuxImages, attendre(DELAI_MAX_ATTENTE_AFFICHAGE_MS)]);
}

function verifierVueActive(vue: EditorView) {
  if (!vue.dom.isConnected) {
    throw new Error("L'éditeur n'est plus affiché.");
  }
}

function verifierNumeroLigne(vue: EditorView, numero: number, minimum: number) {
  const nb = vue.state.doc.lines;
  if (!Number.isInteger(numero) || numero < minimum || numero > nb) {
    throw new Error(`Ligne ${numero} introuvable : l'éditeur contient ${nb} ligne(s), numérotées de 1 à ${nb}.`);
  }
}

function verifierPlageLignes(vue: EditorView, debut: number, fin: number) {
  verifierNumeroLigne(vue, debut, 1);
  verifierNumeroLigne(vue, fin, 1);
  if (fin < debut) {
    throw new Error(`La ligne de fin (${fin}) est avant la ligne de début (${debut}).`);
  }
}

function surlignerLignes(vue: EditorView, debut: number, fin: number) {
  const precedent = minuteursSurlignage.get(vue);
  if (precedent) clearTimeout(precedent);
  vue.dispatch({ effects: ajouterSurlignage.of({ debut, fin }) });
  minuteursSurlignage.set(
    vue,
    setTimeout(() => {
      minuteursSurlignage.delete(vue);
      if (vue.dom.isConnected) vue.dispatch({ effects: retirerSurlignage.of(null) });
    }, DUREE_SURLIGNAGE_MS)
  );
}

export function lireCodeEditeur(vue: EditorView): string {
  verifierVueActive(vue);
  return vue.state.doc.toString();
}

/**
 * Montre des lignes : l'éditeur défile jusqu'à elles, elles sont surlignées
 * un court instant. Renvoie l'élément de la première ligne (pour que le
 * curseur virtuel puisse la désigner), ou null s'il n'est pas dessiné.
 */
export async function montrerLignesEditeur(vue: EditorView, debut: number, fin: number): Promise<HTMLElement | null> {
  verifierVueActive(vue);
  verifierPlageLignes(vue, debut, fin);
  const positionDebut = vue.state.doc.line(debut).from;
  vue.dispatch({ effects: EditorView.scrollIntoView(positionDebut, { y: "center" }) });
  await attendreAffichage();
  verifierVueActive(vue);
  surlignerLignes(vue, debut, fin);
  const { node } = vue.domAtPos(positionDebut);
  const element = node instanceof HTMLElement ? node : node.parentElement;
  const ligne = element?.closest(".cm-line");
  return ligne instanceof HTMLElement ? ligne : null;
}

/**
 * Ecrit dans l'éditeur avec une frappe visible. Renvoie le nombre de lignes
 * après écriture. Les lignes écrites sont surlignées à la fin.
 */
export async function ecrireDansEditeurCode(vue: EditorView, operation: OperationEcritureEditeur): Promise<{ nbLignes: number }> {
  verifierVueActive(vue);
  const doc = vue.state.doc;
  let texte = (operation.texte ?? "").replace(/\r\n?/g, "\n");
  let debut: number;
  let fin: number;

  if (operation.mode === "tout") {
    debut = 0;
    fin = doc.length;
  } else if (operation.mode === "lignes") {
    const premiere = operation.ligneDebut ?? 0;
    const derniere = operation.ligneFin ?? premiere;
    verifierPlageLignes(vue, premiere, derniere);
    debut = doc.line(premiere).from;
    fin = doc.line(derniere).to;
    if (texte.endsWith("\n")) texte = texte.slice(0, -1);
  } else {
    const apres = operation.ligneDebut ?? -1;
    verifierNumeroLigne(vue, apres, 0);
    if (texte.endsWith("\n")) texte = texte.slice(0, -1);
    if (doc.length === 0) {
      debut = 0;
      fin = 0;
    } else if (apres === 0) {
      debut = 0;
      fin = 0;
      texte = `${texte}\n`;
    } else {
      debut = doc.line(apres).to;
      fin = debut;
      texte = `\n${texte}`;
    }
  }

  if (fin > debut) {
    vue.dispatch({ changes: { from: debut, to: fin, insert: "" }, selection: { anchor: debut }, userEvent: "delete.selection" });
  }

  const symboles = Array.from(texte);
  const surPlace = typeof document !== "undefined" && document.hidden;
  const taille = surPlace ? Math.max(symboles.length, 1) : Math.max(1, Math.ceil(symboles.length / NB_ETAPES_MAX_FRAPPE));
  let position = debut;

  for (let i = 0; i < symboles.length; i += taille) {
    verifierVueActive(vue);
    if (position > vue.state.doc.length) throw new Error("Le code a changé pendant l'écriture.");
    const morceau = symboles.slice(i, i + taille).join("");
    const nouvelle = position + morceau.length;
    vue.dispatch({
      changes: { from: position, insert: morceau },
      selection: { anchor: nouvelle },
      effects: EditorView.scrollIntoView(nouvelle, { y: "nearest", yMargin: 48 }),
      userEvent: "input.type",
    });
    position = nouvelle;
    if (!surPlace && i + taille < symboles.length) await attendre(DELAI_FRAPPE_MS);
  }

  verifierVueActive(vue);
  const docFinal = vue.state.doc;
  const finPosition = Math.min(position, docFinal.length);
  const premiereEcrite = docFinal.lineAt(Math.min(debut, docFinal.length)).number;
  const derniereEcrite = docFinal.lineAt(finPosition).number;
  surlignerLignes(vue, premiereEcrite, derniereEcrite);
  return { nbLignes: docFinal.lines };
}
