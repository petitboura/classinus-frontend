// Cree le 27/09/2026, Bourama : chantier "canal en direct sort de l'appli"
// (voir plan-canal-en-direct-pc.md), Lot R.
//
// Meme contrat que le plugin Dossiers du Lot Q (voir
// packages/capacitor-dossiers-electron/electron/src/plugin.mts) : fichier
// compile attendu a <src>/dist/plugin.mjs, classe exportee avec la
// propriete statique __capacitorElectronPlugin (posee par
// defineElectronPlugin).
//
// Role de ce plugin : la fenetre principale (qui garde la vraie connexion
// WebSocket du canal agent applicatif, lib/canalAgentApplicatif.ts) et la
// fenetre de superposition (processus de rendu separe, voir
// electron/main.ts) n'ont pas acces l'une a l'autre aux contextes React
// ContexteCurseurVirtuel/ContexteCanalEnDirect. Ce plugin fait le pont :
// - pousserEtat : appele par la fenetre PRINCIPALE a chaque changement
//   d'etat pertinent (position/forme du curseur, texte de la bulle,
//   reponse, journal...). Relaye tel quel a la superposition via
//   notifyListeners, SAUF le point ecran du curseur : il est fourni en
//   coordonnees LOCALES a la page (comme un getBoundingClientRect normal),
//   et ce plugin ancre chaque NOUVEAU déplacement en ECRAN ABSOLU,
//   puis conserve cet ancrage si la fenêtre principale bouge --
//   necessaire car la fenetre de superposition couvre tout l'ecran (voir
//   electron/main.ts) et n'a donc pas le meme repere que la page.
// - envoyerInteraction : appele par la fenetre de SUPERPOSITION (glisser
//   le curseur quand rien n'est en cours, ecrire dans la barre de saisie,
//   cliquer sur le bouton du canal...). Relaye tel quel vers la fenetre
//   principale, qui reconnait le nom de fonction transporte et appelle la
//   vraie fonction du contexte (voir clovis-frontend/lib/
//   superpositionElectron.ts cote fenetre principale).
// - definirCapturerSouris : appele par la fenetre de superposition
//   elle-meme (hit-testing cote rendu : y a-t-il un element visuel sous le
//   curseur en ce moment ?) pour activer/desactiver le passe-clic
//   (setIgnoreMouseEvents), afin que la superposition ne capte les clics
//   que la ou quelque chose est reellement affiche (voir point 1 du Lot R
//   dans le plan).
//
// Sciemment un pont "bete" (unknown des deux cotes) : la forme exacte de
// l'etat/des interactions est definie et versionnee cote TypeScript
// applicatif (lib/superpositionElectron.ts), pas ici -- ce plugin n'a pas
// a etre retouche si ces formes evoluent.

import { BrowserWindow, screen } from "electron";
import { randomUUID } from "node:crypto";
import { ElectronPlugin, defineElectronPlugin } from "@capawesome/capacitor-electron/plugin";

// Identification des deux fenetres par leur titre plutot que par un pont
// d'export entre paquets (electron/main.ts et ce plugin sont deux projets
// TypeScript compiles separement, voir electron/tsconfig.json vs
// electron/tsconfig.json de ce paquet -- un import relatif entre les deux
// serait fragile a l'ordre de build). electron/main.ts pose ces titres a
// la creation de chaque fenetre ; getAllWindows() ne renvoie jamais plus
// de deux fenetres dans cette appli (principale + superposition), donc ce
// lookup reste bon marche a chaque appel.
const TITRE_FENETRE_SUPERPOSITION = "classinus-superposition-agent";

function trouverFenetreSuperposition(): BrowserWindow | null {
  return BrowserWindow.getAllWindows().find((f) => f.getTitle() === TITRE_FENETRE_SUPERPOSITION) ?? null;
}

function trouverFenetrePrincipale(): BrowserWindow | null {
  return BrowserWindow.getAllWindows().find((f) => f.getTitle() !== TITRE_FENETRE_SUPERPOSITION) ?? null;
}

