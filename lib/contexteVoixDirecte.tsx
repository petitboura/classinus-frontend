"use client";

// Créé le 02/10/2026, Bourama : voix en direct (Gemini Live). Pièce partagée,
// montée une seule fois dans AppShell, comme le canal en direct. Avant, la
// voix vivait dans la barre de saisie du chat et ne pouvait servir qu'à elle.
// Ici, une seule session de voix existe pour toute l'appli : le chat s'en sert
// aujourd'hui, le canal en direct pourra s'en servir demain sans en créer une
// deuxième, ce qui garantit qu'on n'entend jamais deux voix à la fois.
//
// La voix est un interprète, jamais le but final : elle transmet la demande de
// l'étudiant à Clovis par le chat (la question et la réponse s'affichent en
// direct dans la conversation), puis résume la réponse à voix haute. Sans chat
// ouvert pour la recevoir, elle garde le chemin direct vers le serveur, pour
// ne jamais rester bloquée.
//
// Une seule voix à la fois : le bouton du chat (Mode vocal) et le bouton du
// canal en direct pilotent la MÊME session. Si l'un l'a allumée, l'autre la
// voit allumée et peut l'éteindre, mais aucun ne peut en lancer une deuxième.

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demanderAClovisDirectement, ouvrirGeminiLive, type SessionGeminiLive } from "./geminiLive";

export type EtatVoixDirecte = "inactif" | "connexion" | "connecte" | "ecoute" | "reponse" | "erreur";

export type ContexteVoixDirecteValeur = {
  etat: EtatVoixDirecte;
  actif: boolean;
  erreur: string | null;
  ouvrir: (conversationId: string) => Promise<void>;
  fermer: () => void;
  // Ferme la voix seulement si elle est liée à cette conversation (un écran
  // qui se ferme ne doit pas couper la voix d'une autre conversation).
  fermerPourConversation: (conversationId: string | null) => void;
  basculer: (conversationId: string | null) => void;
};

export const ContexteVoixDirecte = createContext<ContexteVoixDirecteValeur | null>(null);

// Ce dont la voix a besoin du chat. Passé en argument (et non lu par
// useContext) parce que ce hook tourne dans AppShell, au dessus des Providers
// qu'il alimente.
type DependancesVoix = {
  chatPretPourVoix: (conversationId: string) => boolean;
  deposerDemandeVoix: (texte: string, conversationId: string) => Promise<string>;
};

export function useFournirVoixDirecte(dependances: DependancesVoix): ContexteVoixDirecteValeur {
  const sessionRef = useRef<SessionGeminiLive | null>(null);
  const conversationSessionRef = useRef<string | null>(null);
  const ouvertureEnCoursRef = useRef(false);
  const [etat, setEtat] = useState<EtatVoixDirecte>("inactif");
  const [erreur, setErreur] = useState<string | null>(null);

  // Les dépendances changent à chaque rendu : on les lit via un ref pour que
  // ouvrir/fermer restent stables.
  const dependancesRef = useRef(dependances);
  useEffect(() => {
    dependancesRef.current = dependances;
  }, [dependances]);

  const fermer = useCallback(() => {
    sessionRef.current?.fermer();
    sessionRef.current = null;
    conversationSessionRef.current = null;
    setEtat("inactif");
  }, []);

  const fermerPourConversation = useCallback(
    (conversationId: string | null) => {
      if (conversationId && conversationSessionRef.current === conversationId) fermer();
    },
    [fermer]
  );

  const ouvrir = useCallback(async (conversationId: string) => {
    if (sessionRef.current || ouvertureEnCoursRef.current || !conversationId) return;
    setErreur(null);
    ouvertureEnCoursRef.current = true;
    conversationSessionRef.current = conversationId;
    try {
      const session = await ouvrirGeminiLive({
        conversationId,
        surEtat: (nouvelEtat) => {
          if (nouvelEtat === "ferme") {
            sessionRef.current = null;
            conversationSessionRef.current = null;
            setEtat("inactif");
          } else {
            setEtat(nouvelEtat);
          }
        },
        surErreur: setErreur,
        surDemande: (question) =>
          dependancesRef.current.chatPretPourVoix(conversationId)
            ? dependancesRef.current.deposerDemandeVoix(question, conversationId)
            : demanderAClovisDirectement(question, conversationId),
      });
      sessionRef.current = session;
    } catch (e) {
      conversationSessionRef.current = null;
      setEtat("erreur");
      setErreur(e instanceof Error ? e.message : "Impossible d ouvrir le canal vocal.");
    } finally {
      ouvertureEnCoursRef.current = false;
    }
  }, []);

  const basculer = useCallback(
    (conversationId: string | null) => {
      if (sessionRef.current) fermer();
      else if (conversationId) void ouvrir(conversationId);
    },
    [fermer, ouvrir]
  );

  useEffect(() => () => { sessionRef.current?.fermer(); }, []);

  const actif = etat !== "inactif" && etat !== "erreur";

  return useMemo(
    () => ({ etat, actif, erreur, ouvrir, fermer, fermerPourConversation, basculer }),
    [etat, actif, erreur, ouvrir, fermer, fermerPourConversation, basculer]
  );
}
