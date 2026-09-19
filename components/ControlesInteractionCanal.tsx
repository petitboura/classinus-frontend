"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantiers M et N. Visible
// seulement quand le canal est actif. Deux boutons séparés du chat pour
// parler à Clovis pendant qu'il travaille :
// - un pour la dictée vocale (Mic), avec un petit switch entre les deux
//   moteurs (chantier N) : Navigateur (Web Speech API) et Whisper ;
// - un pour écrire (PenLine), qui ouvre une petite zone de saisie.
//
// Le dernier bouton utilisé est mémorisé (localStorage, voir
// lib/contexteCanalEnDirect.tsx) et reste mis en avant à la prochaine
// activation. Le choix du moteur est mémorisé de la même façon.
//
// Le message capté part par envoyerMessageEtudiant (lib/canalAgentApplicatif.ts) :
// lu par Clovis à son prochain aller-retour s'il est en train de travailler,
// sinon envoyé comme un message normal du chat.

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, PenLine, Square } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { ContexteCanalEnDirect, type MoteurDictee } from "@/lib/contexteCanalEnDirect";
import { envoyerMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { useDicteeVocale } from "@/lib/useDicteeVocale";

const DUREE_ERREUR_MS = 6000;

const LABEL_MOTEUR: Record<MoteurDictee, string> = {
  navigateur: "Navigateur",
  whisper: "Whisper",
};

export function ControlesInteractionCanal() {
  const contexte = useContext(ContexteCanalEnDirect);
  const actif = contexte?.actif ?? false;
  const modeInteraction = contexte?.modeInteraction ?? "texte";
  const moteurChoisi = contexte?.moteurDictee ?? "whisper";

  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [texteSaisi, setTexteSaisi] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const champRef = useRef<HTMLTextAreaElement>(null);
  const minuteurErreur = useRef<ReturnType<typeof setTimeout> | null>(null);

  function afficherErreur(message: string) {
    if (minuteurErreur.current) clearTimeout(minuteurErreur.current);
    setErreur(message);
    minuteurErreur.current = setTimeout(() => setErreur(null), DUREE_ERREUR_MS);
  }

  const dictee = useDicteeVocale({
    moteur: moteurChoisi,
    surTexte: (texte) => {
      setErreur(null);
      envoyerMessageEtudiant(texte);
    },
    surErreur: afficherErreur,
  });

  // Canal désactivé : plus d'écoute en cours, panneau refermé.
  const { annuler } = dictee;
  useEffect(() => {
    if (actif) return;
    annuler();
    setPanneauOuvert(false);
    setErreur(null);
  }, [actif, annuler]);

  useEffect(() => {
    if (panneauOuvert) champRef.current?.focus();
  }, [panneauOuvert]);

  useEffect(
    () => () => {
      if (minuteurErreur.current) clearTimeout(minuteurErreur.current);
    },
    [],
  );

  if (!contexte) return null;
  const { choisirModeInteraction, choisirMoteurDictee } = contexte;

  function basculerDictee() {
    choisirModeInteraction("voix");
    setPanneauOuvert(false);
    setErreur(null);
    if (dictee.enEcoute) dictee.arreter();
    else dictee.demarrer();
  }

  function basculerPanneau() {
    choisirModeInteraction("texte");
    if (dictee.enEcoute) dictee.annuler();
    setErreur(null);
    setPanneauOuvert((v) => !v);
  }

  function envoyerTexte() {
    const propre = texteSaisi.trim();
    if (!propre) return;
    envoyerMessageEtudiant(propre);
    setTexteSaisi("");
    setPanneauOuvert(false);
  }

  function surToucheChamp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyerTexte();
    } else if (e.key === "Escape") {
      setPanneauOuvert(false);
    }
  }

  function choisirMoteur(moteur: MoteurDictee) {
    if (dictee.enEcoute) dictee.annuler();
    choisirMoteurDictee(moteur);
  }

  const classeBouton = (misEnAvant: boolean, occupe: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors ${
      occupe
        ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02]"
        : misEnAvant
          ? "border-dj-accent-1 bg-dj-surface text-dj-texte hover:bg-dj-surface-haute"
          : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
    }`;

  return (
    <AnimatePresence>
      {actif && (
        <motion.div
          key="controles"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="flex flex-col items-start gap-2"
        >
          <AnimatePresence>
            {erreur && (
              <motion.p
                key="erreur"
                role="alert"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="max-w-[min(18rem,calc(100vw-2rem))] rounded-cgpt-bouton border border-dj-bordure bg-dj-surface px-3 py-2 text-xs text-[var(--dj-erreur)] shadow-lg"
              >
                {erreur}
              </motion.p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {panneauOuvert && (
              <motion.div
                key="panneau"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.15 }}
                className="flex w-[min(18rem,calc(100vw-2rem))] items-end gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-2 shadow-xl"
              >
                <textarea
                  ref={champRef}
                  value={texteSaisi}
                  onChange={(e) => setTexteSaisi(e.target.value)}
                  onKeyDown={surToucheChamp}
                  rows={2}
                  placeholder="Dis quelque chose à Clovis..."
                  aria-label="Message pour Clovis pendant qu'il travaille"
                  className="min-h-[2.5rem] flex-1 resize-none bg-transparent text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet"
                />
                <button
                  onClick={envoyerTexte}
                  disabled={!texteSaisi.trim()}
                  aria-label="Envoyer le message"
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-dj-accent-1 text-[#1A0D02] transition-opacity disabled:opacity-40"
                >
                  <ArrowUp size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2">
            <button
              onClick={basculerDictee}
              disabled={dictee.transcriptionEnCours}
              aria-pressed={dictee.enEcoute}
              aria-label={
                dictee.enEcoute ? "Arrêter la dictée" : dictee.transcriptionEnCours ? "Transcription en cours" : "Dicter un message"
              }
              title={dictee.enEcoute ? "Arrêter la dictée" : "Dicter un message"}
              className={`${classeBouton(modeInteraction === "voix", dictee.enEcoute)} ${
                dictee.enEcoute || dictee.transcriptionEnCours ? "animate-pulse" : ""
              }`}
            >
              {dictee.enEcoute ? <Square size={16} /> : <Mic size={18} />}
            </button>

            {dictee.navigateurDisponible && (
              <div
                role="radiogroup"
                aria-label="Moteur de dictée"
                className="flex overflow-hidden rounded-full border border-dj-bordure bg-dj-surface text-[11px] shadow-lg"
              >
                {(Object.keys(LABEL_MOTEUR) as MoteurDictee[]).map((moteur) => (
                  <button
                    key={moteur}
                    role="radio"
                    aria-checked={dictee.moteurUtilise === moteur}
                    onClick={() => choisirMoteur(moteur)}
                    className={`px-2.5 py-1.5 transition-colors ${
                      dictee.moteurUtilise === moteur
                        ? "bg-dj-accent-1 text-[#1A0D02]"
                        : "text-dj-texte-muet hover:text-dj-texte"
                    }`}
                  >
                    {LABEL_MOTEUR[moteur]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={basculerPanneau}
            aria-pressed={panneauOuvert}
            aria-label={panneauOuvert ? "Fermer la zone d'écriture" : "Écrire un message"}
            title={panneauOuvert ? "Fermer la zone d'écriture" : "Écrire un message"}
            className={classeBouton(modeInteraction === "texte", panneauOuvert)}
          >
            <PenLine size={18} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
