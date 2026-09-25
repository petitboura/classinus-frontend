"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jspiDisponible, lancerPython, type ControleExecution, type EtatExecution } from "./executionPython";

export type LigneSortie = { flux: "stdout" | "stderr"; texte: string };

// Détecte les appels input(...) du code, dans l'ordre, avec leur texte
// d'invite s'il est écrit en dur (24/09/2026). Ne comprend que les appels
// simples avec un texte entre guillemets ; une invite construite (variable,
// f-string avec une variable...) reçoit une étiquette générique -- ça reste
// suffisant pour demander les valeurs à l'avance sur un téléphone qui ne
// sait pas mettre le code en pause (voir lancerPython/jspiDisponible).
function detecterInvitesInput(code: string): string[] {
  const invites: string[] = [];
  const motif = /\binput\s*\(\s*(?:f?(['"])((?:\\.|(?!\1).)*)\1\s*)?\)/g;
  let correspondance: RegExpExecArray | null;
  while ((correspondance = motif.exec(code))) {
    invites.push(correspondance[2] ? correspondance[2].trim() : `Valeur ${invites.length + 1}`);
  }
  return invites;
}

// Etat d'une exécution Python pour un bloc de code du chat. Chaque bloc a
// sa propre sortie ; le worker, lui, est partagé (voir executionPython.ts).
export function useExecutionPython(code: string) {
  const [etat, setEtat] = useState<EtatExecution>("inactif");
  const [lignes, setLignes] = useState<LigneSortie[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [inviteSaisie, setInviteSaisie] = useState<string | null>(null);
  // Non nul pendant la phase "avant" (téléphone incapable de mettre le code
  // en pause) : les invites détectées, en attente des réponses de l'étudiant.
  const [invitesPrealables, setInvitesPrealables] = useState<string[] | null>(null);
  const controleRef = useRef<ControleExecution | null>(null);

  // Quitter la page pendant un calcul : on coupe, plutôt que de laisser
  // tourner un code que plus personne ne regarde.
  useEffect(() => () => controleRef.current?.arreter(), []);

  const demarrer = useCallback(
    (entreesPrealables: string[]) => {
      setLignes([]);
      setImages([]);
      setErreur(null);
      setInviteSaisie(null);
      const interactif = jspiDisponible && entreesPrealables.length === 0 && /\binput\s*\(/.test(code);
      controleRef.current = lancerPython(code, { interactif, entreesPrealables }, {
        surStatut: setEtat,
        surSortie: (flux, texte) => setLignes((precedentes) => [...precedentes, { flux, texte }]),
        surImage: (base64) => setImages((precedentes) => [...precedentes, base64]),
        surErreur: setErreur,
        surSaisieDemandee: setInviteSaisie,
      });
    },
    [code]
  );

  const executer = useCallback(() => {
    controleRef.current?.arreter();
    setInvitesPrealables(null);
    if (!jspiDisponible) {
      const invites = detecterInvitesInput(code);
      if (invites.length > 0) {
        setEtat("inactif");
        setInvitesPrealables(invites);
        return;
      }
    }
    demarrer([]);
  }, [code, demarrer]);

  // Appelé une fois que l'étudiant a rempli le petit formulaire de valeurs
  // (téléphone incapable de mettre le code en pause).
  const lancerAvecValeursPrealables = useCallback(
    (valeurs: string[]) => {
      setInvitesPrealables(null);
      demarrer(valeurs);
    },
    [demarrer]
  );

  const annulerValeursPrealables = useCallback(() => setInvitesPrealables(null), []);

  // Réponse de l'étudiant à un input() qui a mis le code en pause.
  const repondreSaisie = useCallback((valeur: string) => {
    setInviteSaisie(null);
    controleRef.current?.repondre(valeur);
  }, []);

  const arreter = useCallback(() => controleRef.current?.arreter(), []);

  const effacer = useCallback(() => {
    controleRef.current?.arreter();
    controleRef.current = null;
    setEtat("inactif");
    setLignes([]);
    setImages([]);
    setErreur(null);
    setInviteSaisie(null);
    setInvitesPrealables(null);
  }, []);

  const enCours =
    etat === "attente" || etat === "chargement" || etat === "paquets" || etat === "execution" || etat === "attente_saisie";

  return {
    etat,
    lignes,
    images,
    erreur,
    inviteSaisie,
    invitesPrealables,
    enCours,
    executer,
    lancerAvecValeursPrealables,
    annulerValeursPrealables,
    repondreSaisie,
    arreter,
    effacer,
  };
}