type PointEcranLocal = { x: number; y: number };

type EtatPousse = {
  curseur?: PointEcranLocal & Record<string, unknown>;
  [cle: string]: unknown;
};

let dernierEtat: EtatPousse | null = null;
let notifierEtat: ((etat: EtatPousse) => void) | null = null;
let notifierInteraction: ((action: Record<string, unknown>) => void) | null = null;
let pointageEnCours = false;
let pointAffiche: PointEcranLocal | null = null;
let pointEcranAffiche: PointEcranLocal | null = null;
let dernierPointPrincipal: (PointEcranLocal & { repere: unknown }) | null = null;
const confirmationsPointage = new Map<string, () => void>();
const confirmationsInformation = new Map<string, () => void>();
let informationCurseur: { id: string; texte: string; jusqua: number } | null = null;
let clicTraversant = false;
let captureDemandee = false;

export async function avecSourisTraversante<T>(operation: () => Promise<T>): Promise<T> {
  const fenetre = trouverFenetreSuperposition();
  clicTraversant = true;
  fenetre?.setIgnoreMouseEvents(true, { forward: true });
  try { return await operation(); }
  finally {
    clicTraversant = false;
    if (fenetre && !fenetre.isDestroyed()) fenetre.setIgnoreMouseEvents(!captureDemandee, { forward: true });
  }
}

// Marques dessinees par Clovis sur l'ecran (cercle, trait dessous, surlignage).
// Gardees ici et ajoutees a CHAQUE etat envoye a la superposition : la fenetre
// principale repousse l'etat en continu, sans ce rappel les marques sauteraient.
type FormeMarque = "entourer" | "souligner" | "surligner";
type MarqueEcran = { id: string; forme: FormeMarque; x: number; y: number; largeur: number; hauteur: number; dureeMs: number };
const FORMES_MARQUE: FormeMarque[] = ["entourer", "souligner", "surligner"];
const NB_MAX_MARQUES = 12;
let marquesAffichees: MarqueEcran[] = [];

function diffuserMarques(): void {
  try {
    if (notifierEtat && dernierEtat) notifierEtat(avecInformationCurseur(dernierEtat));
  } catch {
    // superposition fermee entre-temps : rien a mettre a jour
  }
}

function avecInformationCurseur(etatBrut: EtatPousse): EtatPousse {
  const etat: EtatPousse = { ...etatBrut, marques: marquesAffichees };
  if (!informationCurseur || performance.now() >= informationCurseur.jusqua) return etat;
  return { ...etat, informationId: informationCurseur.id, canal: {
    ...(etat.canal as Record<string, unknown>), dernierTexte: informationCurseur.texte, reponseVisible: false,
  } };
}

/**
 * Marque un element de l'ecran (coordonnees et taille en pixels physiques, celles de
 * lire_ecran). Clovis choisit le moment (delaiMs) et la duree (dureeMs), comme pour la bulle.
 * Retourne tout de suite : la marque apparait puis disparait toute seule.
 */
