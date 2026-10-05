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
// Reutilise tel quel (aucune modification) les 4 composants du canal en
// direct : CurseurVirtuelAgent, BulleDialogueAgent, BoutonJournalAgent,
// CanalEnDirectFlottant (qui monte lui meme ControlesInteractionCanal).
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

import { useEffect, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";
import { CurseurVirtuelAgent } from "@/components/CurseurVirtuelAgent";
import { BulleDialogueAgent } from "@/components/BulleDialogueAgent";
import { BoutonJournalAgent } from "@/components/BoutonJournalAgent";
import { CanalEnDirectFlottant } from "@/components/CanalEnDirectFlottant";
import { MarquesEcranAgent } from "@/components/MarquesEcranAgent";
import { ContexteCurseurVirtuel, type ValeurCurseurVirtuel, type FormeCurseur } from "@/lib/contexteCurseurVirtuel";
import { ContexteCanalEnDirect, type ValeurCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import {
  marquerFenetreSuperposition,
  ecouterEtatSuperposition,
  definirCapturerSourisSuperposition,
  interactionsSuperposition,
  type EtatSuperposition,
  type MarqueEcranAffichee,
} from "@/lib/superpositionElectron";

type CanalAffichage = Pick<
  ValeurCanalEnDirect,
  "actif" | "modeInteraction" | "moteurDictee" | "dernierTexte" | "reponseVisible" | "derniereReponse" | "conversationId" | "journal"
>;

const ETAT_CANAL_INITIAL: CanalAffichage = {
  actif: false,
  modeInteraction: "texte",
  moteurDictee: "whisper",
  dernierTexte: null,
  reponseVisible: false,
  derniereReponse: null,
  conversationId: null,
  journal: [],
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
  // Dernière position reçue : ne relayer que les vrais glissements.
  const dernierePositionRecue = useRef({ x: 0, y: 0 });

  useEffect(() => {
    marquerFenetreSuperposition();
    return ecouterEtatSuperposition((etat: EtatSuperposition) => {
      dernierePositionRecue.current = { x: etat.curseur.x, y: etat.curseur.y };
      setMarques(Array.isArray(etat.marques) ? etat.marques : []);
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

  // La capture s'active seulement au-dessus des éléments de la superposition.
  const surElementRef = useRef(false);
  useEffect(() => {
    function surDeplacement(e: MouseEvent) {
      const cible = document.elementFromPoint(e.clientX, e.clientY);
      const surElement = !!cible?.closest('[data-agent-superposition="true"]');
      if (surElement !== surElementRef.current) {
        surElementRef.current = surElement;
        definirCapturerSourisSuperposition(surElement);
      }
    }
    window.addEventListener("mousemove", surDeplacement);
    return () => window.removeEventListener("mousemove", surDeplacement);
  }, []);

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
    // Champs ajoutés à ValeurCanalEnDirect par main (bouton arrêter de la tâche) : la fenêtre de
    // superposition de staging ne les relaie pas, valeurs neutres ici.
    tacheEnCours: false,
    interrompue: false,
    arreterTache: () => {},
    continuerApresArret: () => {},
    reessayerApresArret: () => {},
  };

  return (
    <ContexteCurseurVirtuel.Provider value={valeurCurseur}>
      <ContexteCanalEnDirect.Provider value={valeurCanal}>
        <MarquesEcranAgent marques={marques} />
        <CurseurVirtuelAgent />
        <BulleDialogueAgent />
        <BoutonJournalAgent />
        <CanalEnDirectFlottant />
      </ContexteCanalEnDirect.Provider>
    </ContexteCurseurVirtuel.Provider>
  );
}
