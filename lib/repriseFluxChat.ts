// Lecture du flux du chat et reprise après une coupure (28/10/2026, demande de Bourama : changer de
// conversation, recharger la page ou perdre la connexion ne doit plus arrêter le travail).
//
// Le serveur fait tourner chaque tour de chat dans un thread à lui, indépendant de la connexion
// (core/tours_detaches.py côté backend) et garde ses événements dans l'ordre. Ce module sait
// donc, quand la lecture s'interrompt sans que le tour soit fini :
// - compter les événements déjà remis à l'écran ;
// - se rattacher au même tour (GET /api/chat/flux/{tour_id}?depuis=N) et reprendre exactement
//   après le dernier événement reçu, sans doublon ni trou.
//
// Aucune dépendance sur le reste de l'application : l'ouverture de la connexion (jeton, langue,
// adresse du serveur) est fournie par l'appelant, voir lib/api.ts.

/**
 * Raison donnée à AbortController.abort() quand la page quitte la conversation (le composant du
 * chat est retiré). Distincte d'un arrêt voulu par la personne : le travail continue sur le
 * serveur et l'appelant ne doit afficher ni erreur ni « réponse interrompue ».
 */
export const RAISON_DEMONTAGE = "demontage";

// Pauses entre deux tentatives de reconnexion, en millisecondes. La dernière valeur se répète.
const DELAIS_RECONNEXION_MS = [500, 1000, 2000, 4000, 8000, 15000];
// Au bout de ce temps sans réussir à se rattacher, on abandonne. Le serveur garde le tour bien
// plus longtemps (30 minutes par défaut) : recharger la page retrouve alors le résultat.
const DUREE_MAX_RECONNEXION_MS = 10 * 60 * 1000;
// Silence maximal toléré sur une connexion censée être vivante. Le flux de rattachement envoie un
// signe de vie toutes les 15 secondes : bien au delà, la connexion est morte sans l'avoir dit
// (téléphone en veille, réseau qui a changé). Le flux d'origine n'en envoie pas : une longue
// attente d'outil le fait passer pour mort, ce qui est sans conséquence, la reconnexion repart
// du dernier événement reçu et rattrape le flux vivant.
const SILENCE_MAX_MS = 40 * 1000;

export type IssueFlux = "fini" | "coupe";

/** Nombre d'événements déjà remis à l'appelant : la position à laquelle reprendre. */
export interface CompteurFlux {
  recus: number;
}

/** Réponse de GET /api/chat/tour-en-cours (api/chat.py). */
export interface EtatTourEnCours {
  statut: "aucun" | "en_cours" | "termine";
  tour_id?: string;
  nb_evenements?: number;
  // Identifiants de l'échange une fois sauvegardé côté serveur, absents tant qu'il ne l'est pas.
  ids?: { message_id_user?: number | null; message_id_assistant?: number | null } | null;
  resume?: {
    type: "message" | "reprise" | "regeneration";
    message?: string | null;
    automatique?: boolean;
    parent_id?: number | null;
  };
}

/** Vrai si l'arrêt vient du retrait du composant (voir RAISON_DEMONTAGE), pas d'une demande. */
export function demontageDemande(signal?: AbortSignal): boolean {
  return !!signal?.aborted && signal.reason === RAISON_DEMONTAGE;
}

// Nombre de reconnexions en cours dans la page, pour afficher un indicateur (voir
// components/chat/BandeauReconnexionFlux.tsx).
let reconnexionsEnCours = 0;
const ecouteursReconnexion = new Set<() => void>();

function changerReconnexions(delta: number) {
  reconnexionsEnCours = Math.max(0, reconnexionsEnCours + delta);
  ecouteursReconnexion.forEach((ecouteur) => ecouteur());
}

export function abonnerReconnexionFlux(ecouteur: () => void): () => void {
  ecouteursReconnexion.add(ecouteur);
  return () => {
    ecouteursReconnexion.delete(ecouteur);
  };
}

export function reconnexionFluxEnCours(): boolean {
  return reconnexionsEnCours > 0;
}

/**
 * Lit un flux d'événements SSE (`data: {...}` séparés par une ligne vide) et remet chacun à
 * `surEvenement`. Les lignes de commentaire (signe de vie du serveur) sont ignorées.
 *
 * `tolererCoupure` faux (visiteur, flux sans tour détaché) : comportement d'origine, une erreur de
 * lecture est relancée et une fin de flux sans « [DONE] » compte comme une fin normale.
 * Vrai : l'une comme l'autre rend "coupe", pour que l'appelant se reconnecte.
 */
