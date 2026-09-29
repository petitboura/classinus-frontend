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

    const pont = {
      etat,
      lire: () => {
        const p = parametresRef.current;
        return {
          ...etat(),
          code: lireCodeEditeur(vueActive()),
          derniere_execution: { lignes: p.lignesSortie.map((l) => l.texte), erreur: p.erreurExecution },
        };
      },
      ecrire: (operation: Parameters<typeof ecrireDansEditeurCode>[1]) => ecrireDansEditeurCode(vueActive(), operation),
      montrer: (debut: number, fin: number) => montrerLignesEditeur(vueActive(), debut, fin),
    };

    const pontRefLocal = { current: pont };
    // Le pont est enregistré quand CodeMirror fournit réellement sa vue.
    // Cela évite une fenêtre où le registre global existe mais ne possède
    // encore aucune vue d'éditeur, et évite aussi qu'un cleanup de React
    // efface le pont d'une instance remontée entre-temps.
    const surCreation = (vue: EditorView) => {
      vueRef.current = vue;
      enregistrerPontEditeur(pont);
    };

    (surCreation as ((vue: EditorView) => void) & { __pont?: typeof pont }).__pont = pont;

    return () => {
      if (vueRef.current?.dom.isConnected === false) vueRef.current = null;
      // Ne retire le pont que s'il s'agit toujours de celui monté par cette
      // instance. Une autre instance ne doit jamais être effacée par ce cleanup.
      // Le registre expose uniquement la valeur courante, donc on compare
      // par référence avant de nettoyer.
      // @ts-expect-error accès interne évité : le test est réalisé via obtenirPontEditeur.
      if ((globalThis as any).__pontEditeurAgent?.pont === pont) enregistrerPontEditeur(null);
    };
  }, []);

  useEffect(() => {
    signalerChangementEtatEditeur();
  }, [parametres.langage, parametres.nomFichier, parametres.pleinEcran]);

  return useCallback((vue: EditorView) => {
    vueRef.current = vue;
  }, []);
}
