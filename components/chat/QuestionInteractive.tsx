"use client";

import { useEffect, useState } from "react";
import {
  type QuestionRiche,
  type ChampSimple,
  type ValeurChamp,
  valeurInitiale,
  valeurComplete,
  erreurStructure,
  formaterReponseChamp,
} from "@/lib/questionRiche";
import { ChampChoix } from "./ChampChoix";
import { ChampTexte } from "./ChampTexte";
import { ChampOuiNon } from "./ChampOuiNon";
import { ChampEchelle } from "./ChampEchelle";
import { ChampClassement } from "./ChampClassement";
import { ChampDate } from "./ChampDate";
import { QuestionMultiChamps } from "./QuestionMultiChamps";

// Rend un bloc ```question du markdown -- même famille que ```qcm
// (QCMInteractif.tsx) et ```fiche (FicheRevision.tsx). Ajouté le
// 15/09/2026 (demande Bourama, chantier "question riche dans le chat",
// Lot 2 des specs indépendantes -- voir specs-question-riche.md).
//
// Schéma JSON couvrant 8 types (discriminant "type", voir
// lib/questionRiche.ts pour le détail des champs par type) : choix_unique,
// choix_multiple, texte, oui_non, echelle, classement, date, multi_champs.
//
// Règle "un clic suffit" (validée par Bourama, spec) : choix_unique et
// oui_non n'ont pas de bouton Valider -- le clic envoie directement la
// réponse. Tous les autres types (y compris choix_unique une fois le
// bouton "Autre" activé, puisqu'il faut confirmer le texte libre saisi)
// ont un bouton Valider. multi_champs n'a qu'un seul Valider global, voir
// QuestionMultiChamps.tsx.
//
// PORTÉE ICI (Lot 2, frontend uniquement) : affichage + interaction pure.
// Le composant expose le résultat via la prop onReponse(texteFinal) --
// il n'envoie PAS lui-même de message et ne persiste rien. C'est le Lot 3
// qui branche cette prop sur l'envoi réel (ChatIA.tsx/envoyerMessage) et
// gère l'affichage lecture-seule au rechargement (défaut de
// QCMInteractif.tsx que ce composant ne doit pas reproduire, voir
// specs-question-riche.md). Verrouillage optimiste local uniquement
// (état interne "envoye") pour figer l'affichage dans la même session une
// fois répondu, comme QCMInteractif.tsx -- sans lien avec la persistance
// au rechargement, hors scope ici.
//
// Pas de mécanisme i18n branché sur ce projet à ce jour (même constat que
// QCMInteractif.tsx/FicheRevision.tsx) : textes fixes en français.

function EtatChargement({ texte }: { texte: string }) {
  return (
    <div className="my-3 flex h-20 items-center gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 text-xs text-dj-texte-muet">
      <span className="h-2 w-2 animate-dj-glow rounded-full bg-dj-texte-muet" />
      {texte}
    </div>
  );
}

function EtatErreur({ texte }: { texte: string }) {
  return (
    <div className="my-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4 text-xs text-dj-texte-muet">
      <span className="text-[var(--dj-erreur)]">Question invalide :</span> {texte}
    </div>
  );
}