export async function lireFluxSse(
  reponse: Response,
  surEvenement: (evenement: any) => void,
  signal: AbortSignal | undefined,
  compteur: CompteurFlux,
  tolererCoupure: boolean
): Promise<IssueFlux> {
  if (!reponse.body) return tolererCoupure ? "coupe" : "fini";
  const lecteur = reponse.body.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";

  try {
    while (true) {
      // Un arrêt peut arriver entre deux morceaux reçus : annuler aussi
      // explicitement le lecteur libère la connexion sans attendre un chunk.
      if (signal?.aborted) {
        await lecteur.cancel().catch(() => {});
        return "fini";
      }

      let lecture: ReadableStreamReadResult<Uint8Array>;
      let minuteurSilence: ReturnType<typeof setTimeout> | undefined;
      try {
        if (tolererCoupure) {
          const silence = new Promise<"silence">((resoudre) => {
            minuteurSilence = setTimeout(() => resoudre("silence"), SILENCE_MAX_MS);
          });
          const resultat = await Promise.race([lecteur.read(), silence]);
          if (resultat === "silence") {
            await lecteur.cancel().catch(() => {});
            return "coupe";
          }
          lecture = resultat;
        } else {
          lecture = await lecteur.read();
        }
      } catch (e) {
        if (signal?.aborted || !tolererCoupure) throw e;
        return "coupe";
      } finally {
        if (minuteurSilence) clearTimeout(minuteurSilence);
      }

      if (lecture.done) return tolererCoupure ? "coupe" : "fini";
      tampon += decodeur.decode(lecture.value, { stream: true });

      // Un événement SSE = une ligne "data: {...}", séparée par \n\n.
      const morceaux = tampon.split("\n\n");
      tampon = morceaux.pop() ?? "";

      for (const morceau of morceaux) {
        const ligne = morceau.trim();
        if (!ligne.startsWith("data:")) continue;
        const contenu = ligne.slice("data:".length).trim();
        if (contenu === "[DONE]") {
          await lecteur.cancel().catch(() => {});
          return "fini";
        }
        // Compté avant la remise : le serveur numérote chaque ligne "data:", même mal formée.
        compteur.recus += 1;
        try {
          surEvenement(JSON.parse(contenu));
        } catch {
          // Ligne mal formée : on l'ignore plutôt que de casser tout le flux.
        }
      }
    }
  } finally {
    // Chaque tour de chat acquiert un reader : ne pas conserver le verrou
    // après [DONE], annulation, fin du flux ou erreur de lecture.
    try {
      lecteur.releaseLock();
    } catch {
      // Un reader déjà libéré/annulé ne doit pas masquer l'erreur initiale.
    }
  }
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resoudre) => {
    if (signal?.aborted) return resoudre();
    const fin = () => {
      clearTimeout(minuteur);
      signal?.removeEventListener("abort", fin);
      resoudre();
    };
    const minuteur = setTimeout(fin, ms);
    signal?.addEventListener("abort", fin);
  });
}

// Hors ligne, inutile d'enchaîner des tentatives qui échouent : on attend le retour du réseau.
function attendreRetourReseau(signal: AbortSignal | undefined, debut: number): Promise<void> {
  if (typeof navigator === "undefined" || typeof window === "undefined" || navigator.onLine !== false) {
    return Promise.resolve();
  }
  return new Promise((resoudre) => {
    const fin = () => {
      clearTimeout(minuteur);
      window.removeEventListener("online", fin);
      signal?.removeEventListener("abort", fin);
      resoudre();
    };
    const minuteur = setTimeout(fin, Math.max(0, DUREE_MAX_RECONNEXION_MS - (Date.now() - debut)));
    window.addEventListener("online", fin);
    signal?.addEventListener("abort", fin);
  });
}

export interface OptionsReprise {
  compteur: CompteurFlux;
  // Ouvre GET /api/chat/flux/{tour_id}?depuis={depuis} (jeton et langue frais à chaque appel).
  ouvrirFlux: (depuis: number, signal?: AbortSignal) => Promise<Response>;
  surEvenement: (evenement: any) => void;
  signal?: AbortSignal;
  // Ce qui a coupé la première lecture, relancé tel quel si la reconnexion échoue pour de bon.
  erreurInitiale?: unknown;
}

/**
 * Se rattache au tour et reprend la lecture juste après le dernier événement reçu, autant de fois
 * qu'il faut, jusqu'à la fin du tour. Rend la main quand le tour est fini ou quand `signal` est
 * levé. Relance `erreurInitiale` (ou une erreur générique) quand le tour n'existe plus côté serveur
 * (redémarrage, tour trop ancien) ou que la reconnexion échoue trop longtemps.
 */
export async function reprendreFluxApresCoupure(options: OptionsReprise): Promise<void> {
  const { compteur, ouvrirFlux, surEvenement, signal, erreurInitiale } = options;
  const debut = Date.now();
  let tentative = 0;
  changerReconnexions(1);
  try {
    while (true) {
      if (signal?.aborted) return;
      if (Date.now() - debut > DUREE_MAX_RECONNEXION_MS) {
        throw erreurInitiale ?? new Error("Connexion perdue");
      }
      await attendreRetourReseau(signal, debut);
      await pause(DELAIS_RECONNEXION_MS[Math.min(tentative, DELAIS_RECONNEXION_MS.length - 1)], signal);
      if (signal?.aborted) return;
      tentative += 1;

      let reponse: Response;
      try {
        reponse = await ouvrirFlux(compteur.recus, signal);
      } catch {
        // Réseau encore coupé : on recommence après la pause suivante.
        continue;
      }
      if (reponse.status === 401 || reponse.status === 403 || reponse.status === 404) {
        // Plus de tour à rejoindre (serveur redémarré, tour oublié) ou plus le droit de le lire :
        // réessayer ne changera rien.
        await reponse.body?.cancel().catch(() => {});
        throw erreurInitiale ?? new Error("Tour introuvable");
      }
      if (!reponse.ok || !reponse.body) {
        await reponse.body?.cancel().catch(() => {});
        continue;
      }

      const avant = compteur.recus;
      const issue = await lireFluxSse(reponse, surEvenement, signal, compteur, true);
      if (issue === "fini") return;
      // Une connexion qui a livré quelque chose repart d'une pause courte.
      if (compteur.recus > avant) tentative = 0;
    }
  } finally {
    changerReconnexions(-1);
  }
}