export async function marquerEcran(p: {
  forme: string; x: number; y: number; largeur: number; hauteur: number; delaiMs: number; dureeMs: number;
}): Promise<{ succes: true }> {
  if (!FORMES_MARQUE.includes(p.forme as FormeMarque)) throw new Error("Forme de marque inconnue (entourer, souligner ou surligner).");
  if (![p.x, p.y, p.largeur, p.hauteur, p.delaiMs, p.dureeMs].every(Number.isFinite) || p.largeur <= 0 || p.hauteur <= 0) {
    throw new Error("Position ou taille de la marque invalide.");
  }
  const fenetre = trouverFenetreSuperposition();
  if (!fenetre || fenetre.isDestroyed() || !notifierEtat || !dernierEtat) throw new Error("La superposition de Clovis n'est pas prête.");
  if (!(dernierEtat.canal as { actif?: boolean } | undefined)?.actif) throw new Error("Le canal en direct n'est pas actif.");
  const enDip = (pt: PointEcranLocal) => process.platform === "win32" || process.platform === "linux"
    ? screen.screenToDipPoint({ x: Math.round(pt.x), y: Math.round(pt.y) }) : pt;
  const hautGauche = enDip({ x: p.x, y: p.y });
  const basDroite = enDip({ x: p.x + p.largeur, y: p.y + p.hauteur });
  if (!estSurUnEcran({ x: (hautGauche.x + basDroite.x) / 2, y: (hautGauche.y + basDroite.y) / 2 })) {
    throw new Error("L'endroit à marquer est hors des écrans.");
  }
  const origine = fenetre.getContentBounds();
  const zoom = fenetre.webContents.getZoomFactor();
  const marque: MarqueEcran = {
    id: randomUUID(),
    forme: p.forme as FormeMarque,
    x: (hautGauche.x - origine.x) / zoom,
    y: (hautGauche.y - origine.y) / zoom,
    largeur: Math.max(1, (basDroite.x - hautGauche.x) / zoom),
    hauteur: Math.max(1, (basDroite.y - hautGauche.y) / zoom),
    dureeMs: Math.min(Math.max(p.dureeMs, 1000), 60000),
  };
  const afficher = () => {
    marquesAffichees = [...marquesAffichees, marque].slice(-NB_MAX_MARQUES);
    diffuserMarques();
    setTimeout(() => {
      marquesAffichees = marquesAffichees.filter(m => m.id !== marque.id);
      diffuserMarques();
    }, marque.dureeMs);
  };
  if (p.delaiMs > 0) setTimeout(afficher, Math.min(p.delaiMs, 30000)); else afficher();
  return { succes: true };
}

/** Accusé d'affichage automatique, jamais une demande de validation à l'étudiant. */
export async function annoncerUtilisationCurseurReel(texte: string): Promise<void> {
  const fenetre = trouverFenetreSuperposition();
  if (!fenetre || fenetre.isDestroyed() || !notifierEtat || !dernierEtat || !(dernierEtat.canal as { actif?: boolean })?.actif) {
    throw new Error("L'annonce n'a pas pu être affichée. Le pointeur Windows n'a pas été déplacé.");
  }
  const id = randomUUID();
  informationCurseur = { id, texte, jusqua: performance.now() + 3500 };
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      confirmationsInformation.set(id, resolve);
      minuteur = setTimeout(() => reject(new Error("L'annonce n'a pas été affichée. Le pointeur Windows n'a pas été déplacé.")), 2500);
      notifierEtat?.(avecInformationCurseur(dernierEtat!));
    });
    // Laisser l'annonce être perceptible avant le clic, sans intervention utilisateur.
    await new Promise<void>(resolve => setTimeout(resolve, 350));
  } finally {
    clearTimeout(minuteur);
    confirmationsInformation.delete(id);
  }
}

function estSurUnEcran(point: PointEcranLocal): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && screen.getAllDisplays().some(({ bounds: b }) =>
    point.x >= b.x && point.x < b.x + b.width && point.y >= b.y && point.y < b.y + b.height);
}

function retenirSurUnEcran(point: PointEcranLocal): PointEcranLocal {
  if (estSurUnEcran(point)) return point;
  // La courbe peut déborder même si ses deux extrémités sont visibles.
  const candidats = screen.getAllDisplays().map(({ bounds: b }) => ({
    x: Math.max(b.x + 4, Math.min(point.x, b.x + b.width - 28)),
    y: Math.max(b.y + 4, Math.min(point.y, b.y + b.height - 28)),
  }));
  return candidats.reduce((a, b) => Math.hypot(a.x - point.x, a.y - point.y) <= Math.hypot(b.x - point.x, b.y - point.y) ? a : b);
}

