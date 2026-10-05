"use client";

import { useEffect, useRef, useState } from "react";
import type { MessageAffiche, LigneHistorique } from "@/components/chat/BulleMessage";
import { appelerApi } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// Bug signalé le 04/10/2026 : la conversation en cours ne résistait pas à un
// rechargement de page. Au démarrage, la clé de conversation (cle, voir
// lib/contexteChat.tsx) est un identifiant tiré au hasard : l'appli repartait
// donc toujours sur une conversation vide, alors que la conversation existait
// bien côté serveur.
//
// Correctif : on retient l'identifiant de la conversation affichée dans
// sessionStorage (vit le temps de l'onglet, survit au rechargement, ne reste
// pas après fermeture : même choix que le cache de lib/reactQuery.tsx, une
// nouvelle visite repart sur une conversation vide comme avant). Au démarrage,
// une fois l'agent chargé, on recharge ses messages depuis le serveur, avec le
// même appel que le clic sur une conversation de l'historique.

const CLE_STOCKAGE = "classinus.conversationEnCours.v1";

type Memoire = { uid: string; conversationId: string };

function lireMemoire(uid: string): string | null {
  try {
    const brut = window.sessionStorage.getItem(CLE_STOCKAGE);
    if (!brut) return null;
    const m = JSON.parse(brut) as Memoire;
    return m.uid === uid && typeof m.conversationId === "string" && m.conversationId ? m.conversationId : null;
  } catch {
    return null;
  }
}

function ecrireMemoire(uid: string, conversationId: string) {
  try {
    window.sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify({ uid, conversationId } satisfies Memoire));
  } catch {
    // Stockage plein ou indisponible : la mémorisation est facultative.
  }
}

function effacerMemoire() {
  try {
    window.sessionStorage.removeItem(CLE_STOCKAGE);
  } catch {
    // Rien à faire.
  }
}

type Parametres = {
  agentId: string | null;
  chargement: "chargement" | "pret" | "erreur";
  cle: string;
  nbMessages: number;
  // Vrai dès qu'une autre demande d'ouverture (guide, brouillon, conversation
  // choisie ailleurs) est en cours : elle garde alors la priorité.
  demandeEnCours: boolean;
  setCle: (v: string) => void;
  setMessagesInitiaux: (v: MessageAffiche[]) => void;
  setNbMessages: (v: number) => void;
  setChargementFilConversation: (v: boolean) => void;
};

export function useConversationEnCoursMemorisee(p: Parametres) {
  const cleDepart = useRef(p.cle);
  const dernier = useRef(p);
  dernier.current = p;

  // Identifiant trouvé en mémoire au démarrage (null : rien à restaurer).
  const [aRestaurer, setARestaurer] = useState<string | null>(null);
  // Faux tant que la restauration n'est pas finie : on n'écrit rien avant,
  // sinon la conversation vide du démarrage effacerait la mémoire.
  const [ecritureAutorisee, setEcritureAutorisee] = useState(false);
  const restaurationLancee = useRef(false);

  // Phase 1, dès le montage : y a-t-il une conversation retenue pour cette
  // personne ? Si oui, le voile de chargement de la page de chat s'affiche
  // tout de suite, sans flash de conversation vide.
  useEffect(() => {
    let annule = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (annule) return;
        const uid = data.session?.user.id ?? null;
        const id = uid ? lireMemoire(uid) : null;
        if (id && !dernier.current.demandeEnCours) {
          dernier.current.setChargementFilConversation(true);
          setARestaurer(id);
        } else {
          setEcritureAutorisee(true);
        }
      })
      .catch(() => {
        if (!annule) setEcritureAutorisee(true);
      });
    return () => {
      annule = true;
    };
  }, []);

  // Phase 2, dès que l'agent est chargé : rechargement des messages.
  useEffect(() => {
    if (!aRestaurer || restaurationLancee.current) return;
    if (p.chargement === "erreur") {
      restaurationLancee.current = true;
      p.setChargementFilConversation(false);
      setEcritureAutorisee(true);
      return;
    }
    if (!p.agentId) return;
    restaurationLancee.current = true;
    const agentId = p.agentId;

    // Quelqu'un a déjà pris la main (message envoyé, autre conversation
    // ouverte, guide lancé) : on ne touche à rien.
    const quelquunAPrisLaMain = () =>
      dernier.current.demandeEnCours ||
      dernier.current.cle !== cleDepart.current ||
      dernier.current.nbMessages > 0;

    (async () => {
      try {
        if (quelquunAPrisLaMain()) return;
        const lignes: LigneHistorique[] = await appelerApi(`/api/historique/${agentId}/conversations/${aRestaurer}`);
        if (quelquunAPrisLaMain()) return;
        if (!Array.isArray(lignes) || lignes.length === 0) {
          // La conversation n'existe plus côté serveur : on l'oublie.
          effacerMemoire();
          return;
        }
        // Chargé à la demande pour ne pas alourdir le démarrage de l'appli.
        const { construireMessagesDepuisHistorique } = await import("@/components/chat/BulleMessage");
        if (quelquunAPrisLaMain()) return;
        dernier.current.setCle(aRestaurer);
        dernier.current.setMessagesInitiaux(construireMessagesDepuisHistorique(lignes));
        dernier.current.setNbMessages(lignes.length);
      } catch {
        // Échec réseau : on garde la conversation vide, la mémoire reste
        // intacte pour un prochain rechargement.
      } finally {
        dernier.current.setChargementFilConversation(false);
        setEcritureAutorisee(true);
      }
    })();
  }, [aRestaurer, p.agentId, p.chargement]);

  // Mémorisation au fil de l'eau : une conversation qui contient des
  // messages est retenue ; une conversation vide (nouvelle conversation,
  // changement de compte) efface la mémoire.
  useEffect(() => {
    if (!ecritureAutorisee) return;
    let annule = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (annule) return;
        const uid = data.session?.user.id ?? null;
        if (uid && p.nbMessages > 0) ecrireMemoire(uid, p.cle);
        else effacerMemoire();
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [ecritureAutorisee, p.cle, p.nbMessages]);
}