// Rendu des 7 types "simples" (hors multi_champs), utilisé à la fois en
// standalone (ici) et pour chaque sous-champ de multi_champs
// (QuestionMultiChamps.tsx gère sa propre logique de valeur/soumission).
function ChampStandalone({
  champ,
  onReponse,
  desactive,
}: {
  champ: ChampSimple;
  onReponse: (texteFinal: string) => void;
  desactive: boolean;
}) {
  const [valeur, setValeur] = useState<ValeurChamp>(() => valeurInitiale(champ));

  function envoyer(v: ValeurChamp) {
    onReponse(formaterReponseChamp(champ, v));
  }

  switch (champ.type) {
    case "choix_unique":
      if (valeur.champType !== "choix_unique") return null;
      return (
        <>
          <ChampChoix
            choix={champ.choix}
            multiple={false}
            autre={champ.autre}
            valeur={valeur}
            onChange={(v) => {
              const nouvelle: ValeurChamp = { champType: "choix_unique", ...v };
              setValeur(nouvelle);
              // "Un clic suffit" seulement pour un choix normal -- si
              // "Autre" est activé, on attend la confirmation du texte
              // libre (bouton Valider ci-dessous).
              if (!v.autreActif && v.indices.length === 1) envoyer(nouvelle);
            }}
            desactive={desactive}
          />
          {valeur.autreActif && (
            <button
              type="button"
              disabled={desactive || !valeurComplete(champ, valeur)}
              onClick={() => envoyer(valeur)}
              className="mt-2 self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
            >
              Valider
            </button>
          )}
        </>
      );

    case "choix_multiple":
      if (valeur.champType !== "choix_multiple") return null;
      return (
        <>
          <ChampChoix
            choix={champ.choix}
            multiple
            autre={champ.autre}
            valeur={valeur}
            onChange={(v) => setValeur({ champType: "choix_multiple", ...v })}
            desactive={desactive}
          />
          <button
            type="button"
            disabled={desactive || !valeurComplete(champ, valeur)}
            onClick={() => envoyer(valeur)}
            className="mt-3 self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
          >
            Valider
          </button>
        </>
      );

    case "texte":
      if (valeur.champType !== "texte") return null;
      return (
        <>
          <ChampTexte
            format={champ.format}
            valeur={valeur.texte}
            onChange={(texte) => setValeur({ champType: "texte", texte })}
            desactive={desactive}
          />
          <button
            type="button"
            disabled={desactive || !valeurComplete(champ, valeur)}
            onClick={() => envoyer(valeur)}
            className="mt-3 self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
          >
            Valider
          </button>
        </>
      );

    case "oui_non":
      if (valeur.champType !== "oui_non") return null;
      return (
        <ChampOuiNon
          valeur={valeur.reponse}
          onChange={(reponse) => {
            const nouvelle: ValeurChamp = { champType: "oui_non", reponse };
            setValeur(nouvelle);
            envoyer(nouvelle); // un clic suffit
          }}
          desactive={desactive}
        />
      );

    case "echelle":
      if (valeur.champType !== "echelle") return null;
      return (
        <>
          <ChampEchelle
            min={champ.min}
            max={champ.max}
            labelMin={champ.labels?.min}
            labelMax={champ.labels?.max}
            valeur={valeur.valeur}
            onChange={(v) => setValeur({ champType: "echelle", valeur: v })}
            desactive={desactive}
          />
          <button
            type="button"
            disabled={desactive || !valeurComplete(champ, valeur)}
            onClick={() => envoyer(valeur)}
            className="mt-3 self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
          >
            Valider
          </button>
        </>
      );

    case "classement":
      if (valeur.champType !== "classement") return null;
      return (
        <>
          <ChampClassement
            elements={champ.elements}
            ordre={valeur.ordre}
            onChange={(ordre) => setValeur({ champType: "classement", ordre })}
            desactive={desactive}
          />
          <button
            type="button"
            disabled={desactive || !valeurComplete(champ, valeur)}
            onClick={() => envoyer(valeur)}
            className="mt-3 self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
          >
            Valider
          </button>
        </>
      );

    case "date":
      if (valeur.champType !== "date") return null;
      return (
        <>
          <ChampDate
            granularite={champ.granularite ?? "date"}
            valeur={valeur.valeur}
            onChange={(v) => setValeur({ champType: "date", valeur: v })}
            desactive={desactive}
          />
          <button
            type="button"
            disabled={desactive || !valeurComplete(champ, valeur)}
            onClick={() => envoyer(valeur)}
            className="mt-3 self-start rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
          >
            Valider
          </button>
        </>
      );
  }
}

export function QuestionInteractive({
  code,
  onReponse,
}: {
  code: string;
  // Optionnelle : le composant s'affiche et se verrouille localement même
  // sans elle (page de démo Lot 2). C'est le Lot 3 qui la branchera sur
  // l'envoi réel du message (ChatIA.tsx/envoyerMessage), voir en-tête.
  onReponse?: (texteFinal: string) => void;
}) {
  const [donnee, setDonnee] = useState<QuestionRiche | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reponseEnvoyee, setReponseEnvoyee] = useState<string | null>(null);

  function gererReponse(texte: string) {
    setReponseEnvoyee(texte);
    onReponse?.(texte);
  }

  // Même principe que QCMInteractif.tsx/FicheRevision.tsx : on attend
  // l'arrêt du streaming (500ms sans changement) avant de tenter le
  // parsing, pour ne pas confondre un JSON encore incomplet avec un JSON
  // réellement cassé.
  useEffect(() => {
    const delai = setTimeout(() => {
      try {
        const valeur = JSON.parse(code);
        setDonnee(valeur);
        setErreur(null);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
      }
    }, 500);
    return () => clearTimeout(delai);
  }, [code]);

  // Remise à zéro si le bloc change de contenu (nouvelle question générée
  // dans le même message, cas rare mais possible pendant un streaming qui
  // régénère le JSON) -- même garde que QCMInteractif.tsx.
  useEffect(() => {
    setReponseEnvoyee(null);
  }, [code]);

  if (!donnee) {
    return erreur ? (
      <EtatErreur texte="format JSON non reconnu." />
    ) : (
      <EtatChargement texte="Préparation de la question..." />
    );
  }

  if (typeof donnee.question !== "string" || !donnee.question.trim()) {
    return <EtatErreur texte="le champ 'question' est manquant." />;
  }

  if (donnee.type === "multi_champs") {
    if (!Array.isArray(donnee.champs) || donnee.champs.length === 0) {
      return <EtatErreur texte="au moins un champ est nécessaire." />;
    }
    const champInvalide = donnee.champs.find((c) => erreurStructure(c));
    if (champInvalide) {
      return <EtatErreur texte={erreurStructure(champInvalide) as string} />;
    }
  } else {
    const messageErreur = erreurStructure(donnee);
    if (messageErreur) return <EtatErreur texte={messageErreur} />;
  }

  const aRepondu = reponseEnvoyee !== null;

  return (
    <div className="my-3 flex animate-dj-fade-in flex-col rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <p className="text-sm font-semibold text-dj-texte">{donnee.question}</p>

      {donnee.type === "multi_champs" ? (
        <QuestionMultiChamps champs={donnee.champs} onReponse={gererReponse} desactive={aRepondu} />
      ) : (
        <ChampStandalone champ={donnee} onReponse={gererReponse} desactive={aRepondu} />
      )}

      {aRepondu && (
        <div className="mt-3 animate-dj-fade-in-rapide rounded-cgpt-carte bg-dj-surface-haute p-3 text-xs text-dj-texte-muet">
          Réponse envoyée : {reponseEnvoyee}
        </div>
      )}
    </div>
  );
}