/** Trajectoire calculée dans Electron : aucun appel au pilote souris ni au RAF du renderer principal. */
export async function pointerCurseurEcran(p: { x: number; y: number }): Promise<{ succes: true }> {
  const fenetre = trouverFenetreSuperposition();
  const etat = dernierEtat;
  const notifier = notifierEtat;
  if (!fenetre || fenetre.isDestroyed() || !etat?.curseur || !notifier) throw new Error("La superposition de Clovis n'est pas prête.");
  if (!(etat.canal as { actif?: boolean } | undefined)?.actif) throw new Error("Le canal en direct n'est pas actif.");
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error("Coordonnées de pointage invalides.");
  if (pointageEnCours) throw new Error("Un pointage est déjà en cours.");
  const cibleDip = process.platform === "win32" || process.platform === "linux" ? screen.screenToDipPoint({ x: Math.round(p.x), y: Math.round(p.y) }) : p;
  if (!screen.getAllDisplays().some(d => cibleDip.x >= d.bounds.x && cibleDip.x < d.bounds.x + d.bounds.width && cibleDip.y >= d.bounds.y && cibleDip.y < d.bounds.y + d.bounds.height)) throw new Error("Le point visé est hors des écrans.");
  const origine = fenetre.getContentBounds();
  const zoom = fenetre.webContents.getZoomFactor();
  const cible = { x: (cibleDip.x - origine.x) / zoom, y: (cibleDip.y - origine.y) / zoom };
  const depart = pointAffiche ?? etat.curseur;
  const dx = cible.x - depart.x, dy = cible.y - depart.y;
  const distance = Math.hypot(dx, dy) || 1;
  const courbure = Math.min(Math.max(distance * 0.25, 30), 160);
  const controle = { x: (depart.x + cible.x) / 2 - dy * courbure / distance, y: (depart.y + cible.y) / 2 + dx * courbure / distance };
  const duree = Math.min(Math.max(distance / 900, 0.35), 1.1) * 1000;
  const id = randomUUID();
  let minuteur: ReturnType<typeof setTimeout> | undefined;
  let animation: ReturnType<typeof setTimeout> | undefined;
  const confirmation = new Promise<void>((resolve, reject) => {
    confirmationsPointage.set(id, resolve);
    minuteur = setTimeout(() => reject(new Error("La superposition n'a pas confirmé l'affichage du curseur.")), 4000);
  });
  // Attacher immédiatement le rejet, y compris si la fenêtre disparaît pendant la trajectoire.
  void confirmation.catch(() => {});
  pointageEnCours = true;
  try {
    const debut = performance.now();
    await new Promise<void>((resolve, reject) => {
      const avancer = () => {
        try {
        if (fenetre.isDestroyed()) throw new Error("La superposition a été fermée pendant le pointage.");
        const progression = Math.min((performance.now() - debut) / duree, 1);
        const t = progression * progression * (3 - 2 * progression), u = 1 - t;
        const point = { x: u * u * depart.x + 2 * u * t * controle.x + t * t * cible.x, y: u * u * depart.y + 2 * u * t * controle.y + t * t * cible.y };
        pointEcranAffiche = retenirSurUnEcran({ x: origine.x + point.x * zoom, y: origine.y + point.y * zoom });
        pointAffiche = { x: (pointEcranAffiche.x - origine.x) / zoom, y: (pointEcranAffiche.y - origine.y) / zoom };
        notifier(avecInformationCurseur({ ...dernierEtat, curseur: { ...etat.curseur, ...pointAffiche, visible: true, enAction: progression < 1, forme: progression < 1 ? "defaut" : "main" }, ...(progression === 1 ? { pointageId: id } : {}) }));
        if (progression === 1) resolve(); else animation = setTimeout(avancer, 16);
        } catch (e) { reject(e); }
      };
      avancer();
    });
    await confirmation;
    // Le renderer principal garde la position absolue, même lors des prochains états de journal.
    notifierInteraction?.({ fonction: "deposerCurseur", args: [cibleDip.x, cibleDip.y], repere: "ecran" });
    return { succes: true };
  } finally {
    clearTimeout(minuteur);
    clearTimeout(animation);
    confirmationsPointage.delete(id);
    pointageEnCours = false;
  }
}


