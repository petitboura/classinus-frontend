// Page bambara : phrases proactives (22/11/2026, demande de Bourama). Logique pure, sans navigateur, pour
// pouvoir la tester (tests/verifier-phrases-bambara.mjs).
//
// La page parle d'elle même à six moments pour que la personne ne reste jamais devant le silence : l'arrivée
// sur la page, une recherche web, une recherche de vidéos, une recherche d'images, la création d'une image,
// et un outil qui prend du temps. Les textes vivent dans Supabase (table bambara_phrases_proactives) et le
// serveur en fabrique l'audio avec la voix du TTS : rien n'est écrit ici, ni phrase, ni délai.
//
// Règle de Bourama : une phrase n'est JAMAIS coupée par l'arrivée de la réponse. La réponse attend la fin de
// la phrase qui parle. Seul un geste explicite de la personne (arrêter, nouvelle conversation, réécouter un
// message, lancer une vidéo) l'arrête. Les phrases ne se mélangent jamais : une seule parle à la fois, les
// autres attendent leur tour, et celles qui n'ont plus de raison d'être (l'outil a fini) sont retirées avant
// de commencer.

import type { EffetConstruction } from "./pageBambaraVisuels";

export const MOMENTS_PHRASES = [
  "accueil",
  "recherche_web",
  "recherche_videos",
  "recherche_images",
  "creation_image",
  "outil_lent",
] as const;

export type MomentPhrase = (typeof MOMENTS_PHRASES)[number];

export type PhraseDispo = { id: string; moment: MomentPhrase; dureeMs: number; version: string };

export type ReglagesPhrases = { delaiOutilLentS: number; intervalleOutilLentS: number };

export type ListePhrases = { reglages: ReglagesPhrases; phrases: PhraseDispo[]; enPreparation: number };

/** Valeurs de secours, les mêmes que la migration : le serveur donne les vraies. */
export const REGLAGES_PAR_DEFAUT: ReglagesPhrases = { delaiOutilLentS: 6, intervalleOutilLentS: 12 };

const MOMENTS_CONNUS: ReadonlySet<string> = new Set(MOMENTS_PHRASES);

/** Le moment de la phrase qui accompagne un effet de construction. */
export function momentPourEffet(effet: EffetConstruction): MomentPhrase {
  switch (effet) {
    case "recherche":
      return "recherche_web";
    case "videos":
      return "recherche_videos";
    case "images":
      return "recherche_images";
    case "creation":
      return "creation_image";
  }
}

function entierBorne(valeur: unknown, defaut: number, minimum: number, maximum: number): number {
  return typeof valeur === "number" && Number.isInteger(valeur) && valeur >= minimum && valeur <= maximum ? valeur : defaut;
}

/** Lit la réponse du serveur sans jamais lever d'erreur : ce qui est invalide est ignoré. */
export function lireListePhrases(brut: unknown): ListePhrases {
  const objet = brut && typeof brut === "object" ? (brut as Record<string, unknown>) : {};
  const reglagesBruts = objet.reglages && typeof objet.reglages === "object" ? (objet.reglages as Record<string, unknown>) : {};
  const reglages: ReglagesPhrases = {
    delaiOutilLentS: entierBorne(reglagesBruts.delai_outil_lent_s, REGLAGES_PAR_DEFAUT.delaiOutilLentS, 1, 120),
    intervalleOutilLentS: entierBorne(reglagesBruts.intervalle_outil_lent_s, REGLAGES_PAR_DEFAUT.intervalleOutilLentS, 3, 300),
  };
  const phrases: PhraseDispo[] = [];
  const vus = new Set<string>();
  if (Array.isArray(objet.phrases)) {
    for (const element of objet.phrases) {
      if (!element || typeof element !== "object") continue;
      const p = element as Record<string, unknown>;
      if (typeof p.id !== "string" || !p.id || vus.has(p.id)) continue;
      if (typeof p.moment !== "string" || !MOMENTS_CONNUS.has(p.moment)) continue;
      if (typeof p.version !== "string" || !p.version) continue;
      vus.add(p.id);
      phrases.push({
        id: p.id,
        moment: p.moment as MomentPhrase,
        dureeMs: typeof p.duree_ms === "number" && p.duree_ms >= 0 ? p.duree_ms : 0,
        version: p.version,
      });
    }
  }
  const enPreparation = typeof objet.en_preparation === "number" && objet.en_preparation > 0 ? Math.floor(objet.en_preparation) : 0;
  return { reglages, phrases, enPreparation };
}

/**
 * Choisit une variante d'un moment au hasard, sans répéter celle qui vient de passer quand il y en a
 * plusieurs. `aleatoire` rend un nombre entre 0 inclus et 1 exclu (Math.random, ou un faux pour les tests).
 */
