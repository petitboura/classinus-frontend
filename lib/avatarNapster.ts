"use client";

// Créé le 16/11/2026, Bourama : avatar Napster du mode vocal. Il remplace seulement l'onde, en plein
// écran et en petite bulle, rien d'autre. Comme la voix Gemini Live (lib/geminiLive.ts), il est un
// interprète : il écoute et parle, et passe toute vraie demande au cerveau de Classinus par l'outil
// « demander_a_classinus », puis dit l'essentiel de la réponse. Napster ne reçoit aucun identifiant
// d'élève et ne garde donc aucune mémoire.
//
// Interrupteur : variable AVATAR_NAPSTER_ACTIF du serveur (lib/avatarNapsterApi.ts, lireEtatAvatarNapster).
// Éteint, aucune session n'est jamais ouverte et le mode vocal reste celui d'avant.
//
// Le paquet Napster est chargé seulement à l'ouverture de l'avatar (import dynamique), il ne pèse
// donc rien pour qui n'utilise pas le mode vocal. L'élément qui porte la vidéo est créé ici, une
// seule fois, et seulement déplacé et redimensionné ensuite (afficher) : passer du plein écran à la
// bulle ne coupe donc jamais la connexion. La vidéo n'est jamais cliquable, le clic sur la bulle est
// reçu par le bouton de components/voix/VoixDirecteSuperposition.tsx placé dessous.

import type { NapsterCompanionApiInstance } from "@touchcastllc/napster-companion-api";
import { COUCHE_VOIX_PLEIN_ECRAN } from "./couchesAgent";
import { messageErreurVoix } from "./erreurs";
import { demanderJetonAvatarNapster, type JetonAvatarNapster } from "./avatarNapsterApi";
import type { NiveauxVoix, SessionGeminiLive } from "./geminiLive";

// Le paquet n'exporte pas ce type : on le déduit de la méthode qui l'utilise.
type CommandeAvatar = Parameters<NapsterCompanionApiInstance["sendCommand"]>[0];

export type ModeAvatar = "plein" | "mini" | "cache";

export type EtatAvatar = "connexion" | "connecte" | "ecoute" | "reponse" | "travail" | "erreur";

export type SessionAvatarNapster = SessionGeminiLive & {
  /** Plein écran, petite bulle, ou caché (canal en direct) : la connexion reste la même. */
  afficher: (mode: ModeAvatar) => void;
  /** Faux si la session s'est fermée d'elle même pendant son ouverture. */
  ouverte: () => boolean;
};

export type OptionsAvatarNapster = {
  surEtat: (etat: EtatAvatar | "ferme") => void;
  surErreur: (message: string | null) => void;
  // La demande de l'étudiant, transmise au cerveau de Classinus ; renvoie sa réponse écrite.
  surDemande: (question: string) => Promise<string>;
  modeInitial?: ModeAvatar;
};

export const TAILLE_AVATAR_MINI = 104;

const ID_HOTE = "classinus-avatar-napster";
const ID_STYLE = "classinus-avatar-napster-style";
const BAS_SECURISE = "(env(safe-area-inset-bottom, 0px) + var(--dj-barre-onglets-web, 0px))";
// L'outil doit répondre en moins de 10 secondes côté Napster. Au delà, on répond « en cours » et la
// vraie réponse est envoyée ensuite.
const DELAI_OUTIL_MS = 7000;
const LONGUEUR_MAX_REPONSE = 4000;
// Texte lu par le modèle de l'avatar (pas affiché à l'écran), donc pas à traduire.
const CONSIGNE_PARAMETRE = "La demande de l'utilisateur, avec ses propres mots.";

function tronquer(texte: string): string {
  return texte.length > LONGUEUR_MAX_REPONSE ? `${texte.slice(0, LONGUEUR_MAX_REPONSE)}…` : texte;
}

function lireDemande(argumentsOutil: unknown): string {
  let objet: unknown = argumentsOutil;
  if (typeof argumentsOutil === "string") {
    try {
      objet = JSON.parse(argumentsOutil);
    } catch {
      return argumentsOutil.trim();
    }
  }
  const demande = objet && typeof objet === "object" ? (objet as Record<string, unknown>).demande : undefined;
  return typeof demande === "string" ? demande.trim() : "";
}

function creerHote(): HTMLDivElement {
  document.getElementById(ID_HOTE)?.remove();
  document.getElementById(ID_STYLE)?.remove();
  const style = document.createElement("style");
  style.id = ID_STYLE;
  // Rien dans la vidéo ne capture un clic : le bouton de la bulle, dessous, le reçoit.
  style.textContent = `#${ID_HOTE}, #${ID_HOTE} * { pointer-events: none !important; }`;
  document.head.appendChild(style);
  const hote = document.createElement("div");
  hote.id = ID_HOTE;
  hote.setAttribute("aria-hidden", "true");
  document.body.appendChild(hote);
  return hote;
}