// Correctif (28/09/2026, demande Bourama) : la fenetre de superposition
// ne doit etre visible que lorsque le canal en direct est actif, ni au
// lancement, ni en permanence. pousserEtat est le seul signal recu a
// chaque changement pertinent cote fenetre principale (voir
// useEmetteurSuperposition dans lib/superpositionElectron.ts, qui pousse
// canal.actif a chaque changement), donc c'est ici qu'on decide de
// montrer/cacher, plutot que dans electron/main.ts qui ne connait pas cet
// etat. Variable de module (pas de champ sur la classe : Capacitor peut
// recreer l'instance du plugin, ce module reste, lui, charge une seule
// fois par processus) pour n'appeler show()/hide() qu'au VRAI changement
// et ne pas voler le focus a chaque instantane (le curseur bouge en
// continu pendant une trajectoire, voir useEmetteurSuperposition).
let dernierCanalActif = false;

function synchroniserVisibiliteSuperposition(actif: boolean) {
  if (actif === dernierCanalActif) return;
  dernierCanalActif = actif;
  const superposition = trouverFenetreSuperposition();
  if (!superposition || superposition.isDestroyed()) return;
  if (actif) superposition.showInactive();
  else superposition.hide();
}

class SuperpositionAgentImpl extends ElectronPlugin {
  load(): void { notifierInteraction = action => this.context.notifyListeners("interaction", action); }

  async accuserPointage(p: { id: string }): Promise<void> {
    confirmationsPointage.get(p.id)?.();
  }
  async accuserInformation(p: { id: string }): Promise<void> {
    confirmationsInformation.get(p.id)?.();
  }
  async preparerDeplacement(p: { depart: PointEcranLocal; repereDepart: string; cible: PointEcranLocal; repereCible: string }): Promise<{ depart: PointEcranLocal; cible: PointEcranLocal }> {
    const principale = trouverFenetrePrincipale();
    const superposition = trouverFenetreSuperposition();
    if (!principale || principale.isDestroyed() || !superposition || superposition.isDestroyed()) {
      throw new Error("La superposition de Clovis n'est pas prête.");
    }
    if (![p.depart.x, p.depart.y, p.cible.x, p.cible.y].every(Number.isFinite)) {
      throw new Error("Coordonnées de pointage invalides.");
    }
    const bornes = principale.getContentBounds();
    const zoom = principale.webContents.getZoomFactor();
    const departEcran = pointEcranAffiche ?? (p.repereDepart === "ecran" ? p.depart : {
      x: bornes.x + p.depart.x * zoom, y: bornes.y + p.depart.y * zoom,
    });
    if (p.repereCible === "ecran") {
      const cible = process.platform === "win32" || process.platform === "linux"
        ? screen.screenToDipPoint({ x: Math.round(p.cible.x), y: Math.round(p.cible.y) }) : p.cible;
      if (!screen.getAllDisplays().some(d => cible.x >= d.bounds.x && cible.x < d.bounds.x + d.bounds.width && cible.y >= d.bounds.y && cible.y < d.bounds.y + d.bounds.height)) {
        throw new Error("Le point visé est hors des écrans.");
      }
      return { depart: departEcran, cible };
    }
    return { depart: { x: (departEcran.x - bornes.x) / zoom, y: (departEcran.y - bornes.y) / zoom }, cible: p.cible };
  }

