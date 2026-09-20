"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier I. État global du canal
// en direct de l'agent applicatif -- monté une seule fois au niveau
// du layout racine (voir AppShell.tsx), au dessus du router, jamais
// démonté en changeant de section. Même séparation état/rendu que le
// reste du chantier agent applicatif (ContexteCurseurVirtuel) :
// l'état vit ici, le rendu de la bulle de dialogue (chantier J) et du
// bouton journal (chantier K) vit dans des composants séparés qui
// consomment ce contexte.
//
// Porte trois choses, toutes indépendantes les unes des autres :
// - actif : le canal en direct est-il activé pour cette session
//   (chantier L, bouton d'activation) ;
// - dernierTexte : le texte que Clovis a le plus récemment à dire à
//   l'user (chantier J, bulle qui suit le curseur) -- null quand il
//   n'y a rien à afficher, la bulle reste alors fermée ;
// - journal : historique des actions/outils exécutés pendant la
//   session en cours (chantier K, bouton dédié).
//
// Décision Bourama (19/09/2026) : pas de persistance à travers un
// rechargement complet de page pour la v1 -- tout ce state repart de
// zéro à chaque ouverture de l'app, cohérent avec le reste du
// chantier.

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// "refuse" retiré (19/09/2026) : plus aucune confirmation ne peut
// produire cet état, voir lib/canalAgentApplicatif.ts.
export type StatutEntreeJournal = "en_cours" | "succes" | "erreur";

export type EntreeJournalCanal = {
  id: string;
  description: string;
  statut: StatutEntreeJournal;
  horodatage: number;
};

// Chantier M : dernier mode d'interaction utilisé par l'user pendant que
// Clovis travaille (un des deux boutons, voix ou écriture).
export type ModeInteraction = "voix" | "texte";

// Chantier N : moteur de dictée choisi. "whisper" = enregistrement micro
// transcrit par Whisper/Groq côté backend (déjà utilisé dans le chat),
// "navigateur" = Web Speech API du navigateur.
export type MoteurDictee = "whisper" | "navigateur";

// Réponse finale de Clovis à un message de l'étudiant (décision Bourama,
// 19/09/2026 : la bulle affiche DEUX choses distinctes). L'information
// (dernierTexte : ce que Clovis fait, ses petits commentaires) reste du
// texte simple ; la réponse, elle, peut contenir tout ce que le chat sait
// afficher (titres, tableaux, code, formules, schémas, QCM, questions...),
// avec les sources et images trouvées par ses outils pendant ce tour.
export type SourceCanal = {
  numero: number;
  titre: string;
  url: string;
  extrait?: string;
  url_extrait?: string;
  reperage?: string;
  position_type?: "page" | "timestamp";
  position_valeur?: number;
  type_mime?: string | null;
};

export type ImageCanal = { titre: string; url: string; miniature: string; credit?: string | null };

export type ReponseCanal = {
  // Change à chaque nouvelle réponse : sert de clé d'état côté rendu
  // (une question déjà répondue ne doit pas rester verrouillée sur la
  // réponse suivante).
  id: number;
  texte: string;
  sources: SourceCanal[];
  images: ImageCanal[];
};

