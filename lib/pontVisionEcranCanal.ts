"use client";

// Cree le 11/10/2026, demande Bourama : lot 4 du chantier "vision ecran".
// Sur Android, l'activation du canal en direct demarre la vision de l'ecran
// (fenetre d'autorisation du systeme, puis permission "afficher par-dessus les
// autres applications" si elle manque), et sa desactivation l'arrete. Aucun
// bouton de plus : le bouton du canal en direct reste le seul point d'entree,
// les outils lire_ecran_telephone et marquer_ecran_telephone font le reste.
//
// Si l'etudiant refuse une autorisation, le canal reste actif : les outils
// repondent alors que la vision n'est pas activee (voir
// core/outils_action_agent_telephone.py cote backend). La permission
// "afficher par-dessus" n'est demandee qu'une fois par session de l'appli, pour
// ne pas renvoyer l'etudiant dans les reglages a chaque activation.
//
// Sur le web et sur iOS, rien ne se passe (visionEcranDisponible() est faux).

import { canalEnDirectEstActif, ecouterActivationCanal } from "./contexteCanalEnDirect";
import { demanderPermissionSuperposition, effacerSuperposition, etatSuperposition } from "./superposition";
import {
  arreterVisionEcran,
  codeErreurVisionEcran,
  demarrerVisionEcran,
  ecouterEtatVisionEcran,
  etatVisionEcran,
  visionEcranDisponible,
} from "./visionEcran";
import { textesVisionEcran } from "./textesVisionEcran";

let dejaInitialise = false;
let permissionSuperpositionDejaDemandee = false;
// Vrai tant que la capture de l'ecran tourne. Tenu a jour par nos propres
// demarrages et arrets, et par les arrets venus du systeme (bouton Arreter de la
// notification, coupure par Android).
let visionDemarree = false;
// Les demarrages et arrets s'executent l'un apres l'autre : une activation suivie
// d'une desactivation rapide ne doit jamais laisser la capture allumee.
let fileOperations: Promise<void> = Promise.resolve();

/**
 * La vision de l'ecran tourne-t-elle ? Tant que c'est vrai, le canal en direct
 * reste ouvert quand l'appli passe en arriere-plan : Clovis doit pouvoir lire et
 * marquer l'ecran d'une autre application (voir lib/canalAgentApplicatif.ts).
 */
export function visionEcranEstDemarree(): boolean {
  return visionDemarree;
}

function signaler(operation: string, e: unknown) {
  console.warn(`Vision ecran : ${operation} impossible`, codeErreurVisionEcran(e) ?? "erreur inconnue");
}

async function demanderSuperpositionUneFois() {
  if (permissionSuperpositionDejaDemandee) return;
  try {
    const etat = await etatSuperposition();
    if (etat.permissionAccordee) return;
    permissionSuperpositionDejaDemandee = true;
    await demanderPermissionSuperposition();
  } catch (e) {
    signaler("demande de la permission d'affichage", e);
  }
}

async function arreter() {
  try {
    await effacerSuperposition();
  } catch (e) {
    signaler("effacement des marques", e);
  }
  try {
    const etat = await etatVisionEcran();
    if (etat.actif) await arreterVisionEcran();
    visionDemarree = false;
  } catch (e) {
    signaler("arret", e);
  }
}

async function demarrer() {
  try {
    const etat = await etatVisionEcran();
    if (!etat.actif) {
      const textes = textesVisionEcran();
      await demarrerVisionEcran({
        titre: textes.notificationTitre,
        texte: textes.notificationTexte,
        libelleArreter: textes.notificationArreter,
      });
    }
    visionDemarree = true;
  } catch (e) {
    // REFUSE : l'etudiant a refuse la fenetre du systeme. Le canal reste actif.
    signaler("demarrage", e);
    return;
  }
  // Le canal a pu etre desactive pendant la fenetre d'autorisation.
  if (!canalEnDirectEstActif()) {
    await arreter();
    return;
  }
  await demanderSuperpositionUneFois();
}

function planifier(actif: boolean) {
  fileOperations = fileOperations.then(() => (actif ? demarrer() : arreter())).catch(() => undefined);
}

/** A appeler une seule fois, depuis initialiserCanalAgentApplicatif. */
export function initialiserVisionEcranCanal() {
  if (dejaInitialise || typeof window === "undefined" || !visionEcranDisponible()) return;
  dejaInitialise = true;
  ecouterEtatVisionEcran((changement) => {
    visionDemarree = changement.actif;
  }).catch((e) => signaler("suivi de l'etat", e));
  ecouterActivationCanal(planifier);
  if (canalEnDirectEstActif()) planifier(true);
}
