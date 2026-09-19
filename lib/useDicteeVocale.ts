"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier N. Dictée vocale à deux
// moteurs, au choix de l'user :
// - "whisper" : MediaRecorder puis transcription Whisper/Groq côté
//   backend (transcrireAudioChat), même pipeline que la dictée de
//   BarreDeSaisie.tsx ;
// - "navigateur" : Web Speech API (SpeechRecognition), sans passage par
//   le backend.
//
// Le pipeline de BarreDeSaisie.tsx n'est volontairement PAS remplacé par
// ce hook : ce fichier de plusieurs milliers de lignes fonctionne, le
// toucher n'est pas nécessaire pour ce chantier. Le jour où Bourama
// validera de l'y brancher, le hook pourra servir aux deux endroits.
//
// Web Speech API : disponible sur Chrome, Edge et Safari, derrière un
// drapeau sur Firefox, et pas fiable dans les vues web des applis
// natives Capacitor. Le hook expose donc navigateurDisponible : le
// composant qui l'utilise ne propose le choix "navigateur" que si le
// navigateur sait le faire, sinon Whisper reste le seul moteur.

import { useCallback, useEffect, useRef, useState } from "react";
import { transcrireAudioChat } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import type { MoteurDictee } from "@/lib/contexteCanalEnDirect";

