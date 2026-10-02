"use client";

import { useEffect, useState } from "react";
import {
  listerMesRattachementsCodes,
  obtenirModeActif,
  definirModeActif,
  obtenirMonStatut,
  type RattachementCode,
} from "@/lib/api";

/**
 * Code enseignant actif sur une conversation (Partie 6, plan confiance
 * pédagogique, 06/09/2026). Un utilisateur peut avoir plusieurs codes
 * rattachés en même temps (voir EspaceEntrerCode) : il choisit librement
 * lequel s'applique à la conversation en cours. Ce hook portait auparavant le
 * composant SelecteurModeActif, déplacé le 01/10/2026 dans la ligne "Code
 * enseignant" du bouton Réglages (BoutonReglages.tsx). Toute la logique est
 * conservée telle quelle, appelée une seule fois par BarreDeSaisie.
 *
 * Partie 7 (06/09) : pour un mineur (profiles.est_majeur = false
 * explicitement) :
 * - un seul rattachement : appliqué automatiquement, rien à choisir ;
 * - plusieurs rattachements et aucun mode choisi : même liste que pour un
 *   majeur, mais le premier choix devient définitif pour cette conversation
 *   (voir `verrouille`, renvoyé par le backend) ;
 * - aucun rattachement : accès bloqué (voir `onAccesBloqueChange`, pour que
 *   ChatIA désactive la barre de saisie) plutôt que l'erreur technique que
 *   renverrait sinon l'envoi d'un message. Le serveur bloque aussi
 *   (api/chat.py).
 *
 * 11/09/2026 (majeurs uniquement) : une vraie option "Aucun mode" est
 * proposée en plus des rattachements. Choisie, Classinus redevient pour cette
 * conversation exactement comme sans code (voir
 * core/mode_actif_conversation.py::MODE_DESACTIVE côté backend). Non proposée
 * aux mineurs.
 *
 * 25/09/2026 : `eleveChoisitMode` reprend le réglage eleve_choisit_mode du
 * code actif (true par défaut : aucun code actif, ou réglage non décoché).
 * Décoché par l'enseignant, la ligne "Mode pédagogique" disparaît du bouton
 * Réglages. Il se calcule désormais ici, plus besoin de le remonter via un
 * callback.
 */
export function useModeActif(
  conversationId: string | undefined,
  onAccesBloqueChange?: (bloque: boolean) => void
) {
  const [rattachements, setRattachements] = useState<RattachementCode[]>([]);
  const [modeActifId, setModeActifId] = useState<string | null>(null);
  // true si un choix explicite existe déjà pour cette conversation (y compris
  // "Aucun mode"), pour distinguer ça de "rien choisi encore" : les deux ont
  // modeActifId === null (11/09/2026).
  const [choisi, setChoisi] = useState(false);
  const [verrouille, setVerrouille] = useState(false);
  const [mineur, setMineur] = useState(false);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    if (!conversationId) {
      setChargement(false);
      return;
    }
    let annule = false;
    setChargement(true);
    Promise.all([listerMesRattachementsCodes(), obtenirModeActif(conversationId), obtenirMonStatut()])
      .then(async ([rat, mode, statut]) => {
        if (annule) return;
        const estMineur = statut.est_majeur === false;
        setMineur(estMineur);
        setRattachements(rat);
        setVerrouille(mode.verrouille);

        // Mineur avec un seul rattachement et aucun mode encore choisi pour
        // cette conversation : rien à décider, on l'applique.
        if (estMineur && rat.length === 1 && !mode.rattachement_id) {
          setModeActifId(rat[0].rattachement_id);
          setChoisi(true);
          setVerrouille(true);
          try {
            await definirModeActif(conversationId, rat[0].rattachement_id);
          } catch {
            // Échec silencieux (même convention que choisir() plus bas) : le
            // blocage serveur (api/chat.py) reste le filet de sécurité réel.
          }
        } else {
          setModeActifId(mode.rattachement_id);
          setChoisi(mode.choisi);
        }

        onAccesBloqueChange?.(estMineur && rat.length === 0);
      })
      .catch(() => {
        // Silencieux : l'absence de ce réglage ne doit jamais bloquer la
        // conversation elle-même. Le blocage réel pour un mineur sans code
        // reste appliqué côté serveur (api/chat.py) même si ce chargement
        // échoue.
      })
      .finally(() => !annule && setChargement(false));
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function choisir(rattachementId: string | null) {
    if (!conversationId || verrouille) return;
    // "déjà cet état" doit aussi couvrir "Aucun mode" explicitement choisi
    // (rattachementId === null ET modeActifId === null) séparément de "rien
    // choisi encore" (mêmes valeurs mais choisi === false), sinon cliquer sur
    // "Aucun mode" avant tout choix ne ferait jamais rien.
    if (rattachementId === modeActifId && (rattachementId !== null || choisi)) return;
    setEnCours(true);
    const precedent = modeActifId;
    const precedentChoisi = choisi;
    setModeActifId(rattachementId); // optimiste, transition immédiate
    setChoisi(true);
    try {
      await definirModeActif(conversationId, rattachementId);
      if (mineur) setVerrouille(true);
    } catch {
      setModeActifId(precedent); // échec silencieux, reprend l'affichage précédent
      setChoisi(precedentChoisi);
    } finally {
      setEnCours(false);
    }
  }

  const actif = rattachements.find((r) => r.rattachement_id === modeActifId) ?? null;
  const eleveChoisitMode = actif ? actif.eleve_choisit_mode !== false : true;
  const accesBloque = !chargement && mineur && rattachements.length === 0;

  return {
    rattachements,
    modeActifId,
    choisi,
    verrouille,
    mineur,
    chargement,
    enCours,
    choisir,
    eleveChoisitMode,
    accesBloque,
  };
}

export type EtatModeActif = ReturnType<typeof useModeActif>;
