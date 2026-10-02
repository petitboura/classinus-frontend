"use client";

// Exécution de code Python du chat (bouton Exécuter de BlocCode.tsx).
// Le code tourne dans un Worker (public/pyodide-worker.mjs), sur l'appareil
// de l'étudiant. Ce fichier gère le worker : un seul à la fois, les
// exécutions se mettent en file, et un code trop long est coupé net.
//
// input() (24/09/2026, demande Bourama : pouvoir répondre pendant
// l'exécution, comme dans Thonny) : le téléphone doit savoir suspendre le
// code exactement à l'appel d'input() puis reprendre avec la réponse. Cette
// capacité (JSPI) est encore absente de certains téléphones (Safari/iOS et
// Android un peu anciens, Firefox). Détection ici une seule fois ; si le
// téléphone en est capable, `interactif` demande à input() de suspendre le
// code et d'attendre. Sinon, `executionPreparee` détecte les appels input()
// à l'avance et demande toutes les valeurs avant de lancer le code (voir
// useExecutionPython.ts) : moins fidèle à Thonny, mais fonctionne partout.
export const jspiDisponible: boolean =
  typeof WebAssembly !== "undefined" &&
  typeof WebAssembly === "object" &&
  ("Suspending" in WebAssembly || "Suspender" in WebAssembly);

export type EtatExecution =
  | "inactif"
  | "attente"
  | "chargement"
  | "paquets"
  | "execution"
  | "attente_saisie"
  | "termine"
  | "erreur"
  | "interrompu";

export type RappelsExecution = {
  surStatut: (etat: EtatExecution) => void;
  surSortie: (flux: "stdout" | "stderr", texte: string) => void;
  surImage: (base64Png: string) => void;
  surErreur: (texte: string) => void;
  // input() interactif (téléphone compatible JSPI) : le code s'est arrêté
  // sur un input(invite) et attend une réponse via la fonction repondre().
  surSaisieDemandee: (invite: string) => void;
};

export type ControleExecution = {
  /** Interrompt l'exécution en cours (ou celle en attente dans la file). */
  arreter: () => void;
  /** Répond à la demande de saisie interactive en cours (voir surSaisieDemandee). */
  repondre: (valeur: string) => void;
};

// Durée maximale d'un code, chargement de Python et des bibliothèques
// exclus, et en dehors du temps passé à attendre que l'étudiant réponde à
// un input() (ce temps-là n'est jamais limité).
export const DELAI_MAX_EXECUTION_MS = 30000;
// Au delà, la sortie est coupée et l'exécution arrêtée (boucle d'affichage infinie).
export const LIMITE_SORTIE_CARACTERES = 20000;

const URL_WORKER = "/pyodide-worker.mjs";

let worker: Worker | null = null;
let compteurExecution = 0;
let fileAttente: Promise<void> = Promise.resolve();

function obtenirWorker(): Worker {
  if (!worker) worker = new Worker(URL_WORKER, { type: "module" });
  return worker;
}

function arreterWorker() {
  worker?.terminate();
  worker = null;
}

/**
 * Lance un code Python, avec ou sans input() interactif, et avec les
 * valeurs de sys.argv (26/09/2026, bug remonté par Bourama : un script
 * qui lit sys.argv plantait direct avec IndexError, sys.argv n'était
 * jamais renseigné puisqu'il n'y a pas de vraie ligne de commande ici) :
 * - interactif=true : le code se met en pause à chaque input(), voir
 *   surSaisieDemandee et ControleExecution.repondre.
 * - interactif=false : entreesPrealables fournit d'avance les réponses
 *   qu'input() renverra dans l'ordre (file vide -> EOFError côté Python).
 * - argv : valeurs de sys.argv[1], sys.argv[2]... demandées d'avance
 *   (voir detecterArgv dans useExecutionPython.ts) -- contrairement à
 *   input(), il n'y a aucun moyen d'intercepter une lecture de
 *   sys.argv en cours de route pour mettre le code en pause, donc ces
 *   valeurs sont TOUJOURS demandées avant de lancer, même sur un
 *   téléphone compatible JSPI.
 */