function appliquerMode(hote: HTMLElement, mode: ModeAvatar) {
  const s = hote.style;
  s.position = "fixed";
  s.zIndex = String(COUCHE_VOIX_PLEIN_ECRAN + 1);
  s.overflow = "hidden";
  s.transition = "left 300ms ease, top 300ms ease, width 300ms ease, height 300ms ease, transform 300ms ease, border-radius 300ms ease, opacity 250ms ease";
  if (mode === "plein") {
    s.width = "min(92vw, 28rem)";
    s.height = "min(66dvh, 34rem)";
    s.left = "50%";
    s.top = "50%";
    s.transform = "translate(-50%, -50%)";
    s.borderRadius = "1.5rem";
    s.boxShadow = "none";
    s.opacity = "1";
    s.visibility = "visible";
  } else if (mode === "mini") {
    // Même place que la bulle de l'onde : à droite, au dessus de la barre de saisie.
    s.width = `${TAILLE_AVATAR_MINI}px`;
    s.height = `${TAILLE_AVATAR_MINI}px`;
    s.left = `calc(100% - ${TAILLE_AVATAR_MINI}px - 12px)`;
    s.top = `calc(100% - ${TAILLE_AVATAR_MINI}px - 9rem - ${BAS_SECURISE})`;
    s.transform = "translate(0px, 0px)";
    s.borderRadius = "9999px";
    s.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.25)";
    s.opacity = "1";
    s.visibility = "visible";
  } else {
    s.opacity = "0";
    s.visibility = "hidden";
  }
}

