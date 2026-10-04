"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantiers M et N. Visible
// seulement quand le canal est actif. Deux boutons séparés du chat pour
// parler à Clovis pendant qu'il travaille :
// - un pour la dictée vocale (Mic), avec un petit switch entre les deux
//   moteurs (chantier N) : Navigateur (Web Speech API) et Whisper ;
// - un pour écrire (PenLine), qui ouvre une petite zone de saisie.
//
// Le dernier bouton utilisé est mémorisé (localStorage, voir
// lib/contexteCanalEnDirect.tsx) et reste mis en avant à la prochaine
// activation. Le choix du moteur est mémorisé de la même façon.
//
// Le message capté part par envoyerMessageEtudiant (lib/canalAgentApplicatif.ts) :
// lu par Clovis à son prochain aller-retour s'il est en train de travailler,
// sinon envoyé comme un message normal du chat.

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, ArrowUpRight, AudioLines, Camera, ChevronDown, ChevronUp, Mic, Minimize2, PenLine, Pin, Square } from "lucide-react";
import { useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ApparitionBoutonCanal } from "@/components/ApparitionBoutonCanal";
import { BoutonJournalAgent } from "@/components/BoutonJournalAgent";
import { PleinEcranApercu } from "@/components/chat/PleinEcranApercu";
import { LigneApercuPieces } from "@/components/chat/LigneApercuPieces";
import { MenuPlus, type EntreeMenuPlus } from "@/components/chat/barre/MenuPlus";
import { traiterFichiersJoints } from "@/lib/preparerPiecesJointes";
import { useFichiersJointsCanal } from "@/lib/useFichiersJointsCanal";
import { BoutonReglagesCanal, BoutonUtilitairesCanal } from "@/components/BoutonsReglagesCanal";
import { CanvasDessin } from "@/components/chat/CanvasDessin";
import { EditeurMathsRiche } from "@/components/chat/EditeurMathsRiche";
import { messageErreur } from "@/lib/erreurs";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { ContexteCanalEnDirect, type MoteurDictee } from "@/lib/contexteCanalEnDirect";
import { envoyerMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { useDicteeVocale } from "@/lib/useDicteeVocale";
import { ContexteVoixDirecte } from "@/lib/contexteVoixDirecte";
import { conversationActive } from "@/lib/conversationPartagee";

const DUREE_ERREUR_MS = 6000;

const LABEL_MOTEUR: Record<MoteurDictee, string> = {
  navigateur: "Navigateur",
  whisper: "Whisper",
};

// Disposition (03/10/2026, demande Bourama), de bas en haut, en trois colonnes alignées :
//   ligne 1 : activation du canal (boutonActivation), chevron qui déplie ou replie, « + » ;
//   ligne 2 : Écrire, Mode vocal, Utilitaires ;
//   puis la ligne de la dictée (bouton et choix du moteur), puis celle de Arrêter la tâche
//   (pendant une tâche) et Réglages.
// Le groupe est déplié dès l'activation. Écrire et Arrêter la tâche restent visibles groupe
// replié. Le journal est un bouton fixe et déplaçable, affiché canal actif et groupe déplié.
export function ControlesInteractionCanal({
  boutonActivation = null,
}: {
  boutonActivation?: ReactNode;
}) {
  const contexte = useContext(ContexteCanalEnDirect);
  const actif = contexte?.actif ?? false;
  const modeInteraction = contexte?.modeInteraction ?? "texte";
  const moteurChoisi = contexte?.moteurDictee ?? "whisper";
  const conversationId = contexte?.actif ? contexte.conversationId : null;
  // Depuis le 02/10/2026, la voix est une pièce partagée (InteractionGlobale) : ce bouton
  // et le Mode vocal du chat pilotent la même session, jamais deux voix.
  const voixDirecte = useContext(ContexteVoixDirecte);
  const geminiLive = {
    actif: voixDirecte?.actif ?? false,
    etat: voixDirecte?.etat ?? "inactif",
    basculer: () => voixDirecte?.basculer(conversationActive() ?? conversationId),
  };
  const fermerVoixPourConversation = voixDirecte?.fermerPourConversation;
  useEffect(() => () => fermerVoixPourConversation?.(conversationId), [conversationId, fermerVoixPourConversation]);

  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [groupeOuvert, setGroupeOuvert] = useState(true);
  // Le journal passe par un portail : posé en dehors du groupe, il garde sa position fixe
  // même quand le groupe est déplacé.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);
  const [pleinEcran, setPleinEcran] = useState(false);
  // Pièces jointes du « + » (03/10/2026, demande Bourama) : aperçu avant l'envoi,
  // dans une ligne défilable à gauche et à droite, comme dans la barre de saisie du chat.
  const piecesJointes = useFichiersJointsCanal();
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // Utilitaires du canal (03/10/2026, demande Bourama) : dessin, éditeur de maths live et
  // position, comme dans la barre de saisie du chat. Le dessin rejoint les pièces jointes,
  // l'éditeur de maths et la position s'ajoutent au texte du message.
  const [dessinOuvert, setDessinOuvert] = useState(false);
  const [mathsOuvert, setMathsOuvert] = useState(false);
  const [positionEnCours, setPositionEnCours] = useState(false);
  const { enSortie: dessinEnSortie, demarrerFermeture: fermerDessinAnime } = useFermetureAnimee();
  const { enSortie: mathsEnSortie, demarrerFermeture: fermerMathsAnime } = useFermetureAnimee();
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const inputPhotoRef = useRef<HTMLInputElement>(null);
  const { enSortie: pleinEcranEnSortie, demarrerFermeture: fermerPleinEcranAnime } = useFermetureAnimee();
  const [texteSaisi, setTexteSaisi] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const champRef = useRef<HTMLTextAreaElement>(null);
  const minuteurErreur = useRef<ReturnType<typeof setTimeout> | null>(null);

  function afficherErreur(message: string) {
    if (minuteurErreur.current) clearTimeout(minuteurErreur.current);
    setErreur(message);
    minuteurErreur.current = setTimeout(() => setErreur(null), DUREE_ERREUR_MS);
  }

  const dictee = useDicteeVocale({
    moteur: moteurChoisi,
    surTexte: (texte) => {
      setErreur(null);
      envoyerMessageEtudiant(texte);
    },
    surErreur: afficherErreur,
  });

  // Canal désactivé : plus d'écoute en cours, panneau refermé.
  const { annuler } = dictee;
  useEffect(() => {
    if (actif) {
      setGroupeOuvert(true);
      return;
    }
    annuler();
    setPanneauOuvert(false);
    setPleinEcran(false);
    setDessinOuvert(false);
    setMathsOuvert(false);
    setErreur(null);
    piecesJointes.vider();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vider est stable (useCallback sans dépendance).
  }, [actif, annuler]);

  useEffect(() => {
    if (panneauOuvert) champRef.current?.focus();
  }, [panneauOuvert]);

  // Auto-agrandissement (19/09/2026, bug signalé Bourama : "il reste
  // bloqué et défile dans quelques lignes") -- même mécanisme que
  // components/chat/BarreDeSaisie.tsx:ajusterHauteurTexte, pas
  // réutilisable tel quel (textarea différent, contexte différent) :
  // hauteur remise à "auto" puis fixée à scrollHeight à chaque frappe,
  // le CSS max-h prend le relais au-delà pour repasser en défilement
  // interne plutôt que de grandir indéfiniment.
  useEffect(() => {
    const el = champRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [texteSaisi, panneauOuvert]);

  useEffect(
    () => () => {
      if (minuteurErreur.current) clearTimeout(minuteurErreur.current);
    },
    [],
  );

  if (!contexte) return null;
  const { choisirModeInteraction, choisirMoteurDictee } = contexte;

  function basculerDictee() {
    choisirModeInteraction("voix");
    setPanneauOuvert(false);
    setErreur(null);
    if (dictee.enEcoute) dictee.arreter();
    else dictee.demarrer();
  }

  function basculerPanneau() {
    choisirModeInteraction("texte");
    if (dictee.enEcoute) dictee.annuler();
    setErreur(null);
    setPanneauOuvert((v) => !v);
  }

  // Envoi du message écrit, avec ses pièces jointes. Les fichiers sont d'abord préparés
  // comme dans le chat (lib/preparerPiecesJointes.ts) : leur contenu ou leur lien est
  // ajouté au texte, car le canal transporte le message sous forme de texte. Si un
  // fichier échoue, rien ne part et tout reste en place, pour retirer le fichier fautif
  // et réessayer sans rien perdre. Retourne vrai si le message est parti.
  async function envoyerTexte(): Promise<boolean> {
    if (envoiEnCours) return false;
    const propre = texteSaisi.trim();
    if (!propre && piecesJointes.fichiers.length === 0) return false;
    let texteFinal = propre;
    if (piecesJointes.fichiers.length > 0) {
      setEnvoiEnCours(true);
      setErreur(null);
      try {
        const resultats = await traiterFichiersJoints(piecesJointes.fichiers);
        const echecs: string[] = [];
        resultats.forEach((resultat, index) => {
          if (resultat.status === "fulfilled") texteFinal += resultat.value.texteBloc;
          else echecs.push(`${piecesJointes.fichiers[index].name} (${messageErreur(resultat.reason) || "erreur inconnue"})`);
        });
        if (echecs.length > 0) {
          setErreur(`Ces fichiers n'ont pas pu être envoyés : ${echecs.join(", ")}. Retire-les ou réessaie.`);
          return false;
        }
      } finally {
        setEnvoiEnCours(false);
      }
    }
    envoyerMessageEtudiant(texteFinal.trim());
    setTexteSaisi("");
    piecesJointes.vider();
    setPanneauOuvert(false);
    return true;
  }

  function ajouterFichiersJoints(nouveaux: File[]) {
    if (nouveaux.length === 0) return;
    const refuses = piecesJointes.ajouter(nouveaux);
    if (refuses > 0) setErreur("Les archives zip ne sont pas encore prises en charge dans le canal.");
    else setErreur(null);
    // Les aperçus s'affichent dans la zone d'écriture : on l'ouvre si elle est fermée.
    if (nouveaux.length > refuses) setPanneauOuvert(true);
  }

  // Entrées du « + » (même menu et mêmes libellés que la barre de saisie du chat, sans
  // les entrées qui n'ont pas de sens ici : mode vocal et canal sont déjà des boutons du groupe).
  const entreesMenuPlus: EntreeMenuPlus[] = [
    { cle: "fichier", Icone: Pin, libelle: "Joindre un fichier", onClick: () => inputFichierRef.current?.click() },
    { cle: "photo", Icone: Camera, libelle: "Prendre une photo", onClick: () => inputPhotoRef.current?.click() },
  ];
  function ajouterAuTexte(ajout: string) {
    setTexteSaisi((prec) => (prec.trim() ? `${prec} ${ajout}` : ajout));
    setPanneauOuvert(true);
  }

  // Même demande d'autorisation que le bouton « Joindre ma position » du chat. La position
  // part dans le texte du message, car le canal transporte ses messages sous forme de texte.
  function joindrePosition() {
    if (!navigator.geolocation) {
      setErreur("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    setPositionEnCours(true);
    setErreur(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        ajouterAuTexte(`[Position jointe : latitude ${position.coords.latitude}, longitude ${position.coords.longitude}]`);
        setPositionEnCours(false);
      },
      () => {
        setErreur("Position refusée ou indisponible.");
        setPositionEnCours(false);
      }
    );
  }

  // Utilitaires que le canal sait exécuter. « Insérer une formule » (suivi en direct dans le
  // champ de la barre de saisie) et « Forcer une recherche web » n'y sont pas : le second ne
  // semble branché sur aucune requête dans le chat non plus (à vérifier côté ChatIA.tsx).
  const actionsUtilitaires = {
    ui_dessin: { executer: () => setDessinOuvert(true) },
    ui_editeur_maths: { executer: () => setMathsOuvert(true) },
    ui_localisation: { executer: joindrePosition, occupe: positionEnCours },
  };

  function surToucheChamp(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void envoyerTexte();
    } else if (e.key === "Escape") {
      setPanneauOuvert(false);
    }
  }

  function choisirMoteur(moteur: MoteurDictee) {
    if (dictee.enEcoute) dictee.annuler();
    choisirMoteurDictee(moteur);
  }

  const classeBouton = (misEnAvant: boolean, occupe: boolean) =>
    `flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors ${
      occupe
        ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02]"
        : misEnAvant
          ? "border-dj-accent-1 bg-dj-surface text-dj-texte hover:bg-dj-surface-haute"
          : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
    }`;

  const fermerPleinEcran = () => fermerPleinEcranAnime(() => setPleinEcran(false));

  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <AnimatePresence>
          {actif && erreur && (
            <motion.p
              key="erreur"
              role="alert"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="max-w-[min(18rem,calc(100vw-2rem))] rounded-cgpt-bouton border border-dj-bordure bg-dj-surface px-3 py-2 text-xs text-[var(--dj-erreur)] shadow-lg"
            >
              {erreur}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {actif && panneauOuvert && (
            <motion.div
              key="panneau"
              data-pas-deplacement="true"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              className="relative flex w-[min(18rem,calc(100vw-2rem))] flex-col gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-2 shadow-xl"
            >
              {/* Plein écran : même flèche que sur la barre de saisie du chat,
                  posée au dessus du coin haut droit de la zone d'écriture. */}
              <button
                type="button"
                onClick={() => setPleinEcran(true)}
                aria-label="Agrandir en plein écran"
                title="Plein écran"
                className="absolute -top-6 right-0 z-10 flex h-6 w-6 items-center justify-center text-dj-texte-muet opacity-70 transition-opacity hover:text-dj-texte hover:opacity-100"
              >
                <ArrowUpRight size={12} strokeWidth={1.75} />
              </button>
              {/* Ligne défilable des pièces jointes avant l'envoi : même composant que dans
                  la barre de saisie du chat. */}
              {piecesJointes.pieces.length > 0 && (
                <LigneApercuPieces pieces={piecesJointes.pieces} onOuvrir={() => {}} onRetirer={piecesJointes.retirer} />
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={champRef}
                  value={texteSaisi}
                  onChange={(e) => setTexteSaisi(e.target.value)}
                  onKeyDown={surToucheChamp}
                  rows={1}
                  placeholder="Dis quelque chose à Classinus..."
                  aria-label="Message pour Classinus pendant qu'il travaille"
                  className="min-h-[2.5rem] max-h-40 flex-1 resize-none overflow-y-auto bg-transparent text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet"
                />
                <button
                  onClick={() => void envoyerTexte()}
                  disabled={envoiEnCours || (!texteSaisi.trim() && piecesJointes.fichiers.length === 0)}
                  aria-label="Envoyer le message"
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-dj-accent-1 text-[#1A0D02] transition-opacity disabled:opacity-40 ${
                    envoiEnCours ? "animate-pulse" : ""
                  }`}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {actif && (contexte.tacheEnCours || groupeOuvert) && (
            <motion.div
              key="ligne-reglages"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <AnimatePresence initial={false}>
                {/* Arrêter la tâche en cours, comme le bouton d'arrêt du chat : le texte déjà
                    écrit reste, la bulle propose ensuite Continuer ou Réessayer (voir
                    lib/tacheCanal.ts). N'apparaît que pendant une tâche et reste visible même
                    quand le groupe est replié. */}
                {contexte.tacheEnCours && (
                  <motion.button
                    key="arreter-tache"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                    onClick={contexte.arreterTache}
                    aria-label="Arrêter la tâche en cours"
                    title="Arrêter la tâche en cours"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02] shadow-lg transition-colors hover:bg-dj-accent-2"
                  >
                    <Square size={14} />
                  </motion.button>
                )}
                {groupeOuvert && (
                  <ApparitionBoutonCanal key="reglages">
                    <BoutonReglagesCanal conversationId={contexte?.conversationId ?? null} />
                  </ApparitionBoutonCanal>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {actif && groupeOuvert && (
            <motion.div
              key="ligne-dictee"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={basculerDictee}
                disabled={dictee.transcriptionEnCours}
                aria-pressed={dictee.enEcoute}
                aria-label={
                  dictee.enEcoute ? "Arrêter la dictée" : dictee.transcriptionEnCours ? "Transcription en cours" : "Dicter un message"
                }
                title={dictee.enEcoute ? "Arrêter la dictée" : "Dicter un message"}
                className={`${classeBouton(modeInteraction === "voix", dictee.enEcoute)} ${
                  dictee.enEcoute || dictee.transcriptionEnCours ? "animate-pulse" : ""
                }`}
              >
                {dictee.enEcoute ? <Square size={16} /> : <Mic size={18} />}
              </button>

              {dictee.navigateurDisponible && (
                <div
                  role="radiogroup"
                  aria-label="Moteur de dictée"
                  className="flex overflow-hidden rounded-full border border-dj-bordure bg-dj-surface text-[11px] shadow-lg"
                >
                  {(Object.keys(LABEL_MOTEUR) as MoteurDictee[]).map((moteur) => (
                    <button
                      key={moteur}
                      role="radio"
                      aria-checked={dictee.moteurUtilise === moteur}
                      onClick={() => choisirMoteur(moteur)}
                      className={`px-2.5 py-1.5 transition-colors ${
                        dictee.moteurUtilise === moteur
                          ? "bg-dj-accent-1 text-[#1A0D02]"
                          : "text-dj-texte-muet hover:text-dj-texte"
                      }`}
                    >
                      {LABEL_MOTEUR[moteur]}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {actif && (
            <motion.div
              key="ligne-ecrire"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2"
            >
              <button
                onClick={basculerPanneau}
                aria-pressed={panneauOuvert}
                aria-label={panneauOuvert ? "Fermer la zone d'écriture" : "Écrire un message"}
                title={panneauOuvert ? "Fermer la zone d'écriture" : "Écrire un message"}
                className={classeBouton(modeInteraction === "texte", panneauOuvert)}
              >
                <PenLine size={18} />
              </button>
              <AnimatePresence initial={false}>
                {groupeOuvert && (
                  <ApparitionBoutonCanal key="mode-vocal">
                    <button
                      onClick={geminiLive.basculer}
                      disabled={geminiLive.etat === "connexion"}
                      aria-pressed={geminiLive.actif}
                      aria-label={geminiLive.actif ? "Arrêter la conversation vocale Gemini" : "Parler en temps réel avec Clovis"}
                      title={geminiLive.actif ? "Arrêter la conversation vocale Gemini" : "Parler en temps réel avec Clovis"}
                      className={`${classeBouton(geminiLive.actif, geminiLive.actif)} ${geminiLive.etat === "reponse" ? "animate-pulse" : ""}`}
                    >
                      <AudioLines size={18} />
                    </button>
                  </ApparitionBoutonCanal>
                )}
                {groupeOuvert && (
                  <ApparitionBoutonCanal key="utilitaires">
                    <BoutonUtilitairesCanal actions={actionsUtilitaires} />
                  </ApparitionBoutonCanal>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-2">
          {boutonActivation}
          <AnimatePresence initial={false}>
            {actif && (
              <ApparitionBoutonCanal key="chevron">
                <button
                  onClick={() => setGroupeOuvert((v) => !v)}
                  aria-expanded={groupeOuvert}
                  aria-label={groupeOuvert ? "Replier les boutons du canal" : "Déplier les boutons du canal"}
                  title={groupeOuvert ? "Replier les boutons du canal" : "Déplier les boutons du canal"}
                  className={classeBouton(false, false)}
                >
                  {groupeOuvert ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </button>
              </ApparitionBoutonCanal>
            )}
            {actif && groupeOuvert && (
              <ApparitionBoutonCanal key="plus">
                <div className="flex h-10 w-10 items-center justify-center">
                  <MenuPlus variante="bureau" entrees={entreesMenuPlus} />
                </div>
              </ApparitionBoutonCanal>
            )}
          </AnimatePresence>
        </div>
      </div>

      {monte &&
        createPortal(
          <AnimatePresence>
            {actif && groupeOuvert && (
              <motion.div
                key="journal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <BoutonJournalAgent />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <input
        ref={inputFichierRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          ajouterFichiersJoints(Array.from(e.target.files ?? []));
          // Sans ça, rejoindre le même fichier juste après l'avoir retiré ne redéclenche pas onChange.
          e.target.value = "";
        }}
      />
      <input
        ref={inputPhotoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          ajouterFichiersJoints(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {dessinOuvert && (
        <CanvasDessin
          enSortie={dessinEnSortie}
          onFermer={() => fermerDessinAnime(() => setDessinOuvert(false))}
          onValider={(fichier) => {
            ajouterFichiersJoints([fichier]);
            fermerDessinAnime(() => setDessinOuvert(false));
          }}
        />
      )}

      {mathsOuvert && (
        <EditeurMathsRiche
          enSortie={mathsEnSortie}
          onFermer={() => fermerMathsAnime(() => setMathsOuvert(false))}
          onInserer={(texteSerialise) => {
            ajouterAuTexte(texteSerialise);
            fermerMathsAnime(() => setMathsOuvert(false));
          }}
        />
      )}

      {pleinEcran && (
        <PleinEcranApercu
          titre="Écris ton message"
          onFerme={fermerPleinEcran}
          enSortie={pleinEcranEnSortie}
          entete={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-dj-texte-muet">Écris ton message</span>
              <button
                onClick={fermerPleinEcran}
                aria-label="Rétrécir"
                className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <Minimize2 size={14} /> Rétrécir
              </button>
            </div>
          }
        >
          {piecesJointes.pieces.length > 0 && (
            <div className="pb-3">
              <LigneApercuPieces pieces={piecesJointes.pieces} onOuvrir={() => {}} onRetirer={piecesJointes.retirer} />
            </div>
          )}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <textarea
              autoFocus
              value={texteSaisi}
              onChange={(e) => setTexteSaisi(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void envoyerTexte().then((parti) => parti && fermerPleinEcran());
                }
              }}
              placeholder="Dis quelque chose à Classinus..."
              aria-label="Message pour Classinus pendant qu'il travaille"
              className="h-full w-full resize-none overflow-y-auto bg-transparent text-base leading-relaxed text-dj-texte outline-none placeholder:text-dj-texte-muet"
            />
          </div>
          {/* Le plein écran recouvre le groupe : l'erreur d'envoi doit s'afficher ici aussi. */}
          {erreur && (
            <p role="alert" className="pt-3 text-xs text-[var(--dj-erreur)]">
              {erreur}
            </p>
          )}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => void envoyerTexte().then((parti) => parti && fermerPleinEcran())}
              disabled={envoiEnCours || (!texteSaisi.trim() && piecesJointes.fichiers.length === 0)}
              aria-label="Envoyer le message"
              className="flex items-center gap-2 rounded-cgpt-bouton bg-dj-accent-1 px-5 py-2.5 text-sm font-medium text-[#1A0D02] disabled:opacity-60"
            >
              Envoyer <ArrowUp size={16} />
            </button>
          </div>
        </PleinEcranApercu>
      )}
    </>
  );
}
