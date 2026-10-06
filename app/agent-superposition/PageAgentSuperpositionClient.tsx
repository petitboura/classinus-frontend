"use client";

// Créé le 27/09/2026, Bourama : chantier "canal en direct sort de
// l'appli" (voir plan-canal-en-direct-pc.md a la racine du depot), Lot R.
//
// Chargee UNIQUEMENT par la fenetre de superposition Electron (voir
// electron/main.ts) -- jamais visitee en navigation normale (pas de lien
// vers cette route dans l'app). Hors du groupe (app)/ a dessein : ne doit
// JAMAIS monter AppShell (auth, vraie connexion WebSocket, nav...), voir
// le plan, point 2.
//
// Reutilise tel quel (aucune modification) les 3 composants du canal en
// direct : CurseurVirtuelAgent, BulleDialogueAgent, CanalEnDirectFlottant (qui
// monte lui meme ControlesInteractionCanal, et dans son groupe de boutons le
// BoutonJournalAgent).
// Pour cela, cette page fournit ses PROPRES valeurs de
// ContexteCurseurVirtuel/ContexteCanalEnDirect -- pas les vraies
// (useFournirCurseurVirtuel/useFournirCanalEnDirect, reservees a la
// fenetre principale, voir components/AppShell.tsx), mais un miroir
// alimente par les instantanes recus via lib/superpositionElectron.ts.
// Les fonctions du contexte qui correspondent a une vraie interaction
// utilisateur relaient vers la fenetre principale (interactionsSuperposition) ;
// celles qui ne sont jamais appelees par ces 4 composants (verifie
// composant par composant, ex. deplacerVers, afficherTexte) restent des
// no-op, purement pour satisfaire le type ValeurCurseurVirtuel/ValeurCanalEnDirect.
//
// Bouton permanent (01/10/2026, demande Bourama) : cette fenêtre reste
// affichée en permanence (voir electron/main.ts), mais tant que le canal est
// inactif seul le bouton d'activation (CanalEnDirectFlottant) est dessiné.
// Le curseur, la bulle, le bouton du journal et les marques apparaissent avec
// une transition à l'activation du canal et disparaissent à sa désactivation.
//
// Voix en direct (02/10/2026, demande Bourama) : même comportement que sur le
// site pour le canal, c'est à dire une petite bulle d'onde qui suit le curseur
// (components/voix/VoixDirecteSuperposition.tsx). La session reste dans la
// fenêtre principale, cette page n'en reçoit que l'état et les niveaux.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import { CurseurVirtuelAgent } from "@/components/CurseurVirtuelAgent";
import { BulleDialogueAgent } from "@/components/BulleDialogueAgent";
import { CanalEnDirectFlottant } from "@/components/CanalEnDirectFlottant";
import { MarquesEcranAgent } from "@/components/MarquesEcranAgent";
import { VoixDirecteSuperposition } from "@/components/voix/VoixDirecteSuperposition";
import { ContexteCurseurVirtuel, type ValeurCurseurVirtuel, type FormeCurseur } from "@/lib/contexteCurseurVirtuel";
import { ContexteCanalEnDirect, type ValeurCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteVoixDirecte, type ContexteVoixDirecteValeur, type EtatVoixDirecte } from "@/lib/contexteVoixDirecte";
import {
  marquerFenetreSuperposition,
  ecouterEtatSuperposition,
  maintenirCaptureSuperposition,
  interactionsSuperposition,
  type EtatSuperposition,
  type MarqueEcranAffichee,
} from "@/lib/superpositionElectron";

type CanalAffichage = Pick<
  ValeurCanalEnDirect,
  | "actif"
  | "modeInteraction"
  | "moteurDictee"
  | "dernierTexte"
  | "reponseVisible"
  | "derniereReponse"
  | "conversationId"
  | "journal"
  | "tacheEnCours"
  | "interrompue"
>;

type VoixAffichage = { actif: boolean; etat: EtatVoixDirecte };

const ETAT_VOIX_INITIAL: VoixAffichage = { actif: false, etat: "inactif" };

// Part du chemin parcouru vers le niveau reçu à chaque image : les niveaux
// n'arrivent qu'environ 20 fois par seconde, l'onde est dessinée à chaque image.
const LISSAGE_NIVEAUX = 0.35;

