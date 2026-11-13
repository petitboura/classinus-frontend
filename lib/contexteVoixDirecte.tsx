"use client";

// Créé le 02/10/2026, Bourama : voix en direct (Gemini Live). Pièce partagée,
// montée une seule fois au niveau du layout racine (InteractionGlobale.tsx), comme le canal en direct. Avant, la
// voix vivait dans la barre de saisie du chat et ne pouvait servir qu'à elle.
// Ici, une seule session de voix existe pour toute l'appli : le chat s'en sert
// aujourd'hui, le canal en direct pourra s'en servir demain sans en créer une
// deuxième, ce qui garantit qu'on n'entend jamais deux voix à la fois.
//
// La voix est un interprète, jamais le but final : elle transmet la demande de
// l'étudiant à Clovis par le chat (la question et la réponse s'affichent en
// direct dans la conversation), puis résume la réponse à voix haute. Sans chat
// ouvert pour la recevoir, elle garde le chemin direct vers le serveur, pour
// ne jamais rester bloquée.
//
// Une seule voix à la fois : le bouton du chat (Mode vocal) et le bouton du
// canal en direct pilotent la MÊME session. Si l'un l'a allumée, l'autre la
// voit allumée et peut l'éteindre, mais aucun ne peut en lancer une deuxième.
//
// Mode bambara (13/11/2026, demande Bourama) : à l'allumage, si le serveur propose le bambara,
// une question « bambara ou autre ? » s'affiche (components/voix/ChoixLangueVoix.tsx). « Autre »
// garde la voix Gemini Live telle qu'elle était ; « bambara » ouvre la chaîne de lib/voixBambara.ts.
// Pendant un tour du canal en direct, la question n'est pas posée : la voix reste celle d'avant.

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { demanderAClovisDirectement, ouvrirGeminiLive, type NiveauxVoix, type SessionGeminiLive } from "./geminiLive";
import { abonnerMessagesBulle, canalEnDirectEstActif } from "./contexteCanalEnDirect";
import { abonnerArretTache } from "./tacheCanal";
import { ChatIndisponiblePourVoix } from "./contexteChat";
import { conversationActive, conversationPourVoix } from "./conversationPartagee";
import { messageErreurVoix } from "./erreurs";
import { CLIENT_VOIX_BAMBARA, ouvrirVoixBambara } from "./voixBambara";
import { lireEtatVoixBambara } from "./voixBambaraApi";

export type EtatVoixDirecte = "inactif" | "connexion" | "connecte" | "ecoute" | "reponse" | "travail" | "silence" | "erreur";

export type LangueVoix = "bambara" | "autre";

export type ContexteVoixDirecteValeur = {
  etat: EtatVoixDirecte;
  actif: boolean;
  erreur: string | null;
  // Onde en plein écran (false) ou réduite en bulle (true). Choisi par
  // l'étudiant avec le bouton de l'onde ; le canal en direct impose la bulle.
  reduit: boolean;
  reduire: () => void;
  agrandir: () => void;
  // Niveaux sonores instantanés (micro et haut parleur), lus à chaque image
  // par l'onde sans passer par React.
  lireNiveaux: () => NiveauxVoix;
  ouvrir: (conversationId: string, langue?: LangueVoix) => Promise<void>;
  fermer: () => void;
  // Ferme la voix seulement si elle est liée à cette conversation (un écran
  // qui se ferme ne doit pas couper la voix d'une autre conversation).
  fermerPourConversation: (conversationId: string | null) => void;
  basculer: (conversationId: string | null) => void;
  // Fait dire l'essentiel d'une réponse écrite par la voix, seulement si elle
  // est active sur cette conversation. Sans voix active, ne fait rien.
  annoncerReponse: (conversationId: string | null, texte: string) => void;
  // Question « bambara ou autre ? » en attente de réponse (absente dans le miroir de la fenêtre de
  // superposition PC, où la question n'est jamais posée).
  choixLangue?: { conversationId: string } | null;
  choisirLangue?: (langue: LangueVoix) => void;
  annulerChoixLangue?: () => void;
};

export const ContexteVoixDirecte = createContext<ContexteVoixDirecteValeur | null>(null);

// Ce dont la voix a besoin du chat. Passé en argument (et non lu par
// useContext) parce que ce hook tourne dans InteractionGlobale, au dessus des Providers
// qu'il alimente.
type DependancesVoix = {
  chatPretPourVoix: (conversationId: string) => boolean;
  deposerDemandeVoix: (texte: string, conversationId: string, client?: string) => Promise<string>;
};

