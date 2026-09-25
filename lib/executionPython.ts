"use client";

// Exécution de code Python du chat (bouton Exécuter de BlocCode.tsx).
// Le code tourne dans un Worker (public/pyodide-worker.mjs), sur l'appareil
// de l'étudiant. Ce fichier gère le worker : un seul à la fois, les
// exécutions se mettent en file, et un code trop long est coupé net.

export type EtatExecution =
  | "inactif"
  | "attente"
  | "chargement"
  | "paquets"
  | "execution"
  | "termine"
  | "erreur"
  | "interrompu";

export type RappelsExecution = {
  surStatut: (etat: EtatExecution) => void;
  surSortie: (flux: "stdout" | "stderr", texte: string) => void;
  surImage: (base64Png: string) => void;
  surErreur: (texte: string) => void;
};

// Durée maximale d'un code, chargement de Python et des bibliothèques exclus.
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
 * Lance un code Python. Renvoie une fonction pour l'interrompre. Les
 * rappels reçoivent l'état, la sortie, les images et l'erreur au fil de
 * l'exécution.
 */
export function lancerPython(code: string, rappels: RappelsExecution): () => void {
  let interrompu = false;
  const suivi: { terminer: (() => void) | null } = { terminer: null };

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
        w.postMessage({ id, code });
      })
  );
  fileAttente = execution;

  return () => {
    interrompu = true;
    if (suivi.terminer) suivi.terminer();
    else rappels.surStatut("interrompu");
  };
}
