"use client";

// Page bambara (16/11/2026, demande de Bourama) : une page de Classinus pour les personnes qui parlent
// bambara et ne savent ni lire ni écrire. Elle ne contient que la bulle en haut et le micro. On touche
// le micro, on parle, l'IA répond à voix haute en bambara comme le mode vocal bambara (lib/voixBambara.ts),
// et l'écran ne montre que ce qui aide à comprendre : des vidéos, des images, et un effet de
// construction pendant que l'IA cherche ou crée. La réflexion n'est jamais montrée, les outils non plus.
// Côté serveur, cette page n'a que la recherche, la génération visuelle et la mémoire, avec l'effort
// de réflexion au plus faible (client `page_bambara`, core/outils_page_bambara.py).
// Un petit bouton clavier ouvre un champ pour écrire au lieu de parler (lib/useEcritureBambara.ts) : la
// réponse s'affiche alors en texte et elle est lue à voix haute. Le champ reste caché tant qu'on ne le demande pas.
// Look du 18/11/2026 (demande de Bourama) : noir et blanc uniquement. Les couleurs viennent de .bb-page
// (components/bambara/bambara.css), jamais du thème coloré de l'appli.
// Refonte du 18/11/2026 (demande de Bourama) : la bulle en haut, le champ d'écriture et le micro en bas
// FLOTTENT par dessus le contenu, ils ne prennent jamais de place dans la mise en page. Le clavier du
// téléphone se pose aussi par dessus (app/bambara/layout.tsx et lib/useDecalageClavier.ts) : rien n'est
// poussé ni écrasé. Les images et vidéos sont de petites rangées défilantes, comme dans le chat
// (RangeesVisuelsBambara.tsx), parce que c'est une conversation et non une page de résultats.
// Messages audio (19/11/2026, demande de Bourama) : comme sur WhatsApp, ce que la personne dit devient un message audio
// à droite (components/bambara/BulleAudioBambara.tsx) et la voix de Classinus un message audio à gauche, tous deux
// réécoutables. Ils restent dans la page avec le reste de la conversation. Pendant qu'un message se réécoute, le micro
// est en pause (il entendrait le haut parleur) et il reprend ensuite.
// Ordre (19/11/2026, demande de Bourama) : dans chaque message, le vocal est en haut puis le texte en dessous, replié par
// défaut sur une seule ligne (components/bambara/TexteReplieBambara.tsx), même pour une demande parlée. La bulle audio
// de la réponse est déjà là, en préparation, dès que la réponse se prépare : rien ne se décale quand la voix est prête.
// Effet conversation (18/11/2026, demande de Bourama) : chaque demande s'ajoute à la suite des précédentes,
// la plus récente en bas, au lieu de faire repartir l'écran de zéro. Une demande écrite montre aussi la
// question écrite. L'écran suit la dernière réponse tant que la
// personne n'est pas remontée lire plus haut.
// Forme (18/11/2026, demande de Bourama) : les médias (images, vidéos, cadres de construction) ont des angles nets,
// les commandes (micro, bouton clavier, champ d'écriture) sont rondes. La bulle du haut est la mini bulle du chat, en haut
// à droite ; le micro et le bouton clavier sont petits et bas, sous le pouce (demande de Bourama, 18/11/2026).
// Le texte de la page (réponse, question écrite, champ d'écriture) est en font-lecture, la police des réponses du chat.

import "./bambara.css";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Loader2, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { OndeVoix } from "@/components/voix/OndeVoix";
import type { MessageAudioBambara } from "@/lib/audioMessageBambara";
import type { EtatVoixDirecte } from "@/lib/contexteVoixDirecte";
import { messageErreurVoix } from "@/lib/erreurs";
import { useLocale } from "@/lib/i18n/useLocale";
import { demanderPageBambara } from "@/lib/pageBambara";
import { effetPrincipal, fusionnerVisuels, modifierTour, retirerTour, type TourBambara } from "@/lib/pageBambaraVisuels";
import { supabase } from "@/lib/supabase";
import { useDecalageClavier } from "@/lib/useDecalageClavier";
import { useEcritureBambara } from "@/lib/useEcritureBambara";
import { ouvrirVoixBambara, type SessionVoixBambara } from "@/lib/voixBambara";
import { nettoyerPourVoix } from "@/lib/voixBambaraTexte";
import { BulleAudioBambara } from "./BulleAudioBambara";
import { ChampEcritureBambara } from "./ChampEcritureBambara";
import { TexteReplieBambara } from "./TexteReplieBambara";
import { EffetConstruction } from "./EffetConstruction";
import { RangeesVisuelsBambara } from "./RangeesVisuelsBambara";

