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
import { ArrowUp, ArrowUpRight, AudioLines, ChevronDown, ChevronUp, Mic, Minimize2, PenLine, Square } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { BoutonJournalAgent } from "@/components/BoutonJournalAgent";
import { PleinEcranApercu } from "@/components/chat/PleinEcranApercu";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { ContexteCanalEnDirect, type MoteurDictee } from "@/lib/contexteCanalEnDirect";
import { envoyerMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { useDicteeVocale } from "@/lib/useDicteeVocale";
import { ContexteVoixDirecte } from "@/lib/contexteVoixDirecte";
import { conversationActive } from "@/lib/conversationPartagee";

const DUREE_ERREUR_MS = 6000;

const LABEL_MOTEUR: Record<MoteurDictee, string> = {
  navigateur: "Navigateur",
  whisper: "Whisper",
};

// Regroupement (02/10/2026, demande Bourama) : une fois le canal actif, un seul
// bouton (chevron) déplie ou replie tous les autres (voix, dictée et son moteur,
// journal). Le groupe est déplié dès l'activation. Le bouton "Écrire un message"
// sort du groupe : il reste toujours visible.
export function ControlesInteractionCanal() {
  const contexte = useContext(ContexteCanalEnDirect);
  const actif = contexte?.actif ?? false;
  const modeInteraction = contexte?.modeInteraction ?? "texte";
  const moteurChoisi = contexte?.moteurDictee ?? "whisper";
  const conversationId = contexte?.actif ? contexte.conversationId : null;
  // Depuis le 02/10/2026, la voix est une pièce partagée (InteractionGlobale) : ce bouton
  // et le Mode vocal du chat pilotent la même session, jamais deux voix.
  const voixDirecte = useContext(ContexteVoixDirecte);
  const geminiLive = {
    actif: voixDirecte?.actif ?? false,
    etat: voixDirecte?.etat ?? "inactif",
    basculer: () => voixDirecte?.basculer(conversationActive() ?? conversationId),
  };
  const fermerVoixPourConversation = voixDirecte?.fermerPourConversation;
  useEffect(() => () => fermerVoixPourConversation?.(conversationId), [conversationId, fermerVoixPourConversation]);

  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [groupeOuvert, setGroupeOuvert] = useState(true);
  const [pleinEcran, setPleinEcran] = useState(false);
  const { enSortie: pleinEcranEnSortie, demarrerFermeture: fermerPleinEcranAnime } = useFermetureAnimee();
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
    if (actif) {
      setGroupeOuvert(true);
      return;
    }
    annuler();
    setPanneauOuvert(false);
    setPleinEcran(false);
    setErreur(null);
  }, [actif, annuler]);

  useEffect(() => {
    if (panneauOuvert) champRef.current?.focus();
  }, [panneauOuvert]);

  // Auto-agrandissement (19/09/2026, bug signalé Bourama : "il reste
  // bloqué et défile dans quelques lignes") -- même mécanisme que
  // components/chat/BarreDeSaisie.tsx:ajusterHauteurTexte, pas
  // réutilisable tel quel (textarea différent, contexte différent) :
  // hauteur remise à "auto" puis fixée à scrollHeight à chaque frappe,
  // le CSS max-h prend le relais au-delà pour repasser en défilement
  // interne plutôt que de grandir indéfiniment.
  useEffect(() => {
    const el = champRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [texteSaisi, panneauOuvert]);

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

  const fermerPleinEcran = () => fermerPleinEcranAnime(() => setPleinEcran(false));

  return (
    <>
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
                  data-pas-deplacement="true"
                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="relative flex w-[min(18rem,calc(100vw-2rem))] items-end gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-2 shadow-xl"
                >
                  {/* Plein écran : même flèche que sur la barre de saisie du chat,
                      posée au dessus du coin haut droit de la zone d'écriture. */}
                  <button
                    type="button"
                    onClick={() => setPleinEcran(true)}
                    aria-label="Agrandir en plein écran"
                    title="Plein écran"
                    className="absolute -top-6 right-0 z-10 flex h-6 w-6 items-center justify-center text-dj-texte-muet opacity-70 transition-opacity hover:text-dj-texte hover:opacity-100"
                  >
                    <ArrowUpRight size={12} strokeWidth={1.75} />
                  </button>
                  <textarea
                    ref={champRef}
                    value={texteSaisi}
                    onChange={(e) => setTexteSaisi(e.target.value)}
                    onKeyDown={surToucheChamp}
                    rows={1}
                    placeholder="Dis quelque chose à Classinus..."
                    aria-label="Message pour Classinus pendant qu'il travaille"
                    className="min-h-[2.5rem] max-h-40 flex-1 resize-none overflow-y-auto bg-transparent text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet"
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

            <AnimatePresence initial={false}>
              {groupeOuvert && (
                <motion.div
                  key="groupe"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="flex max-w-[min(20rem,calc(100vw-2rem))] flex-wrap items-center gap-2"
                >
                  <button
                    onClick={geminiLive.basculer}
                    disabled={geminiLive.etat === "connexion"}
                    aria-pressed={geminiLive.actif}
                    aria-label={geminiLive.actif ? "Arrêter la conversation vocale Gemini" : "Parler en temps réel avec Clovis"}
                    title={geminiLive.actif ? "Arrêter la conversation vocale Gemini" : "Parler en temps réel avec Clovis"}
                    className={`${classeBouton(geminiLive.actif, geminiLive.actif)} ${geminiLive.etat === "reponse" ? "animate-pulse" : ""}`}
                  >
                    <AudioLines size={18} />
                  </button>

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

                  <BoutonJournalAgent integre />

                  {/* Arrêter la tâche en cours, comme le bouton d'arrêt du chat : le
                      texte déjà écrit reste, la bulle propose ensuite Continuer ou
                      Réessayer (voir lib/tacheCanal.ts). N'apparaît que pendant une tâche. */}
                  <AnimatePresence>
                    {contexte.tacheEnCours && (
                      <motion.button
                        key="arreter-tache"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        onClick={contexte.arreterTache}
                        aria-label="Arrêter la tâche en cours"
                        title="Arrêter la tâche en cours"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02] shadow-lg transition-colors hover:bg-dj-accent-2"
                      >
                        <Square size={14} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setGroupeOuvert((v) => !v)}
                aria-expanded={groupeOuvert}
                aria-label={groupeOuvert ? "Replier les boutons du canal" : "Déplier les boutons du canal"}
                title={groupeOuvert ? "Replier les boutons du canal" : "Déplier les boutons du canal"}
                className={classeBouton(false, false)}
              >
                {groupeOuvert ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>

              <button
                onClick={basculerPanneau}
                aria-pressed={panneauOuvert}
                aria-label={panneauOuvert ? "Fermer la zone d'écriture" : "Écrire un message"}
                title={panneauOuvert ? "Fermer la zone d'écriture" : "Écrire un message"}
                className={classeBouton(modeInteraction === "texte", panneauOuvert)}
              >
                <PenLine size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {pleinEcran && (
        <PleinEcranApercu
          titre="Écris ton message"
          onFerme={fermerPleinEcran}
          enSortie={pleinEcranEnSortie}
          entete={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-dj-texte-muet">Écris ton message</span>
              <button
                onClick={fermerPleinEcran}
                aria-label="Rétrécir"
                className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <Minimize2 size={14} /> Rétrécir
              </button>
            </div>
          }
        >
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <textarea
              autoFocus
              value={texteSaisi}
              onChange={(e) => setTexteSaisi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyerTexte();
                  fermerPleinEcran();
                }
              }}
              placeholder="Dis quelque chose à Classinus..."
              aria-label="Message pour Classinus pendant qu'il travaille"
              className="h-full w-full resize-none overflow-y-auto bg-transparent text-base leading-relaxed text-dj-texte outline-none placeholder:text-dj-texte-muet"
            />
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                envoyerTexte();
                fermerPleinEcran();
              }}
              disabled={!texteSaisi.trim()}
              aria-label="Envoyer le message"
              className="flex items-center gap-2 rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
            >
              Envoyer <ArrowUp size={16} />
            </button>
          </div>
        </PleinEcranApercu>
      )}
    </>
  );
}