export type ValeurCanalEnDirect = {
  actif: boolean;
  // conversationId optionnel (chantier "demo + guide visuel", 20/09/2026,
  // demande Bourama) : permet a un appelant de CHOISIR l'id AVANT
  // d'activer le canal, meme besoin et meme raison que demandeGuide dans
  // lib/contexteChat.tsx -- pour pouvoir activer le mode decouverte cote
  // serveur (PUT .../guide-actif) avec ce meme id avant le tout premier
  // message. Undefined (usage normal, bouton canal en direct) : id
  // genere ici comme avant, comportement inchange.
  activer: (conversationId?: string) => void;
  desactiver: () => void;
  // Ajouté le 19/09/2026 (decision Bourama : le canal doit pouvoir
  // déclencher lui même un vrai tour de Clovis, "comme si de rien
  // n'était", sans jamais ouvrir le chat) : conversation dédiée à la
  // session du canal, générée UNE FOIS à l'activation, réutilisée pour
  // tous les messages envoyés tant que le canal reste actif -- jamais
  // celle du chat normal (voir lib/canalAgentApplicatif.ts,
  // envoyerTourCanalDirect). Distincte à dessein : le canal reste
  // "quelque chose à part", pas mélangé à une conversation de chat en
  // cours. Cette conversation reste consultable normalement plus tard
  // depuis l'historique du chat, comme n'importe quelle autre.
  conversationId: string | null;

  modeInteraction: ModeInteraction;
  choisirModeInteraction: (mode: ModeInteraction) => void;
  moteurDictee: MoteurDictee;
  choisirMoteurDictee: (moteur: MoteurDictee) => void;

  dernierTexte: string | null;
  // Remplace le texte affiché ; horodatage inclus pour que la bulle
  // (chantier J) puisse redémarrer une animation même si le nouveau
  // texte est identique au précédent.
  afficherTexte: (texte: string) => void;
  effacerTexte: () => void;

  // Réponse (voir ReponseCanal). derniereReponse est GARDÉE après sa
  // fermeture : cliquer sur le curseur de Clovis la fait réapparaître
  // (basculerReponse). Elle se ferme seule après un délai proportionnel à
  // sa longueur, sauf tant que l'étudiant a le pointeur dessus (lecture,
  // défilement, réponse à une question).
  derniereReponse: ReponseCanal | null;
  reponseVisible: boolean;
  afficherReponse: (reponse: Omit<ReponseCanal, "id">) => void;
  basculerReponse: () => void;
  suspendreMasquageReponse: () => void;
  reprendreMasquageReponse: () => void;

  journal: EntreeJournalCanal[];
  // Renvoie l'id généré, pour permettre un appel ultérieur à
  // mettreAJourEntreeJournal (ex: "en_cours" -> "succes" une fois
  // l'action terminée), sans que l'appelant ait à générer l'id lui
  // même.
  ajouterEntreeJournal: (description: string, statut?: StatutEntreeJournal) => string;
  mettreAJourEntreeJournal: (id: string, statut: StatutEntreeJournal) => void;
};

export const ContexteCanalEnDirect = createContext<ValeurCanalEnDirect | null>(null);

export function useCanalEnDirect(): ValeurCanalEnDirect {
  const contexte = useContext(ContexteCanalEnDirect);
  if (!contexte) {
    throw new Error("useCanalEnDirect doit être utilisé sous AppShell (ContexteCanalEnDirect.Provider)");
  }
  return contexte;
}

// Pont vers les modules hors React (lib/canalAgentApplicatif.ts et,
// chantier P) -- même principe que
// enregistrerDeplacementCurseur dans lib/contexteCurseurVirtuel.tsx.
// AppShell.tsx enregistre la vraie valeur dès que le Provider est monté.
let canalGlobal: ValeurCanalEnDirect | null = null;

export function enregistrerCanalEnDirect(valeur: ValeurCanalEnDirect) {
  canalGlobal = valeur;
}

/**
 * Si aucun Provider n'est encore monté (cas très rare), no-op silencieux
 * plutôt que de faire planter l'appelant -- même défaut prudent que les
 * autres ponts de ce chantier.
 */
export function pousserJournalDepuisAgent(description: string, statut?: StatutEntreeJournal): string | null {
  if (!canalGlobal) return null;
  return canalGlobal.ajouterEntreeJournal(description, statut);
}

export function mettreAJourJournalDepuisAgent(id: string, statut: StatutEntreeJournal) {
  canalGlobal?.mettreAJourEntreeJournal(id, statut);
}

export function afficherTexteDepuisAgent(texte: string) {
  canalGlobal?.afficherTexte(texte);
}

export function afficherReponseDepuisAgent(reponse: Omit<ReponseCanal, "id">) {
  canalGlobal?.afficherReponse(reponse);
}

/**
 * Lu par lib/canalAgentApplicatif.ts (envoyerTourCanalDirect) pour
 * savoir sur quelle conversation envoyer un message déclenché par le
 * canal, sans faire dépendre lib/canalAgentApplicatif.ts (module hors
 * React) de useContext. null si le canal n'a jamais été activé cette
 * session -- l'appelant doit alors renoncer plutôt que d'inventer un id.
 */
export function obtenirConversationIdCanal(): string | null {
  return canalGlobal?.conversationId ?? null;
}

let compteurEntreeJournal = 0;
let compteurReponse = 0;

// Préférences d'affichage du chantier M et N : localStorage suffit pour
// la v1, pas de table Supabase pour un simple choix d'interface.
const CLE_MODE_INTERACTION = "canalEnDirect.modeInteraction";
const CLE_MOTEUR_DICTEE = "canalEnDirect.moteurDictee";

function lirePreference<T extends string>(cle: string, valides: readonly T[]): T | null {
  try {
    const valeur = window.localStorage.getItem(cle);
    return valeur && (valides as readonly string[]).includes(valeur) ? (valeur as T) : null;
  } catch {
    return null;
  }
}

