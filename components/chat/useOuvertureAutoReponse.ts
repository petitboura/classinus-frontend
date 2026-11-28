import { useEffect, useRef } from "react";
import { ouvrirDansLecteur, useDeuxColonnes, useOuvertureAuto } from "@/lib/lecteurLateral";
import type { MessageAffiche } from "./BulleMessage";
import { premierContenuReponse } from "./premierContenuReponse";

// Ouverture automatique du lecteur (demande de Bourama, 28/11/2026) : dès qu'une
// réponse vient de se terminer, le premier fichier qu'elle contient (document, code,
// note, image, audio, vidéo) s'ouvre à droite du chat, à la place de celui déjà
// ouvert. "Terminée" veut dire que la génération est finie ET que le texte a fini
// de s'afficher : `occupe` doit rester vrai jusque-là.
//
// Ce n'est déclenché que par le passage de occupe à faux, donc seulement pour une
// réponse arrivée en direct : ouvrir une ancienne conversation ne fait rien. Pas de
// ouverture non plus pour une réponse arrêtée par la personne, ni sur téléphone ou
// fenêtre étroite (le lecteur y couvrirait toute la réponse qui vient d'arriver).
export function useOuvertureAutoReponse(occupe: boolean, messages: MessageAffiche[]) {
  const deuxColonnes = useDeuxColonnes();
  const actif = useOuvertureAuto();
  // Lus au moment de la fin de réponse, sans relancer l'effet à chaque changement.
  const etatRef = useRef({ messages, deuxColonnes, actif });
  etatRef.current = { messages, deuxColonnes, actif };
  const etaitOccupeRef = useRef(false);

  useEffect(() => {
    const etaitOccupe = etaitOccupeRef.current;
    etaitOccupeRef.current = occupe;
    if (occupe || !etaitOccupe) return;

    const { messages: liste, deuxColonnes: large, actif: reglageActif } = etatRef.current;
    if (!reglageActif || !large) return;
    const dernier = liste[liste.length - 1];
    if (!dernier || dernier.role !== "assistant" || dernier.automatique || dernier.interrompue) return;

    const contenu = premierContenuReponse(dernier.content);
    if (contenu) ouvrirDansLecteur(contenu);
  }, [occupe]);
}