const TEXTES = {
  fr: {
    parler: "Parler", arreter: "Arrêter", lire: "Lancer la vidéo", fermerVideo: "Fermer la vidéo", ouvrirImage: "Voir l'image", erreur: "Un problème est survenu.",
    ecrire: "Écrire un message", masquerChamp: "Masquer le champ d'écriture", placeholder: "Écrire ici", envoyer: "Envoyer",
    ecouter: "Écouter le message", mettreEnPause: "Mettre le message en pause",
    deplier: "Voir tout le texte", replier: "Réduire le texte",
  },
  en: {
    parler: "Speak", arreter: "Stop", lire: "Play the video", fermerVideo: "Close the video", ouvrirImage: "View the image", erreur: "Something went wrong.",
    ecrire: "Write a message", masquerChamp: "Hide the writing field", placeholder: "Write here", envoyer: "Send",
    ecouter: "Play the message", mettreEnPause: "Pause the message",
    deplier: "Show the whole text", replier: "Collapse the text",
  },
} as const;

function nouvelIdentifiant(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "bambara-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

export default function PageBambaraClient() {
  const router = useRouter();
  const locale = useLocale();
  const textes = TEXTES[locale];

  const [connecte, setConnecte] = useState(false);
  const [etat, setEtat] = useState<EtatVoixDirecte>("inactif");
  const [erreur, setErreur] = useState<string | null>(null);
  const [tours, setTours] = useState<TourBambara[]>([]);
  const [outils, setOutils] = useState<string[]>([]);
  const [champOuvert, setChampOuvert] = useState(false);
  // Une seule vidéo se lit à la fois dans toute la conversation (identifiant : tour + vidéo).
  const [videoEnLecture, setVideoEnLecture] = useState<string | null>(null);
  // Un seul message audio se réécoute à la fois (identifiant : tour + sens). Quand l'un joue, le micro est en pause.
  const [messageEnLecture, setMessageEnLecture] = useState<string | null>(null);
  const messageEnLectureRef = useRef<string | null>(null);
  // Le tour de la demande parlée en cours : c'est à lui que se rattache la voix de Classinus une fois lue.
  const tourVocalRef = useRef("");
  // Ce qui attend la fin d'un message audio réécouté (la lecture d'une réponse écrite).
  const attentesMessageRef = useRef<Array<() => void>>([]);

  const racineRef = useRef<HTMLDivElement>(null);
  const defilementRef = useRef<HTMLElement>(null);
  const prochesDuBasRef = useRef(true);
  const tourCourantRef = useRef("");
  const decalageClavier = useDecalageClavier(racineRef);
  const sessionRef = useRef<SessionVoixBambara | null>(null);
  const ouvertureEnCoursRef = useRef(false);
  const conversationIdRef = useRef<string>("");
  if (!conversationIdRef.current) conversationIdRef.current = nouvelIdentifiant();

  // Un message audio démarre (identifiant) ou s'arrête (null). À l'arrêt, ce qui attendait la fin de la réécoute repart.
  const fixerMessageEnLecture = useCallback((id: string | null) => {
    messageEnLectureRef.current = id;
    setMessageEnLecture(id);
    if (id === null) {
      const attentes = attentesMessageRef.current;
      attentesMessageRef.current = [];
      attentes.forEach((reprendre) => reprendre());
    }
  }, []);

  const attendreFinMessage = useCallback((): Promise<void> => {
    if (!messageEnLectureRef.current) return Promise.resolve();
    return new Promise<void>((resoudre) => { attentesMessageRef.current.push(resoudre); });
  }, []);

  // Nouvelle demande : un tour s'ajoute en bas, les précédents restent. On suit alors la nouvelle réponse.
  // Un message audio en cours de réécoute s'arrête : la nouvelle demande reprend la main (le micro, lui, n'écoute
  // rien pendant une réécoute, donc il n'y a rien à rouvrir ici).
  const demarrerTour = useCallback((question: string, audioQuestion: MessageAudioBambara | null = null): string => {
    const id = nouvelIdentifiant();
    tourCourantRef.current = id;
    prochesDuBasRef.current = true;
    fixerMessageEnLecture(null);
    setOutils([]);
    setTours((precedents) => [...precedents, { id, question, texte: "", visuels: [], audioQuestion, audioReponse: null }]);
    return id;
  }, [fixerMessageEnLecture]);

  // Ce que la voix de Classinus a lu devient un message audio du tour concerné.
  const ajouterAudioReponse = useCallback((idTour: string, message: MessageAudioBambara) => {
    setTours((precedents) => modifierTour(precedents, idTour, (tour) => ({ ...tour, audioReponse: message })));
  }, []);

  const ajouterVisuels = useCallback((nouveaux: Parameters<typeof fusionnerVisuels>[1]) => {
    const id = tourCourantRef.current;
    setTours((precedents) => modifierTour(precedents, id, (tour) => ({ ...tour, visuels: fusionnerVisuels(tour.visuels, nouveaux) })));
  }, []);

  const changerTexte = useCallback((texte: string) => {
    const id = tourCourantRef.current;
    setTours((precedents) => modifierTour(precedents, id, (tour) => ({ ...tour, texte })));
  }, []);

  // L'écran suit la dernière réponse, sauf si la personne est remontée lire plus haut.
  useEffect(() => {
    const zone = defilementRef.current;
    if (!zone || !prochesDuBasRef.current) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    zone.scrollTo({ top: zone.scrollHeight, behavior: reduit ? "auto" : "smooth" });
  }, [tours, outils]);

  // Page réservée aux utilisateurs connectés : sans session, retour à la connexion.
  useEffect(() => {
    let annule = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (annule) return;
      if (data.session) setConnecte(true);
      else router.replace("/connexion");
    });
    return () => {
      annule = true;
    };
  }, [router]);

  useEffect(() => () => { sessionRef.current?.fermer(); }, []);

  // Demande écrite : elle s'ajoute à la conversation et une écoute du micro encore ouverte est fermée.
  const ecriture = useEcritureBambara({
    conversationId: () => conversationIdRef.current,
    avantEnvoi: (question) => {
      sessionRef.current?.fermer();
      setErreur(null);
      return demarrerTour(question);
    },
    surAudio: ajouterAudioReponse,
    avantLecture: attendreFinMessage,
    surOutilsEnCours: setOutils,
    surVisuels: ajouterVisuels,
    surTexte: changerTexte,
    surErreur: setErreur,
  });
  const { actif: ecritureActive, arreter: arreterEcriture, couperVoix: couperVoixEcriture, niveau: niveauEcriture } = ecriture;

  // Un message audio démarre ou s'arrête. Quand il démarre : la voix de Classinus qui parlait est coupée, une vidéo
  // qui jouait s'arrête, et le micro se met en pause (il entendrait le haut parleur et prendrait ce son pour une
  // demande). Quand il s'arrête, le micro reprend l'écoute.
  const changerMessageEnLecture = useCallback((id: string | null) => {
    fixerMessageEnLecture(id);
    const session = sessionRef.current;
    if (id) {
      setVideoEnLecture(null);
      session?.suspendreEcoute();
      session?.interrompre();
      couperVoixEcriture();
    } else {
      session?.reprendreEcoute();
    }
  }, [couperVoixEcriture, fixerMessageEnLecture]);

  // Une vidéo qui démarre arrête le message audio en cours (et rend l'écoute au micro).
  const changerVideoEnLecture = useCallback((id: string | null) => {
    if (id && messageEnLectureRef.current) {
      fixerMessageEnLecture(null);
      sessionRef.current?.reprendreEcoute();
    }
    setVideoEnLecture(id);
  }, [fixerMessageEnLecture]);

  // Pendant la lecture d'une réponse écrite, c'est cette lecture qui fait bouger l'onde.
  const lireNiveaux = useCallback(
    () => sessionRef.current?.niveaux() ?? { entree: 0, sortie: niveauEcriture() },
    [niveauEcriture]
  );

  const ouvrir = useCallback(async () => {
    if (sessionRef.current || ouvertureEnCoursRef.current) return;
    ouvertureEnCoursRef.current = true;
    setErreur(null);
    try {
      const session = await ouvrirVoixBambara({
        surEtat: (nouvelEtat) => {
          if (nouvelEtat === "ferme") {
            sessionRef.current = null;
            setEtat("inactif");
          } else {
            setEtat(nouvelEtat);
          }
        },
        surErreur: setErreur,
        // Dès que la personne a fini de parler, son message audio s'ajoute à la conversation, sans attendre la
        // transcription. Si rien n'est compris (bruit), ce message est retiré.
        surParole: (message) => {
          tourVocalRef.current = demarrerTour("", message);
        },
        surParoleVide: () => {
          const id = tourVocalRef.current;
          setTours((precedents) => retirerTour(precedents, id));
        },
        // Le texte de la parole (transcription) et celui de la réponse apparaissent aussi, repliés sous leur bulle audio.
        surDemande: async (question) => {
          const id = tourVocalRef.current;
          setTours((precedents) => modifierTour(precedents, id, (tour) => ({ ...tour, question })));
          const reponse = await demanderPageBambara(question, conversationIdRef.current, {
            surOutilsEnCours: setOutils,
            surVisuels: ajouterVisuels,
            surTexte: (cumule) => setTours((precedents) => modifierTour(precedents, id, (tour) => ({ ...tour, texte: nettoyerPourVoix(cumule) }))),
          });
          setTours((precedents) => modifierTour(precedents, id, (tour) => ({ ...tour, texte: nettoyerPourVoix(reponse) })));
          return reponse;
        },
        surReponseAudio: (message) => ajouterAudioReponse(tourVocalRef.current, message),
      });
      sessionRef.current = session;
    } catch (e) {
      setEtat("erreur");
      setErreur(messageErreurVoix(e));
    } finally {
      ouvertureEnCoursRef.current = false;
    }
  }, [demarrerTour, ajouterVisuels, ajouterAudioReponse]);

  const basculer = useCallback(() => {
    // Un message audio se réécoutait : toucher le micro l'arrête (le micro, lui, est ouvert ou fermé juste après).
    if (messageEnLectureRef.current) fixerMessageEnLecture(null);
    // Une réponse écrite est en cours : le micro sert d'abord à l'arrêter.
    // Arrêter ne supprime rien de la conversation : seul l'effet de construction en cours disparaît.
    if (ecritureActive) {
      arreterEcriture();
      setOutils([]);
      return;
    }
    if (sessionRef.current) {
      sessionRef.current.fermer();
      setOutils([]);
      return;
    }
    void ouvrir();
  }, [ouvrir, ecritureActive, arreterEcriture, fixerMessageEnLecture]);

  const effet = effetPrincipal(outils);
  const actif = (etat !== "inactif" && etat !== "erreur") || ecritureActive;
  const etatBulle: EtatVoixDirecte = etat !== "inactif" ? etat : ecriture.etat;
  const enConnexion = etat === "connexion";
  // Une réponse se prépare ou se lit : la dernière bulle audio de Classinus est déjà là, en préparation.
  const reponseEnCours = etat === "travail" || etat === "reponse" || ecriture.etat === "travail" || ecriture.etat === "reponse";

  if (!connecte) return <div className="bb-page fixed inset-0" />;

  return (
    <div ref={racineRef} className="bb-page fixed inset-0 overflow-hidden">
      {/* Ce qui se construit puis ce qui est trouvé : le texte de la réponse (après une demande écrite), puis de petites
          rangées d'images et de vidéos. Cette couche remplit tout l'écran et défile derrière la bulle et les commandes :
          ses marges haute et basse sont fixes, elles ne changent jamais quand le champ ou le clavier s'ouvrent. */}
      <main
        ref={defilementRef}
        onScroll={(e) => {
          const zone = e.currentTarget;
          prochesDuBasRef.current = zone.scrollHeight - zone.scrollTop - zone.clientHeight < 240;
        }}
        className="absolute inset-0 overflow-y-auto overscroll-contain px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10rem)",
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          {tours.map((tour, rang) => {
            const dernier = rang === tours.length - 1;
            const bullePreparee = !tour.audioReponse && dernier && reponseEnCours;
            if (!tour.question && !tour.audioQuestion && !tour.texte && tour.visuels.length === 0 && !tour.audioReponse && !bullePreparee) return null;
            return (
              <div key={tour.id} className="flex w-full flex-col gap-3">
                {tour.audioQuestion && (
                  <BulleAudioBambara
                    id={tour.id + ":question"}
                    message={tour.audioQuestion}
                    cote="droite"
                    idEnLecture={messageEnLecture}
                    surChangerLecture={changerMessageEnLecture}
                    libelleEcouter={textes.ecouter}
                    libelleMettreEnPause={textes.mettreEnPause}
                  />
                )}
                {tour.question && tour.audioQuestion && (
                  <TexteReplieBambara texte={tour.question} cote="droite" libelleDeplier={textes.deplier} libelleReplier={textes.replier} />
                )}
                {tour.question && !tour.audioQuestion && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="max-w-[85%] self-end whitespace-pre-line break-words rounded-2xl border px-4 py-2 font-lecture text-base leading-snug"
                    style={{ borderColor: "var(--bb-trait)", backgroundColor: "var(--bb-voile)", color: "var(--bb-encre)" }}
                  >
                    {tour.question}
                  </motion.p>
                )}
                {(tour.audioReponse || bullePreparee) && (
                  <BulleAudioBambara
                    id={tour.id + ":reponse"}
                    message={tour.audioReponse ?? null}
                    cote="gauche"
                    idEnLecture={messageEnLecture}
                    surChangerLecture={changerMessageEnLecture}
                    libelleEcouter={textes.ecouter}
                    libelleMettreEnPause={textes.mettreEnPause}
                  />
                )}
                {tour.texte && (
                  <TexteReplieBambara texte={tour.texte} cote="gauche" libelleDeplier={textes.deplier} libelleReplier={textes.replier} />
                )}
                <RangeesVisuelsBambara
                  idTour={tour.id}
                  visuels={tour.visuels}
                  idEnLecture={videoEnLecture}
                  surChangerLecture={changerVideoEnLecture}
                  libelleLire={textes.lire}
                  libelleFermerVideo={textes.fermerVideo}
                  libelleOuvrirImage={textes.ouvrirImage}
                />
              </div>
            );
          })}
          {/* L'effet de construction du tour en cours, tout en bas, sous ce qui est déjà arrivé. */}
          <AnimatePresence mode="wait">
            {effet && (
              <motion.div
                key={effet}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full"
              >
                <EffetConstruction effet={effet} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* La mini bulle, comme dans le chat (VoixDirecteSuperposition.tsx) : un petit rond de 56 px en haut à droite avec l'onde
          de la voix, qui montre qui écoute, qui parle et qui travaille. Elle flotte par dessus le contenu (fond plein, le
          contenu passe dessous) et ne prend aucune place dans la page. */}
      <div
        className="pointer-events-none absolute right-3 z-10 h-14 w-14 overflow-hidden rounded-full border"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          borderColor: "var(--bb-trait)",
          backgroundColor: "var(--bb-voile)",
        }}
      >
        <OndeVoix mini etat={etatBulle} lireNiveaux={lireNiveaux} />
      </div>

      {/* En bas, par dessus le contenu : le champ d'écriture (caché par défaut), puis le micro avec le petit bouton clavier
          à côté. Quand le clavier du téléphone s'ouvre, cette couche remonte juste au dessus de lui. */}
      <div
        className="bb-clavier pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
          transform: decalageClavier ? `translateY(-${decalageClavier}px)` : undefined,
        }}
      >
        <AnimatePresence initial={false}>
          {champOuvert && (
            <ChampEcritureBambara
              key="champ"
              placeholder={textes.placeholder}
              libelleEnvoyer={textes.envoyer}
              occupe={ecritureActive}
              surEnvoi={(texte) => void ecriture.envoyer(texte)}
            />
          )}
        </AnimatePresence>
        {/* Le micro : un toucher pour parler, un toucher pour arrêter. */}
        <div className="pointer-events-auto relative h-16 w-16">
          {actif && !enConnexion && <span className="bb-halo" />}
          <button
            type="button"
            onClick={basculer}
            aria-label={actif ? textes.arreter : textes.parler}
            aria-pressed={actif}
            className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
            style={{
              // Une erreur ne se dit pas par une couleur : le micro se vide (fond clair, trait d'encre).
              backgroundColor: erreur ? "var(--bb-fond)" : "var(--bb-encre)",
              color: erreur ? "var(--bb-encre)" : "var(--bb-fond)",
              borderColor: "var(--bb-encre)",
            }}
          >
            {enConnexion ? <Loader2 size={28} className="animate-spin" /> : <Mic size={28} />}
          </button>
          <button
            type="button"
            onClick={() => setChampOuvert((ouvert) => !ouvert)}
            aria-label={champOuvert ? textes.masquerChamp : textes.ecrire}
            aria-pressed={champOuvert}
            className="absolute left-full top-1/2 ml-5 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border transition-transform active:scale-95"
            style={{
              borderColor: champOuvert ? "var(--bb-encre)" : "var(--bb-trait-fort)",
              backgroundColor: champOuvert ? "var(--bb-encre)" : "var(--bb-fond)",
              color: champOuvert ? "var(--bb-fond)" : "var(--bb-encre)",
            }}
          >
            <Keyboard size={20} />
          </button>
        </div>
      </div>

      {/* Lu seulement par les lecteurs d'écran : les erreurs ne sont jamais écrites à l'écran. */}
      <p role="status" aria-live="polite" className="sr-only">{erreur ? erreur || textes.erreur : ""}</p>
    </div>
  );
}
