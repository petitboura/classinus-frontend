"use client";

// Cree le 11/10/2026, demande Bourama : lot 3 du chantier "vision ecran",
// partie frontend. Reception, sur le canal en direct, des demandes de Clovis
// pour lire le texte de l'ecran du telephone et y poser une marque (outils
// lire_ecran_telephone et marquer_ecran_telephone, voir
// core/outils_action_agent_telephone.py cote backend).
//
// Ce fichier ne contient AUCUN texte affiche a l'utilisateur : il repond avec
// des codes d'erreur stables, c'est le backend qui choisit ce que lit le modele.
//
// Meme principe que le reste du canal (lib/canalAgentApplicatif.ts) : la demande
// est diffusee a toutes les connexions du compte. Une connexion qui n'est pas
// l'appli Android, ou dont le canal en direct est desactive, repond
// {"ignore": true} pour laisser la vraie connexion repondre.
//
// Les positions d'une marque sont exprimees dans l'espace de la DERNIERE lecture
// du texte (image lue), que le natif convertit lui-meme vers l'ecran. Sans
// lecture faite, aucune marque n'est posee : on ne devine jamais une zone.

import { canalEnDirectEstActif } from "./contexteCanalEnDirect";
import { afficherSuperposition, codeErreurSuperposition, type MarqueSuperposition } from "./superposition";
import { codeErreurVisionEcran, lireTexteEcran, visionEcranDisponible } from "./visionEcran";

type Repondre = (id: string, resultat: unknown) => void;

const FORMES_MARQUE = ["pointer", "surligner", "souligner"] as const;
type FormeMarque = (typeof FORMES_MARQUE)[number];

type DemandeMarque = {
  forme: FormeMarque;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
  etiquette: string;
  dureeSecondes: number | null;
};

let espaceDerniereLecture: { largeur: number; hauteur: number } | null = null;

function nombre(valeur: unknown): number | null {
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : null;
}

function lireDemandeMarque(parametres: unknown): DemandeMarque | null {
  if (!parametres || typeof parametres !== "object") return null;
  const p = parametres as Record<string, unknown>;
  const forme = FORMES_MARQUE.find((f) => f === p.forme);
  const x = nombre(p.x);
  const y = nombre(p.y);
  const largeur = nombre(p.largeur);
  const hauteur = nombre(p.hauteur);
  if (!forme || x === null || y === null || largeur === null || hauteur === null) return null;
  if (largeur <= 0 || hauteur <= 0) return null;
  return {
    forme,
    x,
    y,
    largeur,
    hauteur,
    etiquette: typeof p.etiquette === "string" ? p.etiquette.trim() : "",
    dureeSecondes: nombre(p.duree_secondes),
  };
}

async function traiterLecture(id: string, repondre: Repondre) {
  try {
    const lecture = await lireTexteEcran();
    espaceDerniereLecture = { largeur: lecture.largeur, hauteur: lecture.hauteur };
    repondre(id, { succes: true, lecture });
  } catch (e) {
    repondre(id, { succes: false, code_erreur: codeErreurVisionEcran(e) ?? "ECHEC" });
  }
}

async function traiterMarque(id: string, parametres: unknown, repondre: Repondre) {
  const demande = lireDemandeMarque(parametres);
  if (!demande) {
    repondre(id, { succes: false, code_erreur: "MARQUES_INVALIDES" });
    return;
  }
  if (!espaceDerniereLecture) {
    repondre(id, { succes: false, code_erreur: "AUCUNE_LECTURE" });
    return;
  }
  const etiquette = demande.etiquette ? { etiquette: demande.etiquette } : {};
  // La pointe de la fleche est au centre de la zone ; surligner et souligner
  // prennent la zone entiere.
  const marque: MarqueSuperposition =
    demande.forme === "pointer"
      ? { type: "pointer", x: demande.x + demande.largeur / 2, y: demande.y + demande.hauteur / 2, ...etiquette }
      : { type: demande.forme, x: demande.x, y: demande.y, largeur: demande.largeur, hauteur: demande.hauteur, ...etiquette };
  try {
    await afficherSuperposition({
      marques: [marque],
      espace: espaceDerniereLecture,
      ...(demande.dureeSecondes !== null ? { dureeMs: Math.round(demande.dureeSecondes * 1000) } : {}),
    });
    repondre(id, { succes: true });
  } catch (e) {
    repondre(id, { succes: false, code_erreur: codeErreurSuperposition(e) ?? "ECHEC" });
  }
}

/**
 * Demande de Clovis pour le telephone. `type` vaut "lire_texte" ou "marquer"
 * (voir demander_action_ecran_telephone cote backend). Un type inconnu recoit
 * "ignore" : une autre connexion, plus recente, pourrait le connaitre.
 */
export async function traiterDemandeEcranTelephone(
  id: string,
  type: unknown,
  parametres: unknown,
  repondre: Repondre,
) {
  if (!visionEcranDisponible() || !canalEnDirectEstActif()) {
    repondre(id, { ignore: true });
    return;
  }
  if (type === "lire_texte") {
    await traiterLecture(id, repondre);
  } else if (type === "marquer") {
    await traiterMarque(id, parametres, repondre);
  } else {
    repondre(id, { ignore: true });
  }
}