function ecrirePreference(cle: string, valeur: string) {
  try {
    window.localStorage.setItem(cle, valeur);
  } catch {
    // Stockage indisponible (navigation privée, quota) : la préférence
    // reste valable pour la session en cours, sans mémorisation.
  }
}

export function useFournirCanalEnDirect(): ValeurCanalEnDirect {
  const [actif, setActif] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dernierTexte, setDernierTexte] = useState<string | null>(null);
  const [derniereReponse, setDerniereReponse] = useState<ReponseCanal | null>(null);
  const [reponseVisible, setReponseVisible] = useState(false);
  const derniereReponseRef = useRef<ReponseCanal | null>(null);
  const minuteurReponse = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reponseVisibleRef = useRef(false);
  const [journal, setJournal] = useState<EntreeJournalCanal[]>([]);
  const [modeInteraction, setModeInteraction] = useState<ModeInteraction>("texte");
  const [moteurDictee, setMoteurDictee] = useState<MoteurDictee>("whisper");
  // Ref plutôt que de dépendre de `journal` dans les callbacks : évite
  // de recréer ajouterEntreeJournal/mettreAJourEntreeJournal à chaque
  // changement de journal.
  const journalRef = useRef<EntreeJournalCanal[]>([]);
  // Délai avant effacement automatique du texte affiché : la bulle
  // (chantier J) n'est pas persistante par nature -- personne ne
  // l'appelle explicitement pour la refermer, donc c'est ici que ça se
  // passe. Un nouveau texte reporte le délai plutôt que de s'ajouter au
  // précédent.
  const minuteurEffacement = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Durée minimale, allongée selon la longueur du texte (chantier P) :
  // un commentaire libre de deux phrases ne se lit pas en 5 secondes.
  // Plafonnée pour qu'un texte long ne bloque pas la bulle indéfiniment.
  const DUREE_AFFICHAGE_MS = 5000;
  const DUREE_PAR_CARACTERE_MS = 60;
  const DUREE_AFFICHAGE_MAX_MS = 15000;
  // Une réponse se lit, se parcourt et peut demander une action (question,
  // lien) : bien plus longue qu'une simple information. Le curseur de
  // Clovis la rouvre de toute façon à tout moment.
  const DUREE_REPONSE_MIN_MS = 10000;
  const DUREE_REPONSE_PAR_CARACTERE_MS = 40;
  const DUREE_REPONSE_MAX_MS = 45000;
  const DUREE_REPONSE_APRES_SURVOL_MS = 5000;

  // Lecture des préférences après le montage, jamais pendant le premier
  // rendu : le serveur ne connaît pas localStorage, lire plus tôt
  // créerait un écart entre le HTML serveur et le premier rendu client.
  useEffect(() => {
    const mode = lirePreference<ModeInteraction>(CLE_MODE_INTERACTION, ["voix", "texte"]);
    if (mode) setModeInteraction(mode);
    const moteur = lirePreference<MoteurDictee>(CLE_MOTEUR_DICTEE, ["whisper", "navigateur"]);
    if (moteur) setMoteurDictee(moteur);
  }, []);

  const choisirModeInteraction = useCallback((mode: ModeInteraction) => {
    setModeInteraction(mode);
    ecrirePreference(CLE_MODE_INTERACTION, mode);
  }, []);

  const choisirMoteurDictee = useCallback((moteur: MoteurDictee) => {
    setMoteurDictee(moteur);
    ecrirePreference(CLE_MOTEUR_DICTEE, moteur);
  }, []);

  const activer = useCallback((conversationId?: string) => {
    setActif(true);
    // Nouvelle conversation dédiée à chaque activation (voir le
    // commentaire du type ValeurCanalEnDirect plus haut) -- jamais
    // réutilisée d'une activation à l'autre, cohérent avec la décision
    // "pas de persistance à travers un rechargement" déjà prise pour le
    // reste de cet état. conversationId fourni par l'appelant (chantier
    // "demo + guide visuel", 20/09/2026) : utilisé tel quel plutôt que
    // d'en générer un nouveau, sinon comportement inchangé.
    setConversationId(conversationId ?? crypto.randomUUID());
  }, []);
  useEffect(() => {
    reponseVisibleRef.current = reponseVisible;
  }, [reponseVisible]);

  const annulerMasquageReponse = useCallback(() => {
    if (minuteurReponse.current) clearTimeout(minuteurReponse.current);
    minuteurReponse.current = null;
  }, []);

  const programmerMasquageReponse = useCallback(
    (dureeMs: number) => {
      annulerMasquageReponse();
      minuteurReponse.current = setTimeout(() => {
        minuteurReponse.current = null;
        setReponseVisible(false);
      }, dureeMs);
    },
    [annulerMasquageReponse]
  );

  const desactiver = useCallback(() => {
    setActif(false);
    annulerMasquageReponse();
    setReponseVisible(false);
  }, [annulerMasquageReponse]);

  const effacerTexte = useCallback(() => {
    if (minuteurEffacement.current) clearTimeout(minuteurEffacement.current);
    minuteurEffacement.current = null;
    setDernierTexte(null);
  }, []);

  const afficherTexte = useCallback((texte: string) => {
    if (minuteurEffacement.current) clearTimeout(minuteurEffacement.current);
    // Une information remplace la réponse affichée (une seule bulle à la
    // fois) ; la réponse reste rouvrable via le curseur.
    annulerMasquageReponse();
    setReponseVisible(false);
    setDernierTexte(texte);
    const duree = Math.min(DUREE_AFFICHAGE_MAX_MS, Math.max(DUREE_AFFICHAGE_MS, texte.length * DUREE_PAR_CARACTERE_MS));
    minuteurEffacement.current = setTimeout(() => {
      minuteurEffacement.current = null;
      setDernierTexte(null);
    }, duree);
  }, [annulerMasquageReponse]);

  const dureeReponse = (texte: string) =>
    Math.min(DUREE_REPONSE_MAX_MS, Math.max(DUREE_REPONSE_MIN_MS, texte.length * DUREE_REPONSE_PAR_CARACTERE_MS));

  const afficherReponse = useCallback(
    (reponse: Omit<ReponseCanal, "id">) => {
      compteurReponse += 1;
      const complete: ReponseCanal = { ...reponse, id: compteurReponse };
      derniereReponseRef.current = complete;
      setDerniereReponse(complete);
      if (minuteurEffacement.current) clearTimeout(minuteurEffacement.current);
      minuteurEffacement.current = null;
      setDernierTexte(null);
      setReponseVisible(true);
      programmerMasquageReponse(dureeReponse(complete.texte));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dureeReponse ne dépend que de constantes du hook.
    [programmerMasquageReponse]
  );

  const basculerReponse = useCallback(() => {
    const reponse = derniereReponseRef.current;
    if (!reponse) return;
    if (reponseVisibleRef.current) {
      annulerMasquageReponse();
      setReponseVisible(false);
      return;
    }
    if (minuteurEffacement.current) clearTimeout(minuteurEffacement.current);
    minuteurEffacement.current = null;
    setDernierTexte(null);
    setReponseVisible(true);
    programmerMasquageReponse(dureeReponse(reponse.texte));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dureeReponse ne dépend que de constantes du hook.
  }, [annulerMasquageReponse, programmerMasquageReponse]);

  const suspendreMasquageReponse = useCallback(() => annulerMasquageReponse(), [annulerMasquageReponse]);
  const reprendreMasquageReponse = useCallback(() => {
    if (reponseVisibleRef.current) programmerMasquageReponse(DUREE_REPONSE_APRES_SURVOL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- constante du hook.
  }, [programmerMasquageReponse]);

  const ajouterEntreeJournal = useCallback((description: string, statut: StatutEntreeJournal = "en_cours"): string => {
    compteurEntreeJournal += 1;
    const id = `journal-${compteurEntreeJournal}`;
    const entree: EntreeJournalCanal = { id, description, statut, horodatage: Date.now() };
    journalRef.current = [...journalRef.current, entree];
    setJournal(journalRef.current);
    return id;
  }, []);

  const mettreAJourEntreeJournal = useCallback((id: string, statut: StatutEntreeJournal) => {
    journalRef.current = journalRef.current.map((e) => (e.id === id ? { ...e, statut } : e));
    setJournal(journalRef.current);
  }, []);

  return {
    actif,
    activer,
    desactiver,
    conversationId,
    modeInteraction,
    choisirModeInteraction,
    moteurDictee,
    choisirMoteurDictee,
    dernierTexte,
    afficherTexte,
    effacerTexte,
    derniereReponse,
    reponseVisible,
    afficherReponse,
    basculerReponse,
    suspendreMasquageReponse,
    reprendreMasquageReponse,
    journal,
    ajouterEntreeJournal,
    mettreAJourEntreeJournal,
  };
}
