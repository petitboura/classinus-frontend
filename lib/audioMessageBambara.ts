"use client";

// Page bambara (19/11/2026, demande de Bourama) : la conversation fonctionne comme sur WhatsApp. Ce que la
// personne dit devient un message audio qu'elle peut réécouter, et la voix de Classinus aussi. Ce fichier
// fabrique ces messages : un fichier son simple (WAV, lu partout), sa durée exacte et les hauteurs des
// barres dessinées dans la bulle. Depuis le 22/11/2026 (demande de Bourama), le serveur garde toutes ces voix :
// elles se réécoutent en rouvrant la conversation depuis l'historique (lib/bambaraEspace.ts).

export type MessageAudioBambara = {
  blob: Blob;
  dureeMs: number;
  /** Hauteurs entre 0 et 1 des barres de la bulle, du début à la fin du message. */
  pics: number[];
};

/** Nombre de barres dessinées dans une bulle audio. */
export const NOMBRE_PICS = 32;

// Un peu de silence gardé avant et après la parole, pour que le message ne soit pas coupé net.
const MARGE_DEBUT_MS = 250;
const MARGE_FIN_MS = 350;
// Une découpe plus courte que ça est écartée : le message entier est gardé.
const DUREE_MIN_DECOUPE_S = 0.2;

function ecrireTexte(vue: DataView, decalage: number, texte: string) {
  for (let i = 0; i < texte.length; i += 1) vue.setUint8(decalage + i, texte.charCodeAt(i));
}

/** Fichier WAV (16 bits, un seul canal) à partir d'échantillons entre -1 et 1. */
export function encoderWav(mono: Float32Array, tauxHz: number): Blob {
  const octets = mono.length * 2;
  const tampon = new ArrayBuffer(44 + octets);
  const vue = new DataView(tampon);
  ecrireTexte(vue, 0, "RIFF");
  vue.setUint32(4, 36 + octets, true);
  ecrireTexte(vue, 8, "WAVE");
  ecrireTexte(vue, 12, "fmt ");
  vue.setUint32(16, 16, true);
  vue.setUint16(20, 1, true);
  vue.setUint16(22, 1, true);
  vue.setUint32(24, tauxHz, true);
  vue.setUint32(28, tauxHz * 2, true);
  vue.setUint16(32, 2, true);
  vue.setUint16(34, 16, true);
  ecrireTexte(vue, 36, "data");
  vue.setUint32(40, octets, true);
  for (let i = 0; i < mono.length; i += 1) {
    const v = Math.max(-1, Math.min(1, mono[i]));
    vue.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
  }
  return new Blob([tampon], { type: "audio/wav" });
}

/** Hauteur de chaque barre : le plus fort niveau de sa tranche, ramené au plus fort de tout le message. */
export function calculerPics(mono: Float32Array, nombre: number = NOMBRE_PICS): number[] {
  if (mono.length === 0 || nombre <= 0) return [];
  const pas = mono.length / nombre;
  const bruts: number[] = [];
  let maximum = 0;
  for (let b = 0; b < nombre; b += 1) {
    const debut = Math.floor(b * pas);
    const fin = Math.max(debut + 1, Math.min(mono.length, Math.floor((b + 1) * pas)));
    let pic = 0;
    for (let i = debut; i < fin; i += 1) {
      const v = Math.abs(mono[i]);
      if (v > pic) pic = v;
    }
    bruts.push(pic);
    if (pic > maximum) maximum = pic;
  }
  if (maximum <= 0) return bruts.map(() => 0);
  return bruts.map((p) => p / maximum);
}

/** Message audio à partir d'échantillons déjà mis à un seul canal. Null s'il n'y a aucun son. */
export function messageDepuisMono(mono: Float32Array, tauxHz: number): MessageAudioBambara | null {
  if (mono.length === 0 || !(tauxHz > 0)) return null;
  return {
    blob: encoderWav(mono, tauxHz),
    dureeMs: Math.round((mono.length / tauxHz) * 1000),
    pics: calculerPics(mono),
  };
}

function monoDepuisTampon(tampon: AudioBuffer, debut: number, fin: number): Float32Array {
  const longueur = Math.max(0, fin - debut);
  const mono = new Float32Array(longueur);
  const canaux = tampon.numberOfChannels;
  for (let c = 0; c < canaux; c += 1) {
    const donnees = tampon.getChannelData(c);
    for (let i = 0; i < longueur; i += 1) mono[i] += donnees[debut + i] / canaux;
  }
  return mono;
}

/** Les morceaux de voix de Classinus déjà lus, mis bout à bout en un seul message. Null si rien n'a été lu. */
export function messageDepuisTampons(tampons: AudioBuffer[]): MessageAudioBambara | null {
  if (tampons.length === 0) return null;
  const taux = tampons[0].sampleRate;
  const total = tampons.reduce((somme, t) => somme + t.length, 0);
  if (total === 0) return null;
  const mono = new Float32Array(total);
  let position = 0;
  for (const tampon of tampons) {
    mono.set(monoDepuisTampon(tampon, 0, tampon.length), position);
    position += tampon.length;
  }
  return messageDepuisMono(mono, taux);
}

/**
 * La prise de parole de la personne, découpée du silence avant et après (repères en millisecondes depuis
 * le début de l'enregistrement) et remise en WAV. Si le navigateur ne sait pas décoder l'enregistrement,
 * l'enregistrement d'origine est gardé tel quel avec la durée estimée : le message reste écoutable.
 */
export async function messageDepuisEnregistrement(
  contexte: AudioContext,
  audio: Blob,
  debutMs: number,
  finMs: number
): Promise<MessageAudioBambara> {
  const duree = Math.max(0, Math.round(finMs - debutMs));
  try {
    const brut = await audio.arrayBuffer();
    const tampon = await contexte.decodeAudioData(brut);
    const taux = tampon.sampleRate;
    let debut = Math.max(0, Math.floor(((debutMs - MARGE_DEBUT_MS) / 1000) * taux));
    let fin = Math.min(tampon.length, Math.ceil(((finMs + MARGE_FIN_MS) / 1000) * taux));
    if (!(fin - debut >= DUREE_MIN_DECOUPE_S * taux)) {
      debut = 0;
      fin = tampon.length;
    }
    const message = messageDepuisMono(monoDepuisTampon(tampon, debut, fin), taux);
    if (message) return message;
  } catch {
    // Décodage impossible : on garde l'enregistrement d'origine.
  }
  return { blob: audio, dureeMs: duree, pics: [] };
}

/** Durée affichée dans la bulle, comme « 0:07 ». */
export function formaterDuree(ms: number): string {
  const secondes = Math.max(0, Math.round(ms / 1000));
  return Math.floor(secondes / 60) + ":" + String(secondes % 60).padStart(2, "0");
}