const ETAT_CANAL_INITIAL: CanalAffichage = {
  actif: false,
  modeInteraction: "texte",
  moteurDictee: "whisper",
  dernierTexte: null,
  reponseVisible: false,
  derniereReponse: null,
  conversationId: null,
  journal: [],
  tacheEnCours: false,
  interrompue: false,
};

export default function PageAgentSuperposition() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const echelle = useMotionValue(1);
  const [curseurAffichage, setCurseurAffichage] = useState({
    visible: false,
    forme: "defaut" as FormeCurseur,
    enAction: false,
  });
  const [canal, setCanal] = useState(ETAT_CANAL_INITIAL);
  const [marques, setMarques] = useState<MarqueEcranAffichee[]>([]);
  const [voix, setVoix] = useState<VoixAffichage>(ETAT_VOIX_INITIAL);
  // Niveaux sonores reçus (cible) et niveaux affichés (lissés), lus par l'onde
  // à chaque image sans repasser par React.
  const niveauxCibleRef = useRef({ entree: 0, sortie: 0 });
  const niveauxAfficheRef = useRef({ entree: 0, sortie: 0 });
  // Dernière position reçue : ne relayer que les vrais glissements.
  const dernierePositionRecue = useRef({ x: 0, y: 0 });

  useEffect(() => {
    marquerFenetreSuperposition();
    return ecouterEtatSuperposition((etat: EtatSuperposition) => {
      dernierePositionRecue.current = { x: etat.curseur.x, y: etat.curseur.y };
      setMarques(Array.isArray(etat.marques) ? etat.marques : []);
      setVoix((precedent) => {
        const actif = etat.voix?.actif ?? false;
        const etatVoix = (etat.voix?.etat ?? "inactif") as EtatVoixDirecte;
        return precedent.actif === actif && precedent.etat === etatVoix ? precedent : { actif, etat: etatVoix };
      });
      niveauxCibleRef.current = etat.voix?.niveaux ?? { entree: 0, sortie: 0 };
      x.set(etat.curseur.x);
      y.set(etat.curseur.y);
      echelle.set(etat.curseur.echelle);
      setCurseurAffichage({
        visible: etat.curseur.visible,
        forme: etat.curseur.forme as FormeCurseur,
        enAction: etat.curseur.enAction,
      });
      setCanal({
        actif: etat.canal.actif,
        modeInteraction: etat.canal.modeInteraction as ValeurCanalEnDirect["modeInteraction"],
        moteurDictee: etat.canal.moteurDictee as ValeurCanalEnDirect["moteurDictee"],
        dernierTexte: etat.canal.dernierTexte,
        reponseVisible: etat.canal.reponseVisible,
        derniereReponse: etat.canal.derniereReponse,
        conversationId: etat.canal.conversationId,
        journal: etat.canal.journal,
        tacheEnCours: etat.canal.tacheEnCours ?? false,
        interrompue: etat.canal.interrompue ?? false,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fin d'un glissement du curseur : on previent la fenetre principale de
  // la nouvelle position, sinon elle repousse l'ancienne au prochain etat
  // et le curseur revient a sa place.
  function surFinGlissement() {
    const px = x.get();
    const py = y.get();
    const ref = dernierePositionRecue.current;
    if (!Number.isFinite(px) || !Number.isFinite(py)) return;
    if (Math.abs(px - ref.x) < 1 && Math.abs(py - ref.y) < 1) return;
    dernierePositionRecue.current = { x: px, y: py };
    interactionsSuperposition.deposerCurseur(px, py);
  }

  // La capture de la souris est décidée côté Electron (suivi de la position du
  // pointeur). Ici on signale seulement le début et la fin d'un appui sur un
  // élément de la superposition, pour que la capture tienne pendant un
  // glissement ou une sélection de texte, même si le pointeur sort de l'élément.
  useEffect(() => {
    function surAppui(e: PointerEvent) {
      const cible = e.target instanceof Element ? e.target : null;
      if (cible?.closest('[data-agent-superposition="true"]')) maintenirCaptureSuperposition(true);
    }
    function surRelache() {
      maintenirCaptureSuperposition(false);
    }
    window.addEventListener("pointerdown", surAppui, true);
    window.addEventListener("pointerup", surRelache, true);
    window.addEventListener("pointercancel", surRelache, true);
    window.addEventListener("blur", surRelache);
    return () => {
      window.removeEventListener("pointerdown", surAppui, true);
      window.removeEventListener("pointerup", surRelache, true);
      window.removeEventListener("pointercancel", surRelache, true);
      window.removeEventListener("blur", surRelache);
    };
  }, []);

  const lireNiveauxVoix = useCallback(() => {
    const cible = niveauxCibleRef.current;
    const affiche = niveauxAfficheRef.current;
    affiche.entree += (cible.entree - affiche.entree) * LISSAGE_NIVEAUX;
    affiche.sortie += (cible.sortie - affiche.sortie) * LISSAGE_NIVEAUX;
    return { entree: affiche.entree, sortie: affiche.sortie };
  }, []);

  // Voix en direct : la session vit dans la fenêtre principale, ici seulement
  // un miroir. L'onde n'est jamais dessinée en plein écran dans cette fenêtre
  // (ce serait par dessus tout le PC) : seule la bulle du canal y apparaît,
  // donc la voix n'est exposée comme active que tant que le canal l'est aussi.
  // Le bouton voix des contrôles du canal relaie vers la fenêtre principale.
  const valeurVoix = useMemo<ContexteVoixDirecteValeur>(
    () => ({
      etat: voix.etat,
      actif: voix.actif && canal.actif,
      erreur: null,
      reduit: false,
      reduire: () => {},
      agrandir: () => {},
      lireNiveaux: lireNiveauxVoix,
      ouvrir: async () => {},
      fermer: () => {},
      fermerPourConversation: () => {},
      basculer: (conversationId) => interactionsSuperposition.basculerVoix(conversationId),
      annoncerReponse: () => {},
    }),
    [voix.etat, voix.actif, canal.actif, lireNiveauxVoix]
  );

  const valeurCurseur: ValeurCurseurVirtuel = {
    x,
    y,
    echelle,
    visible: curseurAffichage.visible,
    forme: curseurAffichage.forme,
    enAction: curseurAffichage.enAction,
    // Jamais appelés par CurseurVirtuelAgent.tsx (vérifié, il ne fait que
    // lire x/y/echelle/visible/forme/enAction) -- le glisser lui même
    // reste local, géré directement par framer-motion sur x/y ci dessus.
    definirForme: () => {},
    deplacerVers: () => Promise.resolve(),
    masquer: () => {},
    afficher: () => {},
    surFinGlissement,
  };

  const valeurCanal: ValeurCanalEnDirect = {
    actif: canal.actif,
    conversationId: canal.conversationId,
    activer: interactionsSuperposition.activer,
    desactiver: interactionsSuperposition.desactiver,
    modeInteraction: canal.modeInteraction,
    choisirModeInteraction: interactionsSuperposition.choisirModeInteraction,
    moteurDictee: canal.moteurDictee,
    choisirMoteurDictee: interactionsSuperposition.choisirMoteurDictee,
    dernierTexte: canal.dernierTexte,
    // Jamais appelés par les 4 composants reutilises (uniquement lus par
    // le code de la fenetre principale, cote agent) -- no-op ici.
    afficherTexte: () => {},
    effacerTexte: () => {},
    derniereReponse: canal.derniereReponse,
    reponseVisible: canal.reponseVisible,
    afficherReponse: () => {},
    basculerReponse: interactionsSuperposition.basculerReponse,
    suspendreMasquageReponse: interactionsSuperposition.suspendreMasquageReponse,
    reprendreMasquageReponse: interactionsSuperposition.reprendreMasquageReponse,
    journal: canal.journal,
    ajouterEntreeJournal: () => "",
    mettreAJourEntreeJournal: () => {},
    tacheEnCours: canal.tacheEnCours,
    interrompue: canal.interrompue,
    arreterTache: interactionsSuperposition.arreterTache,
    continuerApresArret: interactionsSuperposition.continuerApresArret,
    reessayerApresArret: interactionsSuperposition.reessayerApresArret,
  };

  return (
    <ContexteCurseurVirtuel.Provider value={valeurCurseur}>
      <ContexteCanalEnDirect.Provider value={valeurCanal}>
       <ContexteVoixDirecte.Provider value={valeurVoix}>
        <AnimatePresence>
          {canal.actif && (
            <motion.div
              key="elements-canal-actif"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <MarquesEcranAgent marques={marques} />
              <CurseurVirtuelAgent />
              <BulleDialogueAgent />
              <VoixDirecteSuperposition />
            </motion.div>
          )}
        </AnimatePresence>
        <CanalEnDirectFlottant />
       </ContexteVoixDirecte.Provider>
      </ContexteCanalEnDirect.Provider>
    </ContexteCurseurVirtuel.Provider>
  );
}
