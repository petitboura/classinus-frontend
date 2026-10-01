"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ouvrirGeminiLive, type SessionGeminiLive } from "./geminiLive";

type EtatLive = "inactif" | "connexion" | "connecte" | "ecoute" | "reponse" | "erreur";

export function useGeminiLive(conversationId: string | null) {
  const sessionRef = useRef<SessionGeminiLive | null>(null);
  const [etat, setEtat] = useState<EtatLive>("inactif");
  const [erreur, setErreur] = useState<string | null>(null);

  const fermer = useCallback(() => {
    sessionRef.current?.fermer();
    sessionRef.current = null;
    setEtat("inactif");
  }, []);

  const ouvrir = useCallback(async () => {
    if (sessionRef.current || !conversationId) return;
    setErreur(null);
    try {
      const session = await ouvrirGeminiLive({
        conversationId,
        surEtat: (nouvelEtat) => {
          if (nouvelEtat === "ferme") { sessionRef.current = null; setEtat("inactif"); }
          else setEtat(nouvelEtat === "connexion" ? "connexion" : nouvelEtat);
        },
        surErreur: setErreur,
      });
      sessionRef.current = session;
    } catch (e) {
      setEtat("erreur");
      setErreur(e instanceof Error ? e.message : "Impossible d ouvrir le canal vocal.");
    }
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) fermer();
  }, [conversationId, fermer]);

  const basculer = useCallback(() => {
    if (sessionRef.current) fermer();
    else void ouvrir();
  }, [fermer, ouvrir]);

  useEffect(() => () => { sessionRef.current?.fermer(); }, []);

  return { actif: sessionRef.current !== null, etat, erreur, ouvrir, fermer, basculer };
}