export async function ouvrirAvatarNapster(options: OptionsAvatarNapster): Promise<SessionAvatarNapster> {
  const { surEtat, surErreur, surDemande } = options;
  surEtat("connexion");

  const module = await import("@touchcastllc/napster-companion-api");
  const Sdk = module.default;
  const Types = module.DataChannelMessageType;

  const hote = creerHote();
  let mode: ModeAvatar = options.modeInitial ?? "plein";
  appliquerMode(hote, mode);

  let instance: NapsterCompanionApiInstance | null = null;
  let reglages: JetonAvatarNapster | null = null;
  let erreurJeton: unknown = null;
  let ferme = false;
  let pret = false;
  let preparee = false;
  let avatarParle = false;
  let niveauEntree = 0;
  let niveauSortie = 0;
  const appelsVus = new Set<string>();

  const envoyer = (commande: CommandeAvatar) => {
    try {
      instance?.sendCommand(commande);
    } catch (e) {
      console.warn("Avatar Napster : commande non envoyée :", e);
    }
  };
  const envoyerSysteme = (texte: string, repondre: boolean) => {
    if (!texte.trim()) return;
    envoyer({ type: Types.SEND_MESSAGE, data: { text: texte, role: "system", trigger_response: repondre } });
  };

  const fermerSession = () => {
    if (ferme) return;
    ferme = true;
    try {
      instance?.destroy();
    } catch {
      // Déjà détruit.
    }
    instance = null;
    hote.remove();
    document.getElementById(ID_STYLE)?.remove();
    surEtat("ferme");
  };
  const echouer = (e: unknown) => {
    if (ferme) return;
    surErreur(messageErreurVoix(e));
    fermerSession();
  };

  // Enregistre l'outil vers le cerveau de Classinus, donne les consignes, puis fait saluer l'avatar.
  // Une seule fois, quand la connexion ET l'instance sont prêtes.
  const preparer = () => {
    if (preparee || !pret || !instance || !reglages) return;
    preparee = true;
    const nom = reglages.nom_outil;
    envoyer({
      type: Types.SET_SETTINGS,
      data: {
        modality: "video",
        inline_functions: [
          {
            id: nom,
            flow: "implicit",
            modality: "video",
            data: {
              name: nom,
              description: reglages.description_outil,
              parameters: {
                type: "object",
                properties: { demande: { type: "string", description: CONSIGNE_PARAMETRE } },
                required: ["demande"],
              },
            },
          },
        ],
      },
    });
    envoyerSysteme(reglages.consignes, false);
    envoyerSysteme(reglages.accueil, true);
    surEtat("ecoute");
  };

  const traiterAppel = async (idAppel: string, argumentsOutil: unknown) => {
    const sortie = (output: unknown) => envoyer({ type: Types.FUNCTION_CALL_OUTPUT, data: { call_id: idAppel, output, delay: false } });
    const demande = lireDemande(argumentsOutil);
    if (!demande) {
      sortie({ erreur: "La demande est vide." });
      return;
    }
    surEtat("travail");
    const promesse = surDemande(demande).then(
      (texte) => ({ ok: true as const, texte }),
      (e: unknown) => ({ ok: false as const, texte: messageErreurVoix(e) })
    );
    const rapide = await Promise.race([
      promesse,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), DELAI_OUTIL_MS)),
    ]);
    if (ferme) return;
    if (rapide) {
      sortie(rapide.ok ? { reponse: tronquer(rapide.texte) } : { erreur: rapide.texte });
      surEtat("ecoute");
      return;
    }
    // Trop long pour l'outil : réponse d'attente maintenant, la vraie réponse suit par message.
    sortie({ statut: "en cours", consigne: reglages?.attente ?? "" });
    const fin = await promesse;
    if (ferme) return;
    envoyerSysteme(`${reglages?.suite_demande ?? ""}${tronquer(fin.texte)}`, true);
    surEtat("ecoute");
  };

  const surDonnees = (message: { event?: string; data?: Record<string, unknown> | null }) => {
    if (ferme) return;
    const evenement = message.event;
    const donnees = message.data ?? {};
    if (evenement === "function_implicitly_called") {
      const idAppel = typeof donnees.call_id === "string" ? donnees.call_id : "";
      if (!idAppel || appelsVus.has(idAppel)) return;
      if (donnees.name !== reglages?.nom_outil) return;
      appelsVus.add(idAppel);
      void traiterAppel(idAppel, donnees.arguments);
    } else if (evenement === "talk_state_changed") {
      const etat = donnees.state;
      if (etat === "started" || etat === "in_progress") {
        avatarParle = true;
        surEtat("reponse");
      } else if (etat === "ended" || etat === "canceled") {
        avatarParle = false;
        surEtat("ecoute");
      }
    } else if (evenement === "session_expired" || evenement === "no_credits_left" || evenement === "provider_connection_aborted") {
      echouer(new Error(String(evenement)));
    }
  };

  try {
  instance = await Sdk.init(
    async () => {
      try {
        reglages = await demanderJetonAvatarNapster();
        return reglages.token;
      } catch (e) {
        erreurJeton = e;
        throw e;
      }
    },
    {
      layout: { type: "inline", mountContainer: hote },
      style: { view: "rectangle" },
      // Nos propres boutons (réduire, arrêter) remplacent ceux du paquet.
      features: { controls: { enabled: false }, disclaimer: { enabled: false }, inactiveTimeout: { enabled: false } },
      onData: surDonnees,
      onAvatarReady: () => {
        pret = true;
        preparer();
      },
      onSessionStatusChange: (statut) => {
        if (statut === "permissionBlocked") echouer({ name: "NotAllowedError" });
      },
      onError: (e) => {
        const cause = erreurJeton ?? e;
        erreurJeton = null;
        // Une erreur après le démarrage n'est pas forcément fatale : les évènements de fin de session ferment.
        if (pret) console.warn("Avatar Napster :", e);
        else echouer(cause);
      },
      onDestroy: () => fermerSession(),
    }
  );
  } catch (e) {
    // L'ouverture a échoué avant d'avoir une session : on ne laisse rien derrière.
    hote.remove();
    document.getElementById(ID_STYLE)?.remove();
    throw e;
  }
  // La connexion peut être déjà prête quand l'instance arrive.
  preparer();
  if (ferme) instance?.destroy();

  return {
    niveaux: (): NiveauxVoix => {
      const parleMicro = instance?.isUserTalking ?? false;
      niveauEntree += ((parleMicro ? 0.7 : 0) - niveauEntree) * 0.2;
      niveauSortie += (((avatarParle || instance?.isAvatarSpeaking) ? 0.8 : 0) - niveauSortie) * 0.2;
      return { entree: niveauEntree, sortie: niveauSortie };
    },
    fermer: fermerSession,
    interrompre: () => envoyer({ type: Types.CANCEL }),
    annoncerReponse: (texte: string) => {
      if (!reglages) return;
      envoyerSysteme(`${reglages.annonce_reponse}${tronquer(texte)}`, true);
    },
    direMessageBulle: (texte: string) => {
      if (!reglages) return;
      envoyerSysteme(`${reglages.annonce_bulle}${tronquer(texte)}`, true);
    },
    ouverte: () => !ferme,
    afficher: (nouveau: ModeAvatar) => {
      if (ferme || nouveau === mode) return;
      mode = nouveau;
      appliquerMode(hote, mode);
    },
  };
}
