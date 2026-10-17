"use client";

// Cree le 13/10/2026, demande Bourama : bouton flottant natif du canal en
// direct sur Android. Relie le bouton (fenetre du systeme, voir
// lib/boutonFlottantAndroid.ts) au canal en direct qui vit dans cette page.
//
// Un appui sur le bouton fait EXACTEMENT ce que fait le bouton du canal dans
// l'appli : activer le canal s'il est coupe, le desactiver s'il est actif.
// Activer le canal demarre la vision de l'ecran (lib/pontVisionEcranCanal.ts),
// rien de plus ici. Si l'appli n'etait pas a l'ecran quand l'etudiant a touche
// le bouton, elle lui rend la main une fois le canal active : il retrouve
// l'application ou il etait, le canal tourne en arriere-plan.
//
// Au demarrage de l'appli, le bouton est montre par defaut des que la
// permission d'affichage par-dessus les autres applis est accordee, sauf si
// l'etudiant l'a masque (reglage dans Parametres, Preferences). Sur le web et
// sur iOS, rien ne se passe (boutonFlottantDisponible() est faux).

import {
  activerCanalDepuisAgent,
  canalEnDirectEstActif,
  canalEnDirectEstPret,
  desactiverCanalDepuisAgent,
  ecouterActivationCanal,
} from "./contexteCanalEnDirect";
import {
  accuserBasculeBouton,
  accuserTexteBouton,
  boutonFlottantDisponible,
  definirEtatCanalBouton,
  demarrerBoutonFlottant,
  ecouterBasculeBouton,
  ecouterTexteBouton,
  etatBoutonFlottant,
  reculerAppli,
  signalerBoutonPret,
  type DemandeBasculeBouton,
  type TexteEcritBouton,
} from "./boutonFlottantAndroid";
import { initialiserBulleReponseAndroid } from "./pontBulleReponseAndroid";
import { attendreOperationsVision } from "./pontVisionEcranCanal";
import { textesBoutonFlottant } from "./textesBoutonFlottant";

let dejaInitialise = false;

// Un appui peut arriver deux fois de suite quand la page etait gelee : l'evenement
// mis en file puis le rejeu a l'ouverture. Le second est ignore.
const DELAI_ANTI_DOUBLON_MS = 800;
let derniereBasculeTraitee = 0;

const ATTENTE_CANAL_PRET_MS = 10_000;
const ATTENTE_ACTIVATION_MS = 3_000;
const PAS_ATTENTE_MS = 100;

function signaler(operation: string, e: unknown) {
  console.warn(`Bouton flottant : ${operation} impossible`, e);
}

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attendreCondition(condition: () => boolean, delaiMaxMs: number): Promise<boolean> {
  const fin = Date.now() + delaiMaxMs;
  while (!condition()) {
    if (Date.now() > fin) return false;
    await attendre(PAS_ATTENTE_MS);
  }
  return true;
}

async function traiterBascule(demande: DemandeBasculeBouton) {
  // L'accuse d'abord : sans lui le natif lance l'appli au bout de 1,5 seconde.
  try {
    await accuserBasculeBouton(demande.numero);
  } catch (e) {
    signaler("accuse de reception", e);
  }

  const maintenant = Date.now();
  if (maintenant - derniereBasculeTraitee < DELAI_ANTI_DOUBLON_MS) return;
  derniereBasculeTraitee = maintenant;

  // Appui pendant le demarrage de l'appli : le canal n'est pas encore monte.
  if (!(await attendreCondition(canalEnDirectEstPret, ATTENTE_CANAL_PRET_MS))) return;

  if (canalEnDirectEstActif()) {
    desactiverCanalDepuisAgent();
    return;
  }

  activerCanalDepuisAgent();
  if (!demande.reculerApres) return;

  // L'activation est prise en compte au prochain rendu : on attend qu'elle le soit,
  // puis que la vision de l'ecran ait fini de demarrer (fenetre d'autorisation du
  // systeme comprise) avant de rendre la main a l'appli d'avant.
  if (!(await attendreCondition(canalEnDirectEstActif, ATTENTE_ACTIVATION_MS))) return;
  await attendreOperationsVision();
  try {
    await reculerAppli();
  } catch (e) {
    signaler("retour a l'appli precedente", e);
  }
}

// Meme risque de doublon que pour l'appui : evenement mis en file puis rejeu a l'ouverture.
let dernierTexteTraite = "";
let derniereHeureTexte = 0;

async function traiterTexte(donnees: TexteEcritBouton, envoyerTexte: (texte: string) => void) {
  // L'accuse d'abord : sans lui le natif garde le texte et lance l'appli au bout de 1,5 seconde.
  try {
    await accuserTexteBouton(donnees.numero);
  } catch (e) {
    signaler("accuse de reception du texte", e);
  }

  const texte = donnees.texte.trim();
  if (!texte) return;
  const maintenant = Date.now();
  if (texte === dernierTexteTraite && maintenant - derniereHeureTexte < DELAI_ANTI_DOUBLON_MS) return;
  dernierTexteTraite = texte;
  derniereHeureTexte = maintenant;

  // Texte recu pendant le demarrage de l'appli : le canal n'est pas encore monte.
  if (!(await attendreCondition(canalEnDirectEstPret, ATTENTE_CANAL_PRET_MS))) return;
  // Le canal a ete coupe entre-temps : le champ du PC n'existe pas non plus canal coupe.
  if (!canalEnDirectEstActif()) return;
  envoyerTexte(texte);
}

async function demarrerParDefaut() {
  try {
    const etat = await etatBoutonFlottant();
    if (etat.demarre) return;
    // Masque par l'etudiant, ou permission pas encore accordee : on ne force rien.
    if (etat.choix === false || !etat.permissionAccordee) return;
    const textes = textesBoutonFlottant();
    await demarrerBoutonFlottant({
      titre: textes.notificationTitre,
      texte: textes.notificationTexte,
      libelleMasquer: textes.notificationMasquer,
    });
  } catch (e) {
    signaler("demarrage", e);
  }
}

/**
 * A appeler une seule fois, depuis initialiserCanalAgentApplicatif.
 * envoyerTexte envoie un message de l'etudiant a Classinus (envoyerMessageEtudiant) :
 * passe en parametre plutot qu'importe, pour ne pas creer d'import circulaire.
 */
export function initialiserBoutonFlottantCanal(envoyerTexte: (texte: string) => void) {
  if (dejaInitialise || typeof window === "undefined" || !boutonFlottantDisponible()) return;
  dejaInitialise = true;

  // Le bouton suit l'etat du canal : sombre au repos, or quand il est actif.
  ecouterActivationCanal((actif) => {
    definirEtatCanalBouton(actif).catch((e) => signaler("mise a jour de l'etat", e));
  });
  definirEtatCanalBouton(canalEnDirectEstActif()).catch((e) => signaler("mise a jour de l'etat", e));

  // L'ecouteur est en place AVANT de dire au natif que la page est prete : un appui
  // fait appli fermee est rejoue des cet appel.
  ecouterBasculeBouton((demande) => {
    void traiterBascule(demande);
  })
    .then(() => signalerBoutonPret())
    .catch((e) => signaler("ecoute des appuis", e));

  // Lot 2 : les messages ecrits dans le champ du bouton Ecrire.
  ecouterTexteBouton((donnees) => {
    void traiterTexte(donnees, envoyerTexte);
  }).catch((e) => signaler("ecoute des textes", e));

  // Lot 3 : la bulle de reponse et la fleche de Classinus.
  initialiserBulleReponseAndroid();

  void demarrerParDefaut();
}