export function choisirVariante(
  phrases: readonly PhraseDispo[],
  moment: MomentPhrase,
  dernierId: string | null,
  aleatoire: () => number = Math.random
): PhraseDispo | null {
  const candidates = phrases.filter((p) => p.moment === moment);
  if (candidates.length === 0) return null;
  const autres = candidates.length > 1 && dernierId ? candidates.filter((p) => p.id !== dernierId) : candidates;
  const rang = Math.min(autres.length - 1, Math.max(0, Math.floor(aleatoire() * autres.length)));
  return autres[rang];
}

export type DemandePhrase = {
  moment: MomentPhrase;
  /** Rend faux dès que la phrase n'a plus de raison d'être (l'outil a fini, la personne a parlé) : elle est alors sautée. */
  valable: () => boolean;
};

export type OutilsOrdonnanceur = {
  /** Prépare la phrase du moment et rend sa clé de lecture, ou null si elle n'est pas disponible à temps. */
  charger: (moment: MomentPhrase) => Promise<string | null>;
  /** Le navigateur autorise le son (sinon la phrase est sautée, jamais retardée à un geste). */
  peutJouer: () => Promise<boolean>;
  /** Joue la phrase jusqu'au bout. Se termine aussi quand `arreter` la coupe. */
  jouer: (cle: string) => Promise<void>;
  arreter: () => void;
  surDebut: (moment: MomentPhrase) => void;
  surFin: (moment: MomentPhrase) => void;
};

export type Ordonnanceur = {
  /** Met une phrase dans la file. Un moment déjà en attente ou en cours n'est pas ajouté une seconde fois. */
  demander: (moment: MomentPhrase, valable?: () => boolean) => void;
  /** Retire les phrases qui n'ont pas encore commencé. Celle qui parle finit. */
  annulerEnAttente: () => void;
  /** Se termine quand plus aucune phrase ne parle ni n'attend. */
  attendreFin: () => Promise<void>;
  /** Geste explicite de la personne : la phrase qui parle s'arrête et la file est vidée. */
  interrompre: () => void;
  enCours: () => MomentPhrase | null;
};

export function creerOrdonnanceur(outils: OutilsOrdonnanceur): Ordonnanceur {
  let file: DemandePhrase[] = [];
  let courante: DemandePhrase | null = null;
  let enChargement: DemandePhrase | null = null;
  let tourne = false;
  let attentes: Array<() => void> = [];

  // Rien ne parle, rien ne charge, rien n'attend : ce que `attendreFin` attend est arrivé.
  const inactif = () => courante === null && enChargement === null && file.length === 0;

  const liberer = () => {
    const a = attentes;
    attentes = [];
    a.forEach((reprendre) => reprendre());
  };

  const verifierInactif = () => {
    if (inactif()) liberer();
  };

  async function pomper(): Promise<void> {
    if (tourne) return;
    tourne = true;
    try {
      while (file.length > 0) {
        const demande = file.shift() as DemandePhrase;
        if (!demande.valable()) continue;
        enChargement = demande;
        let cle: string | null = null;
        try {
          cle = await outils.charger(demande.moment);
        } catch {
          cle = null;
        }
        // Retirée de la file pendant le chargement (annulerEnAttente, interrompre) : elle ne passe pas.
        if (enChargement !== demande) continue;
        enChargement = null;
        if (!cle || !demande.valable()) continue;
        let autorise = false;
        try {
          autorise = await outils.peutJouer();
        } catch {
          autorise = false;
        }
        if (!autorise || !demande.valable()) continue;
        courante = demande;
        outils.surDebut(demande.moment);
        try {
          await outils.jouer(cle);
        } catch {
          // Une phrase qui échoue est passée sous silence : la page ne montre jamais d'erreur.
        } finally {
          courante = null;
          outils.surFin(demande.moment);
          verifierInactif();
        }
      }
    } finally {
      enChargement = null;
      tourne = false;
      verifierInactif();
    }
  }

  return {
    demander(moment, valable = () => true) {
      if (courante?.moment === moment || enChargement?.moment === moment || file.some((d) => d.moment === moment)) return;
      file.push({ moment, valable });
      void pomper();
    },
    annulerEnAttente() {
      file = [];
      // Une phrase encore en chargement n'a pas commencé : elle compte comme en attente.
      enChargement = null;
      verifierInactif();
    },
    attendreFin() {
      if (inactif()) return Promise.resolve();
      return new Promise<void>((resoudre) => {
        attentes.push(resoudre);
      });
    },
    interrompre() {
      file = [];
      enChargement = null;
      if (courante) outils.arreter();
      else verifierInactif();
    },
    enCours: () => courante?.moment ?? null,
  };
}

/** Garde les opérations en cours par clé : évite deux téléchargements du même audio en même temps. */
export function creerMemoireDeTaches<T>() {
  const taches = new Map<string, Promise<T>>();
  return {
    obtenir(cle: string, lancer: () => Promise<T>): Promise<T> {
      const existante = taches.get(cle);
      if (existante) return existante;
      const nouvelle = lancer().catch((e) => {
        // Un échec n'est pas gardé : la prochaine demande retente.
        taches.delete(cle);
        throw e;
      });
      taches.set(cle, nouvelle);
      return nouvelle;
    },
  };
}
