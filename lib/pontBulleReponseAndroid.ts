"use client";

// Cree le 17/10/2026, demande Bourama : lot 3 du bouton flottant natif Android
// (bulle de reponse et fleche). Relie la bulle native (lib/boutonFlottantAndroid.ts,
// android/.../boutonflottant/BulleEtCurseurManager.kt) au canal en direct qui vit
// dans cette page.
//
// Le natif ne decide de rien : il dessine ce que la page lui envoie. Ici, l'etat de la
// bulle du PC (information, reponse, ouverte ou fermee, avec ses minuteurs de
// fermeture) est recopie tel quel vers le natif. Les gestes de l'etudiant sur la
// fleche ou la bulle reviennent ici et declenchent les memes actions que le curseur
// et la bulle du PC : toucher la fleche rouvre ou ferme la derniere reponse, un doigt
// sur la reponse la garde ouverte, le relever reprend le compte a rebours.
//
// Sur le web et sur iOS, rien ne se passe (boutonFlottantDisponible() est faux).

import {
  abonnerEtatBulleCanal,
  basculerReponseDepuisAgent,
  reprendreMasquageReponseDepuisAgent,
  suspendreMasquageReponseDepuisAgent,
  type EtatBulleCanal,
} from "./contexteCanalEnDirect";
import {
  boutonFlottantDisponible,
  definirBulleNative,
  ecouterActionBulle,
  type ActionBulleDemandee,
  type EtatBulleNative,
} from "./boutonFlottantAndroid";

let dejaInitialise = false;
let derniereCle = "";

function signaler(operation: string, e: unknown) {
  console.warn(`Bulle flottante : ${operation} impossible`, e);
}

/** Meme priorite que la bulle du PC : la reponse affichee passe avant l'information. */
function versEtatNatif(etat: EtatBulleCanal): EtatBulleNative {
  if (!etat.actif) return { mode: "aucune" };
  if (etat.reponseVisible && etat.derniereReponse) {
    const reponse = etat.derniereReponse;
    return { mode: "reponse", texte: reponse.texte, proposerOuvrir: reponse.images.length > 0 };
  }
  if (etat.dernierTexte) return { mode: "information", texte: etat.dernierTexte };
  return { mode: "aucune" };
}

function traiterAction(geste: ActionBulleDemandee) {
  switch (geste.action) {
    case "basculer":
      basculerReponseDepuisAgent();
      break;
    case "suspendre":
      suspendreMasquageReponseDepuisAgent();
      break;
    case "reprendre":
      reprendreMasquageReponseDepuisAgent();
      break;
  }
}

/** A appeler une seule fois, depuis initialiserBoutonFlottantCanal. */
export function initialiserBulleReponseAndroid() {
  if (dejaInitialise || typeof window === "undefined" || !boutonFlottantDisponible()) return;
  dejaInitialise = true;

  abonnerEtatBulleCanal((etat) => {
    const natif = versEtatNatif(etat);
    // Un meme etat n'est envoye qu'une fois : le natif ne redessine pas pour rien.
    const cle = `${natif.mode}|${natif.proposerOuvrir ? 1 : 0}|${natif.texte ?? ""}`;
    if (cle === derniereCle) return;
    derniereCle = cle;
    definirBulleNative(natif).catch((e) => signaler("mise a jour", e));
  });

  ecouterActionBulle(traiterAction).catch((e) => signaler("ecoute des gestes", e));
}