  async pousserEtat(etat: EtatPousse): Promise<void> {
    notifierEtat = e => this.context.notifyListeners("etat", e);
    notifierInteraction = action => this.context.notifyListeners("interaction", action);
    const canal = etat.canal as { actif?: unknown } | undefined;
    if (canal && typeof canal.actif === "boolean") {
      synchroniserVisibiliteSuperposition(canal.actif);
    }

    const principale = trouverFenetrePrincipale();
    if (!principale || !etat.curseur) {
      this.context.notifyListeners("etat", avecInformationCurseur(etat));
      return;
    }
    // Conversion local -> absolu : voir commentaire d'en-tete. Les autres
    // cles de etat.curseur (echelle, forme, visible, enAction...) passent
    // inchangees.
    const bornes = principale.getContentBounds();
    const zoom = principale.webContents.getZoomFactor();
    const superposition = trouverFenetreSuperposition();
    const origine = superposition?.getContentBounds() ?? { x: 0, y: 0 };
    const zoomSuperposition = superposition?.webContents.getZoomFactor() ?? 1;
    const point = etat.curseur.repere === "ecran" ? etat.curseur : {
      x: etat.curseur.x * zoom + bornes.x, y: etat.curseur.y * zoom + bornes.y,
    };
    const positionPrincipale = { x: etat.curseur.x, y: etat.curseur.y, repere: etat.curseur.repere };
    const positionChangee = !dernierPointPrincipal || positionPrincipale.x !== dernierPointPrincipal.x || positionPrincipale.y !== dernierPointPrincipal.y || positionPrincipale.repere !== dernierPointPrincipal.repere;
    // Seul un déplacement du curseur change son ancrage écran. Bouger ou
    // minimiser Classinus, ou rafraîchir le journal, conserve le dernier point.
    if (!pointageEnCours && positionChangee && estSurUnEcran(point)) pointEcranAffiche = { x: point.x, y: point.y };
    if (!pointEcranAffiche) {
      const b = screen.getAllDisplays()[0].bounds;
      pointEcranAffiche = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    }
    dernierPointPrincipal = positionPrincipale;
    pointAffiche = { x: (pointEcranAffiche.x - origine.x) / zoomSuperposition, y: (pointEcranAffiche.y - origine.y) / zoomSuperposition };
    const curseur = { ...etat.curseur, ...pointAffiche, ...(pointageEnCours ? { visible: true, enAction: true } : {}) };
    dernierEtat = { ...etat, curseur };
    this.context.notifyListeners("etat", avecInformationCurseur(dernierEtat));
  }

  async envoyerInteraction(action: Record<string, unknown>): Promise<void> {
    // Un glissement dans la superposition conserve une position écran
    // absolue, indépendante de la position de la fenêtre principale.
    const args = action.args;
    if (action.fonction === "deposerCurseur" && Array.isArray(args) && typeof args[0] === "number" && typeof args[1] === "number") {
      const principale = trouverFenetrePrincipale();
      if (principale && !principale.isDestroyed()) {
        const superposition = trouverFenetreSuperposition();
        const origine = superposition?.getContentBounds() ?? { x: 0, y: 0 };
        const zoomSuperposition = superposition?.webContents.getZoomFactor() ?? 1;
        if (!Number.isFinite(args[0]) || !Number.isFinite(args[1]) || pointageEnCours) return;
        pointEcranAffiche = retenirSurUnEcran({ x: args[0] * zoomSuperposition + origine.x, y: args[1] * zoomSuperposition + origine.y });
        this.context.notifyListeners("interaction", { ...action, repere: "ecran", args: [pointEcranAffiche.x, pointEcranAffiche.y] });
        return;
      }
    }
    this.context.notifyListeners("interaction", action);
  }

  async definirCapturerSouris(parametres: { capturer: boolean }): Promise<void> {
    const superposition = trouverFenetreSuperposition();
    if (!superposition) return;
    // capturer = true : la superposition intercepte les clics a cet
    // endroit (setIgnoreMouseEvents(false)). capturer = false : les clics
    // traversent vers l'appli/le site en dessous (setIgnoreMouseEvents(true)).
    // { forward: true } laisse quand meme les evenements de mouvement
    // remonter au renderer de la superposition pour continuer le
    // hit-testing meme quand elle est en mode passe-clic.
    captureDemandee = parametres.capturer;
    superposition.setIgnoreMouseEvents(clicTraversant || !captureDemandee, { forward: true });
  }
}

export const SuperpositionAgent = defineElectronPlugin(
  { name: "SuperpositionAgent", methods: ["preparerDeplacement", "accuserPointage", "accuserInformation", "pousserEtat", "envoyerInteraction", "definirCapturerSouris"] },
  SuperpositionAgentImpl
);
