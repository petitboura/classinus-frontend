"use client";

// Micro du mode vocal bambara : détecte quand l'utilisateur parle et quand il a fini, et rend
// l'enregistrement de chaque prise de parole. Rien n'est envoyé ici : l'appelant décide.
// L'enregistreur tourne dès que l'écoute commence (rien du début d'une phrase n'est perdu) et
// repart de zéro quand personne ne parle depuis trop longtemps.

export const REGLAGES_MICRO = {
  // Pas d'analyse du niveau sonore.
  pasMs: 50,
  // Niveau minimal pour parler, et rapport au bruit ambiant mesuré en continu.
  seuilMin: 0.015,
  facteurBruit: 3,
  // Silence qui termine une prise de parole.
  finParoleMs: 1200,
  // Parole plus courte que ça : bruit, ignorée.
  paroleMinMs: 350,
  // Attente maximale avant la première parole, puis durée maximale d'une prise de parole.
  attenteMaxMs: 8000,
  enonceMaxMs: 60000,
};

const TYPES_AUDIO = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export type Micro = {
  /** Niveau sonore actuel entre 0 et 1 (0 hors écoute). */
  niveau: () => number;
  /** Reprend l'écoute avec un enregistreur neuf. */
  ecouter: () => void;
  /** Arrête l'écoute et jette ce qui était en cours. Le micro reste ouvert. */
  pause: () => void;
  /** Libère le micro. */
  fermer: () => void;
};

type OptionsMicro = {
  contexte: AudioContext;
  /** Appelée à chaque prise de parole terminée, l'écoute est alors en pause. */
  surEnregistrement: (audio: Blob, mime: string) => void;
};

function choisirType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return TYPES_AUDIO.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export async function ouvrirMicro({ contexte, surEnregistrement }: OptionsMicro): Promise<Micro> {
  if (typeof MediaRecorder === "undefined") throw new Error("Enregistrement audio non pris en charge");
  const flux = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const source = contexte.createMediaStreamSource(flux);
  const analyseur = contexte.createAnalyser();
  analyseur.fftSize = 1024;
  source.connect(analyseur);
  const echantillons = new Float32Array(analyseur.fftSize);
  const mime = choisirType();

  let ecoute = false;
  let enregistreur: MediaRecorder | null = null;
  let morceaux: Blob[] = [];
  let debutEnregistrement = 0;
  let debutParole = 0;
  let dernierSon = 0;
  let parle = false;
  let bruit = REGLAGES_MICRO.seuilMin / REGLAGES_MICRO.facteurBruit;
  let niveauAffiche = 0;

  function arreterEnregistreur(garder: boolean) {
    const courant = enregistreur;
    enregistreur = null;
    if (!courant) return;
    const lot = morceaux;
    morceaux = [];
    // Le dernier morceau arrive encore dans `lot` (même tableau que celui de l'enregistreur) avant onstop.
    courant.onstop = garder ? () => surEnregistrement(new Blob(lot, { type: mime || courant.mimeType }), mime || courant.mimeType) : null;
    if (courant.state !== "inactive") courant.stop();
  }

  function demarrerEnregistreur() {
    morceaux = [];
    parle = false;
    debutEnregistrement = Date.now();
    const lot = morceaux;
    const nouveau = new MediaRecorder(flux, mime ? { mimeType: mime } : undefined);
    nouveau.ondataavailable = (e) => { if (e.data.size > 0) lot.push(e.data); };
    nouveau.start(250);
    enregistreur = nouveau;
  }

  function analyser() {
    analyseur.getFloatTimeDomainData(echantillons);
    let somme = 0;
    for (let i = 0; i < echantillons.length; i += 1) somme += echantillons[i] * echantillons[i];
    const rms = Math.sqrt(somme / echantillons.length);
    niveauAffiche = ecoute ? Math.min(1, rms * 8) : 0;
    if (!ecoute) return;
    const maintenant = Date.now();
    const seuil = Math.max(REGLAGES_MICRO.seuilMin, bruit * REGLAGES_MICRO.facteurBruit);
    if (rms > seuil) {
      if (!parle) {
        parle = true;
        debutParole = maintenant;
      }
      dernierSon = maintenant;
    } else if (!parle) {
      bruit = bruit * 0.95 + rms * 0.05;
    }
    if (parle) {
      const finie = maintenant - dernierSon > REGLAGES_MICRO.finParoleMs || maintenant - debutParole > REGLAGES_MICRO.enonceMaxMs;
      if (!finie) return;
      const duree = dernierSon - debutParole;
      if (duree < REGLAGES_MICRO.paroleMinMs) {
        arreterEnregistreur(false);
        demarrerEnregistreur();
        return;
      }
      ecoute = false;
      arreterEnregistreur(true);
    } else if (maintenant - debutEnregistrement > REGLAGES_MICRO.attenteMaxMs) {
      arreterEnregistreur(false);
      demarrerEnregistreur();
    }
  }

  const minuteur = setInterval(analyser, REGLAGES_MICRO.pasMs);

  return {
    niveau: () => niveauAffiche,
    ecouter() {
      arreterEnregistreur(false);
      ecoute = true;
      demarrerEnregistreur();
    },
    pause() {
      ecoute = false;
      arreterEnregistreur(false);
    },
    fermer() {
      clearInterval(minuteur);
      ecoute = false;
      arreterEnregistreur(false);
      source.disconnect();
      flux.getTracks().forEach((piste) => piste.stop());
    },
  };
}