// Types minimaux de la Web Speech API, absents du lib.dom de TypeScript.
type ResultatReconnaissance = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};
type EvenementResultat = { resultIndex: number; results: ArrayLike<ResultatReconnaissance> };
type EvenementErreur = { error: string };
interface Reconnaissance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: EvenementResultat) => void) | null;
  onerror: ((e: EvenementErreur) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type ConstructeurReconnaissance = new () => Reconnaissance;

function trouverConstructeurReconnaissance(): ConstructeurReconnaissance | null {
  if (typeof window === "undefined") return null;
  const fenetre = window as unknown as {
    SpeechRecognition?: ConstructeurReconnaissance;
    webkitSpeechRecognition?: ConstructeurReconnaissance;
  };
  return fenetre.SpeechRecognition ?? fenetre.webkitSpeechRecognition ?? null;
}

function messagePourErreurNavigateur(code: string): string {
  if (code === "not-allowed" || code === "service-not-allowed") return "Micro refusé ou indisponible.";
  if (code === "no-speech") return "Aucune voix détectée.";
  if (code === "network") return "Le service de dictée du navigateur est injoignable.";
  return "La dictée du navigateur a échoué.";
}

type Options = {
  moteur: MoteurDictee;
  surTexte: (texte: string) => void;
  surErreur: (message: string) => void;
};

export function useDicteeVocale({ moteur, surTexte, surErreur }: Options) {
  const [enEcoute, setEnEcoute] = useState(false);
  const [transcriptionEnCours, setTranscriptionEnCours] = useState(false);
  const [navigateurDisponible, setNavigateurDisponible] = useState(false);

  const enregistreurRef = useRef<MediaRecorder | null>(null);
  const morceauxRef = useRef<BlobPart[]>([]);
  const flux = useRef<MediaStream | null>(null);
  const reconnaissanceRef = useRef<Reconnaissance | null>(null);
  const texteFinalRef = useRef("");
  const codeErreurRef = useRef<string | null>(null);
  const annuleRef = useRef(false);

  // Callbacks lus via des refs pour que les gestionnaires posés au
  // démarrage de la dictée voient toujours la dernière version, sans
  // recréer le micro à chaque rendu.
  const surTexteRef = useRef(surTexte);
  const surErreurRef = useRef(surErreur);
  useEffect(() => {
    surTexteRef.current = surTexte;
    surErreurRef.current = surErreur;
  }, [surTexte, surErreur]);

  // Détection après le montage, pas pendant le premier rendu (même
  // raison que les préférences de contexteCanalEnDirect.tsx).
  useEffect(() => {
    setNavigateurDisponible(trouverConstructeurReconnaissance() !== null);
  }, []);

  const libererMicro = useCallback(() => {
    flux.current?.getTracks().forEach((piste) => piste.stop());
    flux.current = null;
  }, []);

  const demarrerWhisper = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      flux.current = stream;
      const enregistreur = new MediaRecorder(stream);
      morceauxRef.current = [];
      annuleRef.current = false;

      enregistreur.ondataavailable = (e) => {
        if (e.data.size > 0) morceauxRef.current.push(e.data);
      };

      enregistreur.onstop = async () => {
        libererMicro();
        if (annuleRef.current) return;
        const blob = new Blob(morceauxRef.current, { type: enregistreur.mimeType || "audio/webm" });
        setTranscriptionEnCours(true);
        try {
          const fichierAudio = new File([blob], "dictee.webm", { type: blob.type });
          const { texte } = await transcrireAudioChat(fichierAudio);
          if (texte.trim()) surTexteRef.current(texte.trim());
          else surErreurRef.current("Aucune voix détectée.");
        } catch (e) {
          surErreurRef.current(messageErreur(e));
        } finally {
          setTranscriptionEnCours(false);
        }
      };

      enregistreur.start();
      enregistreurRef.current = enregistreur;
      setEnEcoute(true);
    } catch {
      libererMicro();
      surErreurRef.current("Micro indisponible ou refusé.");
    }
  }, [libererMicro]);

  const demarrerNavigateur = useCallback(() => {
    const Constructeur = trouverConstructeurReconnaissance();
    if (!Constructeur) {
      surErreurRef.current("La dictée du navigateur n'est pas disponible ici, choisis Whisper.");
      return;
    }
    const reconnaissance = new Constructeur();
    reconnaissance.lang = document.documentElement.lang || navigator.language || "fr-FR";
    reconnaissance.continuous = false;
    reconnaissance.interimResults = false;
    texteFinalRef.current = "";
    codeErreurRef.current = null;
    annuleRef.current = false;

    reconnaissance.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        if (e.results[i].isFinal) texteFinalRef.current += `${e.results[i][0].transcript} `;
      }
    };
    reconnaissance.onerror = (e) => {
      codeErreurRef.current = e.error;
    };
    reconnaissance.onend = () => {
      setEnEcoute(false);
      reconnaissanceRef.current = null;
      if (annuleRef.current) return;
      const texte = texteFinalRef.current.trim();
      if (texte) surTexteRef.current(texte);
      else surErreurRef.current(messagePourErreurNavigateur(codeErreurRef.current ?? "no-speech"));
    };

    try {
      reconnaissance.start();
      reconnaissanceRef.current = reconnaissance;
      setEnEcoute(true);
    } catch {
      surErreurRef.current("La dictée du navigateur a échoué.");
    }
  }, []);

  // Un moteur "navigateur" mémorisé sur un autre appareil peut ne pas
  // exister ici : Whisper prend alors le relais sans rien casser.
  const moteurUtilise: MoteurDictee = moteur === "navigateur" && navigateurDisponible ? "navigateur" : "whisper";

  const demarrer = useCallback(() => {
    if (enEcoute || transcriptionEnCours) return;
    if (moteurUtilise === "navigateur") demarrerNavigateur();
    else void demarrerWhisper();
  }, [enEcoute, transcriptionEnCours, moteurUtilise, demarrerNavigateur, demarrerWhisper]);

  // Arrête l'écoute et laisse la transcription aller à son terme.
  const arreter = useCallback(() => {
    if (enregistreurRef.current) {
      enregistreurRef.current.stop();
      enregistreurRef.current = null;
      setEnEcoute(false);
    }
    reconnaissanceRef.current?.stop();
  }, []);

  // Arrête l'écoute et jette ce qui a été capté (canal désactivé, démontage).
  const annuler = useCallback(() => {
    annuleRef.current = true;
    if (enregistreurRef.current) {
      enregistreurRef.current.stop();
      enregistreurRef.current = null;
    }
    reconnaissanceRef.current?.abort();
    reconnaissanceRef.current = null;
    libererMicro();
    setEnEcoute(false);
  }, [libererMicro]);

  useEffect(() => annuler, [annuler]);

  return { enEcoute, transcriptionEnCours, navigateurDisponible, moteurUtilise, demarrer, arreter, annuler };
}
