"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lancerPython, type EtatExecution } from "./executionPython";

export type LigneSortie = { flux: "stdout" | "stderr"; texte: string };

// Etat d'une exécution Python pour un bloc de code du chat. Chaque bloc a
// sa propre sortie ; le worker, lui, est partagé (voir executionPython.ts).
export function useExecutionPython(code: string) {
  const [etat, setEtat] = useState<EtatExecution>("inactif");
  const [lignes, setLignes] = useState<LigneSortie[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const arreterRef = useRef<(() => void) | null>(null);

  // Quitter la page pendant un calcul : on coupe, plutôt que de laisser
  // tourner un code que plus personne ne regarde.
  useEffect(() => () => arreterRef.current?.(), []);

  const executer = useCallback(() => {
    arreterRef.current?.();
    setLignes([]);
    setImages([]);
    setErreur(null);
    arreterRef.current = lancerPython(code, {
      surStatut: setEtat,
      surSortie: (flux, texte) => setLignes((precedentes) => [...precedentes, { flux, texte }]),
      surImage: (base64) => setImages((precedentes) => [...precedentes, base64]),
      surErreur: setErreur,
    });
  }, [code]);

  const arreter = useCallback(() => arreterRef.current?.(), []);

  const effacer = useCallback(() => {
    arreterRef.current?.();
    arreterRef.current = null;
    setEtat("inactif");
    setLignes([]);
    setImages([]);
    setErreur(null);
  }, []);

  const enCours = etat === "attente" || etat === "chargement" || etat === "paquets" || etat === "execution";

  return { etat, lignes, images, erreur, enCours, executer, arreter, effacer };
}
