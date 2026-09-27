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
//   et ce plugin le convertit ici en coordonnees ECRAN ABSOLUES en
//   ajoutant la position de la fenetre principale (getContentBounds) --
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

import { BrowserWindow } from "electron";
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

class SuperpositionAgentImpl extends ElectronPlugin {
  async pousserEtat(etat: EtatPousse): Promise<void> {
    const principale = trouverFenetrePrincipale();
    if (!principale || !etat.curseur) {
      this.context.notifyListeners("etat", etat);
      return;
    }
    // Conversion local -> absolu : voir commentaire d'en-tete. Les autres
    // cles de etat.curseur (echelle, forme, visible, enAction...) passent
    // inchangees.
    const bornes = principale.getContentBounds();
    this.context.notifyListeners("etat", {
      ...etat,
      curseur: { ...etat.curseur, x: etat.curseur.x + bornes.x, y: etat.curseur.y + bornes.y },
    });
  }

  async envoyerInteraction(action: Record<string, unknown>): Promise<void> {
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
    superposition.setIgnoreMouseEvents(!parametres.capturer, { forward: true });
  }
}

export const SuperpositionAgent = defineElectronPlugin(
  { name: "SuperpositionAgent", methods: ["pousserEtat", "envoyerInteraction", "definirCapturerSouris"] },
  SuperpositionAgentImpl
);
