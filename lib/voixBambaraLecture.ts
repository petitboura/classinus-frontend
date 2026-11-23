"use client";

// Lecture à voix haute du mode vocal bambara : chaque morceau de texte est confié à la voix
// Gemini (via le relais du backend), et le morceau suivant est préparé pendant que le précédent
// joue, pour qu'il n'y ait pas de trou entre deux phrases.

// Des phrases courtes se lisent vite : pendant que l'une joue, on prépare les deux suivantes pour qu'il n'y ait pas de
// silence entre elles (23/11/2026, lecture au fil de l'eau).
const MORCEAUX_PREPARES_D_AVANCE = 2;

export type OptionsFlux = {
  /** Reçoit chaque morceau de voix au moment où il commence à être lu (pour en faire un message audio). */
  surTampon?: (tampon: AudioBuffer) => void;
  /** Attendue une fois, avant le premier son : la lecture patiente tant qu'elle n'est pas résolue. */
  avantJouer?: () => Promise<void>;
};

export type FluxLecture = {
  /** Ajoute des morceaux à lire à la suite. Sans effet après `terminer` ou une interruption. */
  ajouter: (morceaux: string[]) => void;
  /** Plus rien ne sera ajouté : la lecture s'arrête après le dernier morceau. */
  terminer: () => void;
  /** Coupe cette lecture pour de bon, même avant son premier son. Sans effet si une plus récente a pris la suite. */
  annuler: () => void;
  /** Résolue à la fin de la lecture ou à l'interruption, rejetée si la voix échoue. */
  fini: Promise<void>;
};

export type LecteurBambara = {
  /**
   * Lit les morceaux dans l'ordre. Se termine à la fin, ou dès qu'on interrompt. Échoue si la voix échoue.
   * `surTampon` reçoit chaque morceau de voix au moment où il commence à être lu (pour en faire un message audio).
   */
  lire: (morceaux: string[], surTampon?: (tampon: AudioBuffer) => void) => Promise<void>;
  /**
   * Lecture au fil de l'eau (23/11/2026, demande de Bourama) : les morceaux sont ajoutés pendant que la réponse s'écrit,
   * le premier est lu dès qu'il est prêt sans attendre les suivants.
   */
  flux: (options?: OptionsFlux) => FluxLecture;
  /**
   * Fait taire la voix (une réécoute commence). Une lecture au fil de l'eau qui n'a pas encore émis son premier son n'est
   * pas tuée : elle patiente puis part. Pour tout couper pour de bon, voir `arreter`.
   */
  interrompre: () => void;
  /** Coupe tout pour de bon : bouton Arrêter, fermeture de la session, fin de la page. */
  arreter: () => void;
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
  // Réveille la lecture au fil de l'eau quand elle attend un morceau qui n'est pas encore arrivé.
  let reveilFlux: (() => void) | null = null;
  // Une lecture au fil de l'eau n'a pas encore émis son premier son : elle n'a rien à couper. Une réécoute qui demande de
  // faire taire la voix (`interrompre`) ne la tue donc pas, elle patiente (avantJouer) puis part ensuite, comme la lecture
  // d'avant. Seul `arreter` (bouton Arrêter, fermeture de la session) la coupe pour de bon.
  let fluxPatiente = false;

  /** Coupe tout, même une lecture qui n'a pas encore commencé : plus rien ne sera lu pour cette lecture. */
  function arreter() {
    fluxPatiente = false;
    generation += 1;
    const source = courant;
    courant = null;
    if (source) {
      source.onended = null;
      try { source.stop(); } catch { /* déjà arrêtée */ }
    }
    finCourant?.();
    finCourant = null;
    const r = reveilFlux;
    reveilFlux = null;
    r?.();
  }

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
    async lire(morceaux, surTampon) {
      generation += 1;
      fluxPatiente = false;
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
        surTampon?.(tampon);
        await jouer(tampon);
        if (maGeneration !== generation) return;
      }
    },
    flux(options = {}) {
      generation += 1;
      fluxPatiente = true;
      const maGeneration = generation;
      const morceaux: string[] = [];
      const taches = new Map<number, Promise<AudioBuffer>>();
      let termine = false;
      let rang = 0;
      const lancer = (i: number) => {
        if (i >= morceaux.length || taches.has(i)) return;
        const tache = preparer(morceaux[i]);
        // L'erreur est traitée au moment d'attendre ce morceau, pas ici.
        tache.catch(() => {});
        taches.set(i, tache);
      };
      const preparerLaSuite = () => {
        for (let k = 0; k <= MORCEAUX_PREPARES_D_AVANCE; k += 1) lancer(rang + k);
      };
      const reveiller = () => {
        const r = reveilFlux;
        reveilFlux = null;
        r?.();
      };
      const fini = (async () => {
        try {
          if (contexte.state === "suspended") await contexte.resume().catch(() => {});
          let premierSonEmis = false;
          for (;;) {
            while (rang >= morceaux.length) {
              if (termine || maGeneration !== generation) return;
              await new Promise<void>((resoudre) => { reveilFlux = resoudre; });
            }
            if (maGeneration !== generation) return;
            preparerLaSuite();
            const tampon = await taches.get(rang)!;
            if (maGeneration !== generation) return;
            if (!premierSonEmis) {
              await options.avantJouer?.();
              if (maGeneration !== generation) return;
              premierSonEmis = true;
              fluxPatiente = false;
            }
            options.surTampon?.(tampon);
            await jouer(tampon);
            if (maGeneration !== generation) return;
            rang += 1;
          }
        } finally {
          termine = true;
          if (maGeneration === generation) fluxPatiente = false;
        }
      })();
      return {
        ajouter(nouveaux) {
          if (termine || maGeneration !== generation) return;
          morceaux.push(...nouveaux);
          preparerLaSuite();
          reveiller();
        },
        terminer() {
          termine = true;
          reveiller();
        },
        annuler() {
          // Seulement si c'est encore cette lecture qui est en cours : une plus récente n'est pas touchée.
          if (maGeneration === generation) arreter();
        },
        fini,
      };
    },
    interrompre() {
      if (fluxPatiente) return;
      arreter();
    },
    arreter,
    niveau() {
      if (!courant) return 0;
      analyseur.getFloatTimeDomainData(echantillons);
      let somme = 0;
      for (let i = 0; i < echantillons.length; i += 1) somme += echantillons[i] * echantillons[i];
      return Math.min(1, Math.sqrt(somme / echantillons.length) * 6);
    },
  };
}
