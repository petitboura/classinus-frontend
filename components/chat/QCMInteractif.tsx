"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { enregistrerReponseQCM } from "@/lib/api";

// Rend un bloc ```qcm du markdown -- même famille que ```chart
// (GraphiqueDonnees.tsx), ```carte (CarteMessage.tsx) et ```geometrie
// (SchemaGeometrique.tsx). Ajouté le 12/09/2026 (demande Bourama, volet
// étudiant ScholarFlow AI, item 3 des specs indépendantes) : un QCM lisible
// mais non cliquable ne suffit pas, il faut pouvoir sélectionner une
// réponse et voir la correction s'afficher directement dans le fil.
//
// Schéma JSON attendu :
//   {
//     "question": string,
//     "choix": string[],       // au moins 2 options
//     "reponse": number,       // index (0-based) de la bonne réponse dans "choix"
//     "explication"?: string,  // affichée après la réponse, quel que soit le choix
//   }
//
// JONCTION "QCM COMPLET" BRANCHÉE (14/09/2026, voir specs-independantes.md) :
// la réponse choisie est envoyée à POST /api/conversations/{id}/reponses-qcm
// (core/historique_reponses_qcm.py, item 2) dès la sélection. Appel best-effort
// et délibérément ignoré (pas de useState d'erreur dédié, pas de retry) :
// la correction ci-dessous s'affiche depuis l'état local, indépendamment du
// réseau -- un échec d'historisation ne doit jamais dégrader l'expérience de
// l'étudiant ni bloquer l'affichage de la correction. Sans conversationId
// (ex. aperçu hors conversation), l'appel est simplement sauté.
//
// Pas de mécanisme i18n branché sur ce projet à ce jour (voir même constat
// dans ParametresAccueil.tsx) : textes fixes en français, comme le reste de
// l'app.

type QCM = {
  question: string;
  choix: string[];
  reponse: number;
  explication?: string;
};

export function QCMInteractif({ code, conversationId }: { code: string; conversationId?: string }) {
  const [qcm, setQcm] = useState<QCM | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choixSelectionne, setChoixSelectionne] = useState<number | null>(null);

  // Même principe que CarteMessage.tsx/GraphiqueDonnees.tsx/
  // SchemaGeometrique.tsx : on attend que le texte arrête de changer
  // pendant 500ms avant de tenter le parsing, pour ne pas confondre un
  // JSON encore incomplet (streaming en cours) avec un JSON réellement
  // cassé.
  //
  // 23/09/2026, correctif Bourama ("la réponse cochée disparaît") : la
  // sélection de l'étudiant n'est remise à zéro que si la QUESTION
  // affichée change réellement (nouveau QCM généré dans le même
  // message), pas à chaque fois que le texte brut du bloc bouge un peu.
  // Avant ce correctif, un `useEffect` séparé remettait la sélection à
  // zéro sur tout changement de `code`, y compris une reformulation
  // strictement identique renvoyée par une réinterprétation du markdown
  // pendant que le reste du message continue de streamer -- ce qui
  // effaçait la réponse de l'étudiant même longtemps après qu'il ait
  // répondu.
  const questionPrecedenteRef = useRef<string | null>(null);
  useEffect(() => {
    const delai = setTimeout(() => {
      try {
        const valeur = JSON.parse(code);
        if (questionPrecedenteRef.current !== null && questionPrecedenteRef.current !== valeur.question) {
          setChoixSelectionne(null);
        }
        questionPrecedenteRef.current = valeur.question;
        setQcm(valeur);
        setErreur(null);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
      }
    }, 500);
    return () => clearTimeout(delai);
  }, [code]);

  if (!qcm) {
    if (erreur) {
      return (
        <div className="my-3 flex h-20 items-center gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 text-xs text-dj-texte-muet">
          <span className="text-[var(--dj-erreur)]">QCM invalide :</span> format JSON non reconnu.
        </div>
      );
    }
    return (
      <div className="my-3 flex h-20 items-center gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 text-xs text-dj-texte-muet">
        <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-texte-muet" />
        Préparation de l'exercice...
      </div>
    );
  }

  if (!Array.isArray(qcm.choix) || qcm.choix.length < 2 || typeof qcm.reponse !== "number") {
    return (
      <div className="my-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
        QCM incomplet : au moins deux choix et une réponse sont nécessaires.
      </div>
    );
  }

  const aRepondu = choixSelectionne !== null;

  function repondre(index: number) {
    setChoixSelectionne(index);
    if (!conversationId || !qcm) return;
    // Best-effort, résultat ignoré (voir commentaire d'en-tête) -- ne
    // doit jamais bloquer ni retarder l'affichage de la correction,
    // déjà géré ci-dessus via l'état local choixSelectionne.
    enregistrerReponseQCM(conversationId, {
      question: qcm.question,
      choix: qcm.choix,
      reponse_choisie: index,
      reponse_correcte: qcm.reponse,
      explication: qcm.explication ?? null,
    }).catch(() => {});
  }

  return (
    <div className="my-3 animate-dj-fade-in rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <p className="text-sm font-semibold text-dj-texte">{qcm.question}</p>

      <div className="mt-3 flex flex-col gap-2">
        {qcm.choix.map((option, index) => {
          const estLaBonneReponse = index === qcm.reponse;
          const estSelectionne = index === choixSelectionne;

          let classesEtat = "border-dj-bordure bg-dj-surface-haute hover:border-dj-bordure-forte";
          if (aRepondu) {
            if (estLaBonneReponse) {
              classesEtat = "border-dj-succes bg-dj-succes/10";
            } else if (estSelectionne) {
              classesEtat = "border-[var(--dj-erreur)] bg-[var(--dj-erreur)]/10";
            } else {
              classesEtat = "border-dj-bordure bg-dj-surface-haute opacity-60";
            }
          }

          return (
            <button
              key={index}
              type="button"
              disabled={aRepondu}
              onClick={() => repondre(index)}
              aria-pressed={estSelectionne}
              className={`flex items-center justify-between gap-2 rounded-cgpt-carte border px-3 py-2 text-left text-sm text-dj-texte transition-colors ${classesEtat} ${
                aRepondu ? "cursor-default" : "cursor-pointer"
              }`}
            >
              <span>{option}</span>
              {aRepondu && estLaBonneReponse && (
                <CheckCircle2 size={16} className="shrink-0 text-dj-succes" />
              )}
              {aRepondu && estSelectionne && !estLaBonneReponse && (
                <XCircle size={16} className="shrink-0 text-[var(--dj-erreur)]" />
              )}
            </button>
          );
        })}
      </div>

      {aRepondu && qcm.explication && (
        <div className="mt-3 animate-dj-fade-in-rapide rounded-cgpt-carte bg-dj-surface-haute p-3 text-xs text-dj-texte-muet">
          {qcm.explication}
        </div>
      )}
    </div>
  );
}