export function lancerPython(
  code: string,
  options: { interactif: boolean; entreesPrealables: string[]; argv: string[] },
  rappels: RappelsExecution
): ControleExecution {
  let interrompu = false;
  const suivi: { terminer: (() => void) | null; repondreSaisie: ((valeur: string) => void) | null } = {
    terminer: null,
    repondreSaisie: null,
  };

  rappels.surStatut("attente");

  const execution = fileAttente.then(
    () =>
      new Promise<void>((resolve) => {
        if (interrompu) {
          resolve();
          return;
        }

        const id = ++compteurExecution;
        const w = obtenirWorker();
        let minuteur: ReturnType<typeof setTimeout> | null = null;
        let caracteres = 0;
        let fini = false;

        function nettoyer() {
          if (minuteur) clearTimeout(minuteur);
          w.removeEventListener("message", surMessage);
          w.removeEventListener("error", surErreurWorker);
        }

        function conclure(etat: EtatExecution, texteErreur?: string, coupure = false) {
          if (fini) return;
          fini = true;
          nettoyer();
          // Couper le worker est la seule façon d'arrêter un code qui boucle.
          if (coupure) arreterWorker();
          if (texteErreur) rappels.surErreur(texteErreur);
          rappels.surStatut(etat);
          resolve();
        }

        suivi.terminer = () => conclure("interrompu", undefined, true);
        suivi.repondreSaisie = (valeur) => {
          if (minuteur) clearTimeout(minuteur);
          minuteur = setTimeout(
            () => conclure("erreur", "Le code a tourné trop longtemps et a été arrêté.", true),
            DELAI_MAX_EXECUTION_MS
          );
          w.postMessage({ id, type: "reponse_entree", valeur });
        };

        function surMessage(evenement: MessageEvent) {
          const m = evenement.data;
          if (!m || m.id !== id) return;
          switch (m.type) {
            case "statut":
              rappels.surStatut(m.etat);
              if (m.etat === "execution") {
                minuteur = setTimeout(
                  () => conclure("erreur", "Le code a tourné trop longtemps et a été arrêté.", true),
                  DELAI_MAX_EXECUTION_MS
                );
              }
              break;
            case "sortie":
              caracteres += String(m.texte).length + 1;
              if (caracteres > LIMITE_SORTIE_CARACTERES) {
                conclure("erreur", "Trop d'affichage : le code a été arrêté.", true);
                break;
              }
              rappels.surSortie(m.flux, m.texte);
              break;
            case "image":
              rappels.surImage(m.base64);
              break;
            case "entree_demandee":
              // Le temps d'attente d'une réponse de l'étudiant n'est jamais
              // limité (voir repondreSaisie, qui relance le minuteur).
              if (minuteur) clearTimeout(minuteur);
              minuteur = null;
              rappels.surStatut("attente_saisie");
              rappels.surSaisieDemandee(String(m.invite ?? ""));
              break;
            case "fin":
              conclure("termine");
              break;
            case "erreur":
              conclure("erreur", m.texte);
              break;
            case "erreur_chargement":
              conclure("erreur", m.texte);
              break;
          }
        }

        function surErreurWorker() {
          conclure("erreur", "Python n'a pas pu démarrer sur cet appareil.", true);
        }

        w.addEventListener("message", surMessage);
        w.addEventListener("error", surErreurWorker);
        w.postMessage({
          id,
          code,
          interactif: options.interactif,
          entreesPrealables: options.entreesPrealables,
          argv: options.argv,
        });
      })
  );
  fileAttente = execution;

  return {
    arreter: () => {
      interrompu = true;
      if (suivi.terminer) suivi.terminer();
      else rappels.surStatut("interrompu");
    },
    repondre: (valeur) => suivi.repondreSaisie?.(valeur),
  };
}