export function useFournirVoixDirecte(dependances: DependancesVoix): ContexteVoixDirecteValeur {
  const sessionRef = useRef<SessionGeminiLive | null>(null);
  const conversationSessionRef = useRef<string | null>(null);
  const ouvertureEnCoursRef = useRef(false);
  const verificationLangueRef = useRef(false);
  const [choixLangue, setChoixLangue] = useState<{ conversationId: string } | null>(null);
  const [etat, setEtat] = useState<EtatVoixDirecte>("inactif");
  const [erreur, setErreur] = useState<string | null>(null);
  const [reduit, setReduit] = useState(false);
  const reduire = useCallback(() => setReduit(true), []);
  const agrandir = useCallback(() => setReduit(false), []);
  const lireNiveaux = useCallback((): NiveauxVoix => sessionRef.current?.niveaux() ?? { entree: 0, sortie: 0 }, []);

  // Les dépendances changent à chaque rendu : on les lit via un ref pour que
  // ouvrir/fermer restent stables.
  const dependancesRef = useRef(dependances);
  useEffect(() => {
    dependancesRef.current = dependances;
  }, [dependances]);

  const fermer = useCallback(() => {
    sessionRef.current?.fermer();
    sessionRef.current = null;
    conversationSessionRef.current = null;
    setReduit(false);
    setEtat("inactif");
  }, []);

  const fermerPourConversation = useCallback(
    (conversationId: string | null) => {
      if (conversationId && conversationSessionRef.current === conversationId) fermer();
    },
    [fermer]
  );

  const ouvrir = useCallback(async (conversationId: string, langue: LangueVoix = "autre") => {
    if (sessionRef.current || ouvertureEnCoursRef.current || !conversationId) return;
    setErreur(null);
    setReduit(false);
    ouvertureEnCoursRef.current = true;
    conversationSessionRef.current = conversationId;
    try {
      const surEtat = (nouvelEtat: EtatVoixDirecte | "ferme") => {
        if (nouvelEtat === "ferme") {
          sessionRef.current = null;
          conversationSessionRef.current = null;
          setReduit(false);
          setEtat("inactif");
        } else {
          setEtat(nouvelEtat);
        }
      };
      // Tant que le canal est actif, la voix suit la conversation partagée (celle du chat
      // affiché) ; sinon elle garde celle où elle a été ouverte. `client` annonce le mode bambara.
      const demanderAClovis = async (question: string, client?: string): Promise<string> => {
        const cible = conversationPourVoix(conversationId);
        if (!dependancesRef.current.chatPretPourVoix(cible)) return demanderAClovisDirectement(question, cible, client);
        try {
          return await dependancesRef.current.deposerDemandeVoix(question, cible, client);
        } catch (e) {
          // Le chat a disparu avant de prendre la demande : chemin direct.
          if (e instanceof ChatIndisponiblePourVoix) return demanderAClovisDirectement(question, cible, client);
          throw e;
        }
      };
      const session = langue === "bambara" ? await ouvrirVoixBambara({
        surEtat,
        surErreur: setErreur,
        surDemande: (question) => demanderAClovis(question, CLIENT_VOIX_BAMBARA),
      }) : await ouvrirGeminiLive({
        conversationId,
        surEtat,
        surErreur: setErreur,
        // La voix décide du plein écran ou du mini, le navigateur applique. Tant que le canal
        // en direct est actif, l'onde reste en bulle (le canal impose la bulle).
        surAffichage: (mode) => {
          if (mode === "plein_ecran") {
            if (canalEnDirectEstActif()) return "Impossible : le canal en direct est actif, l'onde reste en petite bulle.";
            setReduit(false);
            return "L'onde est maintenant en plein écran.";
          }
          setReduit(true);
          return "L'onde est maintenant réduite en petite bulle.";
        },
        surDemande: (question) => demanderAClovis(question),
      });
      sessionRef.current = session;
    } catch (e) {
      conversationSessionRef.current = null;
      setEtat("erreur");
      console.warn("Impossible d’ouvrir le canal vocal Classinus :", e);
      setErreur(messageErreurVoix(e));
    } finally {
      ouvertureEnCoursRef.current = false;
    }
  }, []);

  const basculer = useCallback(
    (conversationId: string | null) => {
      if (sessionRef.current) {
        fermer();
        return;
      }
      if (!conversationId || ouvertureEnCoursRef.current || verificationLangueRef.current) return;
      if (canalEnDirectEstActif()) {
        void ouvrir(conversationId);
        return;
      }
      // Le serveur dit si le bambara est branché : sinon, aucune question, la voix s'ouvre comme avant.
      verificationLangueRef.current = true;
      void lireEtatVoixBambara()
        .then((etatBambara) => {
          if (etatBambara.disponible) setChoixLangue({ conversationId });
          else void ouvrir(conversationId);
        })
        .finally(() => {
          verificationLangueRef.current = false;
        });
    },
    [fermer, ouvrir]
  );

  const choisirLangue = useCallback(
    (langue: LangueVoix) => {
      const demande = choixLangue;
      setChoixLangue(null);
      if (demande) void ouvrir(demande.conversationId, langue);
    },
    [choixLangue, ouvrir]
  );
  const annulerChoixLangue = useCallback(() => setChoixLangue(null), []);

  const annoncerReponse = useCallback((conversationId: string | null, texte: string) => {
    if (!conversationId || !sessionRef.current) return;
    if (conversationSessionRef.current !== conversationId && conversationActive() !== conversationId) return;
    sessionRef.current.annoncerReponse(texte);
  }, []);

  // Canal en direct : tout ce que Classinus dit dans sa bulle (commentaires et
  // réponses) est lu à voix haute tant que la voix est allumée. Voix éteinte,
  // la bulle reste silencieuse comme avant.
  useEffect(
    () => abonnerMessagesBulle((message) => sessionRef.current?.direMessageBulle(message.texte)),
    []
  );

  // Bouton Arrêter (12/10/2026, demande Bourama : « arrêter c'est arrêter ») : la parole en cours
  // est coupée, pas seulement la génération.
  useEffect(() => abonnerArretTache(() => sessionRef.current?.interrompre()), []);

  useEffect(() => () => { sessionRef.current?.fermer(); }, []);

  const actif = etat !== "inactif" && etat !== "erreur";

  return useMemo(
    () => ({ etat, actif, erreur, reduit, reduire, agrandir, lireNiveaux, ouvrir, fermer, fermerPourConversation, basculer, annoncerReponse, choixLangue, choisirLangue, annulerChoixLangue }),
    [etat, actif, erreur, reduit, reduire, agrandir, lireNiveaux, ouvrir, fermer, fermerPourConversation, basculer, annoncerReponse, choixLangue, choisirLangue, annulerChoixLangue]
  );
}
