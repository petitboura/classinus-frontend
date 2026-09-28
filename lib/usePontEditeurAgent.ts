"use client";

import { useCallback, useEffect, useRef } from "react";
import type { EditorView } from "@uiw/react-codemirror";
import { ecrireDansEditeurCode, lireCodeEditeur, montrerLignesEditeur } from "./operationsEditeurAgent";
import { enregistrerPontEditeur, signalerChangementEtatEditeur } from "./pontEditeurAgent";
import type { LigneSortie } from "./useExecutionPython";

type ParametresPont = {
  langage: string;
  nomFichier: string | null;
  pleinEcran: boolean;
  lignesSortie: LigneSortie[];
  erreurExecution: string | null;
};

// Editeur de code piloté par l'IA (28/09/2026, demande Bourama) : branche
// l'éditeur monté sur le registre lib/pontEditeurAgent.ts. Renvoie le
// rappel à donner à onCreateEditor de CodeMirror. Passer en plein écran
// remonte l'éditeur : la vue est donc relue à chaque opération, jamais
// gardée en dehors de la référence courante.
export function usePontEditeurAgent(parametres: ParametresPont): (vue: EditorView) => void {
  const vueRef = useRef<EditorView | null>(null);
  const parametresRef = useRef(parametres);

  useEffect(() => {
    parametresRef.current = parametres;
  });

  useEffect(() => {
    function vueActive(): EditorView {
      const vue = vueRef.current;
      if (!vue || !vue.dom.isConnected) throw new Error("L'éditeur n'est pas affiché pour le moment.");
      return vue;
    }

    function etat() {
      const p = parametresRef.current;
      return { langage: p.langage, nom_fichier: p.nomFichier, plein_ecran: p.pleinEcran };
    }

    enregistrerPontEditeur({
      etat,
      lire: () => {
        const p = parametresRef.current;
        return {
          ...etat(),
          code: lireCodeEditeur(vueActive()),
          derniere_execution: { lignes: p.lignesSortie.map((l) => l.texte), erreur: p.erreurExecution },
        };
      },
      ecrire: (operation) => ecrireDansEditeurCode(vueActive(), operation),
      montrer: (debut, fin) => montrerLignesEditeur(vueActive(), debut, fin),
    });
    return () => enregistrerPontEditeur(null);
  }, []);

  useEffect(() => {
    signalerChangementEtatEditeur();
  }, [parametres.langage, parametres.nomFichier, parametres.pleinEcran]);

  return useCallback((vue: EditorView) => {
    vueRef.current = vue;
  }, []);
}
