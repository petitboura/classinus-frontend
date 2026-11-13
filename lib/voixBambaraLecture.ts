"use client";

// Lecture à voix haute du mode vocal bambara : chaque morceau de texte est confié à la voix
// Gemini (via le relais du backend), et le morceau suivant est préparé pendant que le précédent
// joue, pour qu'il n'y ait pas de trou entre deux phrases.

export type LecteurBambara = {
  /** Lit les morceaux dans l'ordre. Se termine à la fin, ou dès qu'on interrompt. Échoue si la voix échoue. */
  lire: (morceaux: string[]) => Promise<void>;
  interrompre: () => void;
  /** Niveau sonore actuel entre 0 et 1. */
  niveau: () => number;
};

export function creerLecteurBambara(
  contexte: AudioContext,
  synthetiser: (texte: string) => Promise<ArrayBuffer>
): LecteurBambara {
  const analyseur = contexte.createAnalyser();
  analyseur.fftSize = 1024;
  analyseur.connect(contexte.destination);
  const echantillons = new Float32Array(analyseur.fftSize);
  let generation = 0;
  let courant: AudioBufferSourceNode | null = null;
  let finCourant: (() => void) | null = null;

  async function preparer(texte: string): Promise<AudioBuffer> {
    const brut = await synthetiser(texte);
    return contexte.decodeAudioData(brut);
  }

  function jouer(tampon: AudioBuffer): Promise<void> {
    return new Promise((resoudre) => {
      const source = contexte.createBufferSource();
      source.buffer = tampon;
      source.connect(analyseur);
      courant = source;
      finCourant = resoudre;
      source.onended = () => {
        if (courant === source) {
          courant = null;
          finCourant = null;
        }
        resoudre();
      };
      source.start();
    });
  }

  return {
    async lire(morceaux) {
      generation += 1;
      const maGeneration = generation;
      if (contexte.state === "suspended") await contexte.resume().catch(() => {});
      const taches = new Map<number, Promise<AudioBuffer>>();
      const lancer = (i: number) => {
        if (i >= morceaux.length || taches.has(i)) return;
        const tache = preparer(morceaux[i]);
        // L'erreur est traitée au moment d'attendre ce morceau, pas ici.
        tache.catch(() => {});
        taches.set(i, tache);
      };
      lancer(0);
      for (let i = 0; i < morceaux.length; i += 1) {
        lancer(i + 1);
        const tampon = await taches.get(i)!;
        if (maGeneration !== generation) return;
        await jouer(tampon);
        if (maGeneration !== generation) return;
      }
    },
    interrompre() {
      generation += 1;
      const source = courant;
      courant = null;
      if (source) {
        source.onended = null;
        try { source.stop(); } catch { /* déjà arrêtée */ }
      }
      finCourant?.();
      finCourant = null;
    },
    niveau() {
      if (!courant) return 0;
      analyseur.getFloatTimeDomainData(echantillons);
      let somme = 0;
      for (let i = 0; i < echantillons.length; i += 1) somme += echantillons[i] * echantillons[i];
      return Math.min(1, Math.sqrt(somme / echantillons.length) * 6);
    },
  };
}
