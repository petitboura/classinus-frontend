"use client";

// Editeur de code piloté par l'IA (28/09/2026, demande Bourama) : traite les
// ordres {editeur: {op: lire | montrer | ecrire}} reçus par le canal en
// direct (lib/canalAgentApplicatif.ts). Même règle que le reste du canal :
// aucune confirmation imposée, c'est l'IA qui décide selon la conversation
// de demander avant d'écrire. Un éditeur non monté ICI répond "ignore", pour
// laisser une autre connexion du même compte répondre.

import { deplacerCurseurDepuisAgent } from "./contexteCurseurVirtuel";
import { afficherTexteDepuisAgent, mettreAJourJournalDepuisAgent, pousserJournalDepuisAgent } from "./contexteCanalEnDirect";
import { obtenirPontEditeur } from "./pontEditeurAgent";
import type { ModeEcritureEditeur } from "./operationsEditeurAgent";

type Repondre = (id: string, resultat: unknown) => void;

function entierOuNull(valeur: unknown): number | null {
  return typeof valeur === "number" && Number.isInteger(valeur) ? valeur : null;
}

function decrireLignes(debut: number, fin: number): string {
  return debut === fin ? `la ligne ${debut}` : `les lignes ${debut} à ${fin}`;
}

function messageErreur(e: unknown, parDefaut: string): string {
  return e instanceof Error && e.message ? e.message : parDefaut;
}

export async function traiterDemandeEditeur(id: string, operation: unknown, repondre: Repondre) {
  const pont = obtenirPontEditeur();
  if (!pont) {
    repondre(id, { ignore: true });
    return;
  }
  const o = (operation && typeof operation === "object" ? operation : {}) as Record<string, unknown>;

  if (o.op === "lire") {
    try {
      const lecture = pont.lire();
      pousserJournalDepuisAgent("Lit le code de l'éditeur", "succes");
      repondre(id, { succes: true, ...lecture });
    } catch (e) {
      repondre(id, { erreur: messageErreur(e, "Impossible de lire l'éditeur.") });
    }
    return;
  }

  if (o.op === "montrer") {
    const debut = entierOuNull(o.ligne_debut);
    const fin = entierOuNull(o.ligne_fin) ?? debut;
    if (debut === null || fin === null) {
      repondre(id, { erreur: "Numéros de lignes invalides." });
      return;
    }
    const description = `Montre ${decrireLignes(debut, fin)} de l'éditeur`;
    const idJournal = pousserJournalDepuisAgent(description);
    afficherTexteDepuisAgent(description);
    try {
      const ligne = await pont.montrer(debut, fin);
      if (ligne) await deplacerCurseurDepuisAgent(ligne, { cliquer: false, forme: "main" });
      if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "succes");
      repondre(id, { succes: true });
    } catch (e) {
      if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "erreur");
      repondre(id, { erreur: messageErreur(e, "Impossible de montrer ces lignes.") });
    }
    return;
  }

  if (o.op === "ecrire") {
    const mode = o.mode;
    if (mode !== "tout" && mode !== "lignes" && mode !== "apres_ligne") {
      repondre(id, { erreur: "Mode d'écriture invalide." });
      return;
    }
    if (typeof o.texte !== "string") {
      repondre(id, { erreur: "Texte à écrire manquant." });
      return;
    }
    const debut = entierOuNull(o.ligne_debut);
    const fin = entierOuNull(o.ligne_fin);
    const cible =
      mode === "tout"
        ? "tout le code"
        : mode === "lignes" && debut !== null
          ? decrireLignes(debut, fin ?? debut)
          : debut !== null
            ? `après la ligne ${debut}`
            : "le code";
    const description = `Écrit dans l'éditeur : ${cible}`;
    const idJournal = pousserJournalDepuisAgent(description);
    afficherTexteDepuisAgent(description);
    try {
      const { nbLignes } = await pont.ecrire({ mode: mode as ModeEcritureEditeur, texte: o.texte, ligneDebut: debut, ligneFin: fin });
      if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "succes");
      repondre(id, { succes: true, nb_lignes: nbLignes });
    } catch (e) {
      if (idJournal) mettreAJourJournalDepuisAgent(idJournal, "erreur");
      repondre(id, { erreur: messageErreur(e, "Impossible d'écrire dans l'éditeur.") });
    }
    return;
  }

  repondre(id, { erreur: "Opération sur l'éditeur inconnue." });
}
