"use client";

// Crayon du canal PC, lot 4 (11/10/2026, demande Bourama) : envoie au grand modèle ce que
// l'étudiant a entouré. Lit la fenêtre au premier plan (lib/lectureEntoureCrayon.ts),
// compose la phrase (lib/phraseCrayon.ts) puis la fait partir par le même chemin que
// n'importe quel message de l'étudiant dans le canal (aucun changement côté serveur).
// Si rien n'est lisible, Classinus le dit dans sa bulle.

import { envoyerMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { afficherTexteDepuisAgent } from "@/lib/contexteCanalEnDirect";
import { lireCeQuiEstEntoure } from "@/lib/lectureEntoureCrayon";
import { composerPhraseCrayon } from "@/lib/phraseCrayon";
import { estDansFenetreSuperposition, relayerAffichageTexteBulle } from "@/lib/superpositionElectron";

/** Vrai si un message est parti. */
export async function envoyerCeQuiEstEntoure(question: string): Promise<boolean> {
  const phrase = composerPhraseCrayon(await lireCeQuiEstEntoure(), question);
  if (!phrase) return false;
  if (phrase.messageBulle) {
    // La bulle vit dans la fenêtre principale : depuis la superposition, on relaie.
    if (estDansFenetreSuperposition()) relayerAffichageTexteBulle(phrase.messageBulle);
    else afficherTexteDepuisAgent(phrase.messageBulle, { commentaire: true });
  }
  envoyerMessageEtudiant(phrase.message);
  return true;
}
