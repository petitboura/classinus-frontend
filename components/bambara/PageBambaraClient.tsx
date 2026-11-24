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
// poussé ni écrasé. Les images et vidéos forment des planches de vignettes (3 par ligne, qui descendent), comme une pellicule
// (RangeesVisuelsBambara.tsx), parce que c'est une conversation et non une page de résultats.
// Messages audio (19/11/2026, demande de Bourama) : comme sur WhatsApp, ce que la personne dit devient un message audio
// à droite (components/bambara/BulleAudioBambara.tsx) et la voix de Classinus un message audio à gauche, tous deux
// réécoutables. Ils restent dans la page avec le reste de la conversation. Pendant qu'un message se réécoute, le micro
// est en pause (il entendrait le haut parleur) et il reprend ensuite.
// Ordre (19/11/2026, demande de Bourama) : le vocal est en haut puis le texte de la réponse en dessous, replié par défaut
// sur une seule ligne, sans case autour (components/bambara/TexteReplieBambara.tsx), même pour une demande parlée. Aucun
// texte n'est écrit dans la bulle de la personne qui parle. La bulle audio
// de la réponse est déjà là, en préparation, dès que la réponse se prépare : rien ne se décale quand la voix est prête.
// Effet conversation (18/11/2026, demande de Bourama) : chaque demande s'ajoute à la suite des précédentes,
// la plus récente en bas, au lieu de faire repartir l'écran de zéro. Une demande écrite montre aussi la
// question écrite. L'écran suit la dernière réponse tant que la
// personne n'est pas remontée lire plus haut.
// Forme (18/11/2026, demande de Bourama) : les médias (images, vidéos, cadres de construction) ont des angles nets,
// les commandes (micro, bouton clavier, champ d'écriture) sont rondes. La bulle du haut est la mini bulle du chat, en haut
// à droite ; le micro et le bouton clavier sont petits et bas, sous le pouce (demande de Bourama, 18/11/2026).
// Le texte de la page (réponse, question écrite, champ d'écriture) est en font-lecture, la police des réponses du chat.
// Boutons du haut (18/11/2026, demande de Bourama) : en haut à gauche, paramètres (depuis le 23/11/2026, à la place du
// bouton profil), nouvelle conversation (« + »),
// historique et éléments gardés (components/bambara/BarreHautBambara.tsx). Chaque vidéo et image a un cœur pour la garder.
// Tout est rangé dans le compte (lib/useBambaraEspace.ts, api/bambara_profils.py côté backend) : chaque profil a son
// historique et ses éléments gardés. Le premier message de chaque conversation est gardé pour l'historique.

import "./bambara.css";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Loader2, Mic, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MessageAudioBambara } from "@/lib/audioMessageBambara";
import type { EtatVoixDirecte } from "@/lib/contexteVoixDirecte";
import { messageErreurVoix } from "@/lib/erreurs";
import { useLocale } from "@/lib/i18n/useLocale";
import { estMaameDansNavigateur } from "@/lib/maame";
import { demanderPageBambara } from "@/lib/pageBambara";
import { effetsActifs, effetsAffiches, fusionnerVisuels, modifierTour, retirerTour, visuelsDepuisMessageGarde, type EffetConstruction as EffetOutil, type TourBambara } from "@/lib/pageBambaraVisuels";
import {
  enregistrerAudioMessageBambara,
  enregistrerPremierMessageBambara,
  listerAudiosConversationBambara,
  lireAudioConversationBambara,
  lireAudioMessageBambara,
  lireMessagesConversationBambara,
  type ConversationBambara,
} from "@/lib/bambaraEspace";
import { ecrireEtatDepuisChat } from "@/lib/conversationPartagee";
import { supabase } from "@/lib/supabase";
import { useBambaraEspace } from "@/lib/useBambaraEspace";
import { useReglagesBambara } from "@/lib/reglagesBambara";
import { blocsDeReponse, idBlocTexte } from "@/lib/blocsBambara";
import { useDecalageClavier } from "@/lib/useDecalageClavier";
import { useEcritureBambara } from "@/lib/useEcritureBambara";
import { ouvrirVoixBambara, type SessionVoixBambara } from "@/lib/voixBambara";
import { nettoyerPourVoix } from "@/lib/voixBambaraTexte";
import { BarreHautBambara } from "./BarreHautBambara";
import { BulleAudioBambara } from "./BulleAudioBambara";
import { ChampEcritureBambara } from "./ChampEcritureBambara";
import { IndicateurEnregistrementBambara } from "./IndicateurEnregistrementBambara";
import { BlocTexteBambara } from "./BlocTexteBambara";
import { EffetConstruction } from "./EffetConstruction";
import { RangeesVisuelsBambara } from "./RangeesVisuelsBambara";

const TEXTES = {
  fr: {
    parler: "Parler", arreter: "Arrêter", enregistrement: "Enregistrement de ta voix", lire: "Lancer la vidéo", fermerVideo: "Fermer la vidéo", ouvrirImage: "Voir l'image", erreur: "Un problème est survenu.",
    ecrire: "Écrire un message", masquerChamp: "Masquer le champ d'écriture", placeholder: "Écrire ici", envoyer: "Envoyer",
    ecouter: "Écouter le message", mettreEnPause: "Mettre le message en pause",
    deplier: "Voir tout le texte", replier: "Réduire le texte",
    parametres: "Paramètres", afficherTexteReponse: "Afficher le texte des réponses", nouvelleConversation: "Nouvelle conversation", historique: "Historique", gardes: "Gardés",
    ouvrirMenu: "Ouvrir les boutons", fermerMenu: "Fermer les boutons", ouvrirConversation: "Ouvrir la conversation",
    videos: "Vidéos", images: "Images", garder: "Garder", retirerGarde: "Ne plus garder",
    theme: "Thème", themeSysteme: "Système", themeClair: "Clair", themeSombre: "Sombre", afficherBoutonClavier: "Afficher le bouton clavier",
  },
  en: {
    parler: "Speak", arreter: "Stop", enregistrement: "Recording your voice", lire: "Play the video", fermerVideo: "Close the video", ouvrirImage: "View the image", erreur: "Something went wrong.",
    ecrire: "Write a message", masquerChamp: "Hide the writing field", placeholder: "Write here", envoyer: "Send",
    ecouter: "Play the message", mettreEnPause: "Pause the message",
    deplier: "Show the whole text", replier: "Collapse the text",
    parametres: "Settings", afficherTexteReponse: "Show the text of the answers", nouvelleConversation: "New conversation", historique: "History", gardes: "Kept",
    ouvrirMenu: "Open the buttons", fermerMenu: "Close the buttons", ouvrirConversation: "Open the conversation",
    videos: "Videos", images: "Images", garder: "Keep", retirerGarde: "Remove from kept",
    theme: "Theme", themeSysteme: "System", themeClair: "Light", themeSombre: "Dark", afficherBoutonClavier: "Show the keyboard button",
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
  // Sur Maame, le logo prend la place de l'icône du bouton du haut (page chargée côté navigateur seulement, window existe).
  const surMaame = useMemo(() => estMaameDansNavigateur(), []);
  const [tours, setTours] = useState<TourBambara[]>([]);
  const [outils, setOutils] = useState<string[]>([]);
  const [champOuvert, setChampOuvert] = useState(false);
  // Profils, historique et éléments gardés du compte (lib/useBambaraEspace.ts).
  const espace = useBambaraEspace(connecte);
  // Réglages de la page (23/11/2026) : le texte des réponses (non par défaut), le thème et le bouton clavier (masqué par défaut).
  const reglages = useReglagesBambara();
  // Le bouton clavier est masqué dans les paramètres : le champ d'écriture ne reste pas ouvert sans lui.
  const { afficherBoutonClavier } = reglages;
  useEffect(() => {
    if (!afficherBoutonClavier) setChampOuvert(false);
  }, [afficherBoutonClavier]);
  const profilIdRef = useRef<string | null>(null);
  profilIdRef.current = espace.profilId;
  // Le premier message de la conversation est gardé une seule fois, pour l'historique ; le vocal de la demande
  // parlée en cours attend sa transcription (la demande), c'est elle qui déclenche l'enregistrement.
  const premierMessageGardeRef = useRef(false);
  const audioParoleRef = useRef<MessageAudioBambara | null>(null);
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
  // La conversation affichée, pour la montrer dans l'historique (demande de Bourama du 23/11/2026).
  const [idConversationCourante, setIdConversationCourante] = useState<string>(() => conversationIdRef.current);

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

  const garderPremierMessage = useCallback((texte: string, audio: MessageAudioBambara | null) => {
    if (premierMessageGardeRef.current) return;
    premierMessageGardeRef.current = true;
    void enregistrerPremierMessageBambara({ conversationId: conversationIdRef.current, profilId: profilIdRef.current, texte, audio }).catch(() => {
      // Rien n'est montré : le message suivant de la conversation retentera.
      premierMessageGardeRef.current = false;
    });
  }, []);

  // Le premier message parlé (avec son vocal, jusqu'à 2 Mo) n'est pas envoyé en même temps que la réponse, qu'il ralentissait
  // sur un réseau faible (23/11/2026, demande de Bourama) : il attend ici la fin du tour. Le serveur le garde à part de la
  // réponse, l'ordre n'a pas d'importance. L'identifiant de la conversation est noté tout de suite : s'il change entre
  // temps (le « + », une conversation de l'historique), c'est bien l'ancienne qui reçoit son premier message.
  const premierMessageEnAttenteRef = useRef<{ conversationId: string; profilId: string | null; texte: string; audio: MessageAudioBambara | null } | null>(null);
  const mettreEnAttentePremierMessage = useCallback((texte: string, audio: MessageAudioBambara | null) => {
    if (premierMessageGardeRef.current || premierMessageEnAttenteRef.current) return;
    premierMessageEnAttenteRef.current = { conversationId: conversationIdRef.current, profilId: profilIdRef.current, texte, audio };
  }, []);
  // À appeler à la fin du tour, et avant tout ce qui change de conversation ou envoie un autre premier message.
  const envoyerPremierMessageEnAttente = useCallback(() => {
    const attente = premierMessageEnAttenteRef.current;
    premierMessageEnAttenteRef.current = null;
    if (!attente || premierMessageGardeRef.current) return;
    premierMessageGardeRef.current = true;
    void enregistrerPremierMessageBambara(attente).catch(() => {
      // Rien n'est montré : le message suivant de la conversation retentera.
      premierMessageGardeRef.current = false;
    });
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
    setTours((precedents) => [...precedents, { id, question, texte: "", brut: "", fini: false, visuels: [], audioQuestion, audiosBlocs: {} }]);
    return id;
  }, [fixerMessageEnLecture]);

  // Toutes les voix sont gardées par le serveur (22/11/2026, demande de Bourama), rattachées aux messages écrits de
  // la conversation : on attend d'avoir les identifiants de ces messages (fin de l'échange) et le son, puis on envoie.
  const idsToursRef = useRef(new Map<string, { conversationId: string; idUser: number | string | null; idAssistant: number | string | null }>());
  const audiosToursRef = useRef(new Map<string, { question?: MessageAudioBambara; blocs?: Record<number, MessageAudioBambara> }>());
  const audiosEnvoyesRef = useRef(new Set<string>());
  // Les sons ne partent qu'une fois la réponse lue (23/11/2026, demande de Bourama) : jusqu'à 2 Mo envoyés en même temps
  // que la réponse la ralentissaient sur un réseau faible. Ils partent à la fin du tour, quoi qu'il arrive à la lecture.
  const toursFinisRef = useRef(new Set<string>());
  const envoyerAudiosTour = useCallback((idTour: string) => {
    if (!toursFinisRef.current.has(idTour)) return;
    const ids = idsToursRef.current.get(idTour);
    const audios = audiosToursRef.current.get(idTour);
    if (!ids || !audios) return;
    // La voix de la personne, puis un vocal par bloc de texte de la réponse (23/11/2026, demande de Bourama).
    const lots = [
      { sens: "question" as const, bloc: 0, messageId: ids.idUser, audio: audios.question },
      ...Object.entries(audios.blocs ?? {}).map(([rang, audio]) => ({ sens: "reponse" as const, bloc: Number(rang), messageId: ids.idAssistant, audio })),
    ];
    for (const { sens, bloc, messageId, audio } of lots) {
      const cle = `${idTour}:${sens}:${bloc}`;
      if (messageId === null || !audio || audiosEnvoyesRef.current.has(cle)) continue;
      audiosEnvoyesRef.current.add(cle);
      void enregistrerAudioMessageBambara({ conversationId: ids.conversationId, messageId, sens, bloc, audio }).catch(() => {
        // Rien n'est montré : le son reste réécoutable dans la page, seul l'historique ne l'aura pas.
        audiosEnvoyesRef.current.delete(cle);
      });
    }
  }, []);
  const noterIdsTour = useCallback(
    (idTour: string, conversationId: string, ids: { idUser: number | string | null; idAssistant: number | string | null }) => {
      idsToursRef.current.set(idTour, { conversationId, ...ids });
      envoyerAudiosTour(idTour);
    },
    [envoyerAudiosTour]
  );
  // Le tour est fini (réponse lue, coupée ou en échec) : ses sons peuvent partir. Si les identifiants des messages
  // n'étaient pas encore connus, ils partent dès qu'ils arrivent (noterIdsTour).
  const finirTour = useCallback((idTour: string) => {
    toursFinisRef.current.add(idTour);
    envoyerAudiosTour(idTour);
  }, [envoyerAudiosTour]);

  // Ce que la voix de Classinus a lu d'un bloc de texte devient le message audio de ce bloc, dans le tour concerné.
  const ajouterAudioBloc = useCallback((idTour: string, rang: number, message: MessageAudioBambara) => {
    setTours((precedents) => modifierTour(precedents, idTour, (tour) => ({ ...tour, audiosBlocs: { ...tour.audiosBlocs, [rang]: message } })));
    const avant = audiosToursRef.current.get(idTour);
    audiosToursRef.current.set(idTour, { ...avant, blocs: { ...avant?.blocs, [rang]: message } });
    envoyerAudiosTour(idTour);
  }, [envoyerAudiosTour]);

  const ajouterVisuels = useCallback((nouveaux: Parameters<typeof fusionnerVisuels>[1]) => {
    const id = tourCourantRef.current;
    setTours((precedents) => modifierTour(precedents, id, (tour) => ({ ...tour, visuels: fusionnerVisuels(tour.visuels, nouveaux) })));
  }, []);

  // La réponse brute du modèle (découpée en blocs au rendu) et son texte propre ; `fini` à la dernière fois.
  const changerTexteTour = useCallback((id: string, brut: string, fini: boolean) => {
    setTours((precedents) => modifierTour(precedents, id, (tour) => ({ ...tour, brut, texte: nettoyerPourVoix(brut), fini })));
  }, []);
  const changerTexte = useCallback((brut: string, fini: boolean) => changerTexteTour(tourCourantRef.current, brut, fini), [changerTexteTour]);

  // Un bloc de texte lit sa voix quand il apparaît au défilement (23/11/2026, demande de Bourama) : chaque bloc dit s'il
  // est dans la zone visible, et la lecture de la réponse attend ce signal avant de lire le bloc.
  const visiblesRef = useRef(new Set<string>());
  const attentesVisiblesRef = useRef(new Map<string, Array<(ok: boolean) => void>>());
  const surVisibiliteBloc = useCallback((id: string, visible: boolean) => {
    if (!visible) {
      visiblesRef.current.delete(id);
      return;
    }
    visiblesRef.current.add(id);
    const attentes = attentesVisiblesRef.current.get(id);
    if (!attentes) return;
    attentesVisiblesRef.current.delete(id);
    attentes.forEach((reprendre) => reprendre(true));
  }, []);
  const attendreBlocVisible = useCallback((id: string): Promise<boolean> => {
    if (visiblesRef.current.has(id)) return Promise.resolve(true);
    return new Promise<boolean>((resoudre) => {
      const liste = attentesVisiblesRef.current.get(id) ?? [];
      liste.push(resoudre);
      attentesVisiblesRef.current.set(id, liste);
    });
  }, []);
  // Ce qui attendait un bloc de l'ancienne conversation ne lira plus rien.
  const abandonnerAttentesBlocs = useCallback(() => {
    const toutes = [...attentesVisiblesRef.current.values()].flat();
    attentesVisiblesRef.current.clear();
    toutes.forEach((reprendre) => reprendre(false));
  }, []);

  // Avant de lire un bloc de texte : plus aucun message audio ne se réécoute, puis le bloc est apparu à l'écran.
  const avantBlocTexte = useCallback(
    async (idTour: string, rang: number): Promise<boolean> => {
      await attendreFinMessage();
      return attendreBlocVisible(idBlocTexte(idTour, rang));
    },
    [attendreFinMessage, attendreBlocVisible]
  );

  // L'écran suit la dernière réponse, sauf si la personne est remontée lire plus haut.
  useEffect(() => {
    const zone = defilementRef.current;
    if (!zone || !prochesDuBasRef.current) return;
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    zone.scrollTo({ top: zone.scrollHeight, behavior: reduit ? "auto" : "smooth" });
  }, [tours, outils]);

  // Page réservée aux utilisateurs connectés : sans session, retour à la connexion. Sur Maame (lib/maame.ts), il n'y a ni
  // inscription ni connexion : au premier passage, un compte anonyme est créé en silence et gardé sur le téléphone, la
  // page s'ouvre donc directement. Si la création échoue, la page reste ouverte avec le message d'erreur habituel.
  useEffect(() => {
    let annule = false;
    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (annule) return;
        if (data.session) {
          setConnecte(true);
          return;
        }
        if (!estMaameDansNavigateur()) {
          router.replace("/connexion");
          return;
        }
        const { data: anonyme, error } = await supabase.auth.signInAnonymously();
        if (annule) return;
        if (error || !anonyme.session) setErreur(TEXTES[locale].erreur);
        else setConnecte(true);
      })
      .catch(() => {
        if (!annule) setErreur(TEXTES[locale].erreur);
      });
    return () => {
      annule = true;
    };
  }, [router, locale]);

  useEffect(() => () => { sessionRef.current?.fermer(); }, []);

  // Demande écrite : elle s'ajoute à la conversation et une écoute du micro encore ouverte est fermée.
  const ecriture = useEcritureBambara({
    conversationId: () => conversationIdRef.current,
    avantEnvoi: (question) => {
      sessionRef.current?.fermer();
      setErreur(null);
      // Un premier message parlé encore en attente est le vrai premier de la conversation : il part avant celui ci.
      envoyerPremierMessageEnAttente();
      garderPremierMessage(question, null);
      return demarrerTour(question);
    },
    surAudioBloc: ajouterAudioBloc,
    surFinTour: finirTour,
    surIds: (idTour, ids) => noterIdsTour(idTour, conversationIdRef.current, ids),
    avantBloc: avantBlocTexte,
    surOutilsEnCours: setOutils,
    surVisuels: ajouterVisuels,
    surTexte: changerTexte,
    surErreur: setErreur,
  });
  const { actif: ecritureActive, arreter: arreterEcriture, couperVoix: couperVoixEcriture } = ecriture;

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

  // Le « + » : on repart d'une conversation vide. L'écoute du micro, la voix, une réponse écrite en cours et la vidéo qui
  // jouait s'arrêtent, les tours disparaissent, et la prochaine demande ouvre une nouvelle conversation (nouvel
  // identifiant côté serveur) dont le premier message sera gardé à son tour pour l'historique.
  const nouvelleConversation = useCallback(() => {
    // Le premier message parlé de l'ancienne conversation, encore en attente, part avant le changement.
    envoyerPremierMessageEnAttente();
    sessionRef.current?.fermer();
    arreterEcriture();
    abandonnerAttentesBlocs();
    fixerMessageEnLecture(null);
    setVideoEnLecture(null);
    // Une réponse encore en route pour l'ancienne conversation n'écrit plus rien dans la nouvelle.
    tourCourantRef.current = "";
    tourVocalRef.current = "";
    audioParoleRef.current = null;
    premierMessageGardeRef.current = false;
    conversationIdRef.current = nouvelIdentifiant();
    setIdConversationCourante(conversationIdRef.current);
    setTours([]);
    setOutils([]);
    setErreur(null);
  }, [arreterEcriture, envoyerPremierMessageEnAttente, fixerMessageEnLecture, abandonnerAttentesBlocs]);

  // Une conversation de l'historique est touchée (22/11/2026, demande de Bourama) : on la rouvre en entier, comme
  // si on ne l'avait jamais quittée. Le texte vient du serveur, qui garde tous les échanges de la page ; le premier
  // vocal de la personne est réécoutable. Les images et vidéos citées par l'IA sont retrouvées dans ses réponses.
  // La prochaine demande continue cette même conversation (même identifiant, même historique).
  const ouvertureRef = useRef(0);
  const ouvrirConversation = useCallback(async (conversation: ConversationBambara) => {
    const numero = (ouvertureRef.current += 1);
    // Le premier message parlé de la conversation quittée, encore en attente, part avant le changement.
    envoyerPremierMessageEnAttente();
    sessionRef.current?.fermer();
    arreterEcriture();
    abandonnerAttentesBlocs();
    fixerMessageEnLecture(null);
    setVideoEnLecture(null);
    tourCourantRef.current = "";
    tourVocalRef.current = "";
    audioParoleRef.current = null;
    setOutils([]);
    setErreur(null);
    try {
      const [messages, audioPremier, listeAudios] = await Promise.all([
        lireMessagesConversationBambara(conversation.id),
        conversation.a_audio ? lireAudioConversationBambara(conversation.id).catch(() => null) : Promise.resolve(null),
        listerAudiosConversationBambara(conversation.id).catch(() => []),
      ]);
      if (numero !== ouvertureRef.current) return;
      const reconstruits: TourBambara[] = [];
      const idsMessages: Array<{ idUser: number | string | null; idAssistant: number | string | null }> = [];
      for (const message of messages) {
        if (message.role === "user") {
          reconstruits.push({ id: nouvelIdentifiant(), question: message.content, texte: "", brut: "", fini: true, visuels: [], audioQuestion: null, audiosBlocs: {} });
          idsMessages.push({ idUser: message.id, idAssistant: null });
        } else {
          const dernier = reconstruits[reconstruits.length - 1];
          const texte = nettoyerPourVoix(message.content);
          const visuels = visuelsDepuisMessageGarde(message.content, message.meta);
          if (dernier && !dernier.brut) {
            dernier.texte = texte;
            dernier.brut = message.content;
            dernier.visuels = visuels;
            idsMessages[idsMessages.length - 1].idAssistant = message.id;
          } else {
            reconstruits.push({ id: nouvelIdentifiant(), question: "", texte, brut: message.content, fini: true, visuels, audioQuestion: null, audiosBlocs: {} });
            idsMessages.push({ idUser: null, idAssistant: message.id });
          }
        }
      }
      // Les tours dont la personne avait parlé n'affichent pas son texte : sa voix arrive juste après.
      const rangDeAudio = (audio: { message_id: number | string; sens: "question" | "reponse" }) =>
        idsMessages.findIndex((ids) => String(audio.sens === "question" ? ids.idUser : ids.idAssistant) === String(audio.message_id));
      for (const audio of listeAudios) {
        const rang = rangDeAudio(audio);
        if (rang >= 0 && audio.sens === "question") reconstruits[rang].question = "";
      }
      if (audioPremier && reconstruits[0]) {
        reconstruits[0].audioQuestion = audioPremier;
        reconstruits[0].question = "";
      }
      conversationIdRef.current = conversation.id;
      setIdConversationCourante(conversation.id);
      premierMessageGardeRef.current = true;
      // Ces voix sont déjà gardées : elles ne repartent pas au serveur.
      for (const audio of listeAudios) {
        const rang = rangDeAudio(audio);
        if (rang >= 0) audiosEnvoyesRef.current.add(`${reconstruits[rang].id}:${audio.sens}:${audio.bloc ?? 0}`);
      }
      ecrireEtatDepuisChat(conversation.id, messages);
      prochesDuBasRef.current = false;
      setTours(reconstruits);
      const zone = defilementRef.current;
      if (zone) zone.scrollTo({ top: 0 });
      // Les voix arrivent une à une, dans l'ordre : le texte et les images sont déjà là, chaque bulle audio s'ajoute à son tour.
      for (const audio of listeAudios) {
        const rang = rangDeAudio(audio);
        if (rang < 0) continue;
        const message = await lireAudioMessageBambara(audio.id).catch(() => null);
        if (!message || numero !== ouvertureRef.current) {
          if (numero !== ouvertureRef.current) return;
          continue;
        }
        const idTour = reconstruits[rang].id;
        setTours((precedents) =>
          modifierTour(precedents, idTour, (tour) => (audio.sens === "question" ? { ...tour, audioQuestion: message } : { ...tour, audiosBlocs: { ...tour.audiosBlocs, [audio.bloc ?? 0]: message } }))
        );
      }
    } catch {
      // Silencieux : la page est faite pour quelqu'un qui ne lit pas, la conversation en cours reste telle quelle.
    }
  }, [arreterEcriture, envoyerPremierMessageEnAttente, fixerMessageEnLecture, abandonnerAttentesBlocs]);

  // Le cœur des vidéos et images : garder ou retirer, avec ses libellés dans la langue de la page.
  const { gardeDeUrl, basculerGarde } = espace;
  const gardeUi = useMemo(
    () => ({
      estGarde: (url: string) => gardeDeUrl(url) !== null,
      basculer: basculerGarde,
      libelleGarder: textes.garder,
      libelleRetirer: textes.retirerGarde,
    }),
    [gardeDeUrl, basculerGarde, textes.garder, textes.retirerGarde]
  );

  const ouvrir = useCallback(async () => {
    if (sessionRef.current || ouvertureEnCoursRef.current) return;
    ouvertureEnCoursRef.current = true;
    setErreur(null);
    // Propre à cette session : un arrêt en ouvre une autre pendant que l'ancienne demande finit encore, il ne faut pas
    // qu'elle touche au tour de la nouvelle.
    let tourDeLaSession = "";
    try {
      const session = await ouvrirVoixBambara({
        // Appuyer pour parler, comme WhatsApp : le micro n'écoute plus tout seul (demande de Bourama du 22/11/2026).
        pousserPourParler: true,
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
          audioParoleRef.current = message;
          const idTourVocal = demarrerTour("", message);
          tourVocalRef.current = idTourVocal;
          tourDeLaSession = idTourVocal;
          audiosToursRef.current.set(idTourVocal, { question: message });
        },
        surParoleVide: () => {
          const id = tourVocalRef.current;
          setTours((precedents) => retirerTour(precedents, id));
        },
        // Le texte de la réponse apparaît aussi, replié sous sa bulle audio. Rien n'est écrit dans la bulle de la personne.
        // `lecture.suivre` donne le texte brut à la voix à mesure qu'il arrive : elle lit dès la première phrase terminée.
        surDemande: async (question, lecture) => {
          const id = tourVocalRef.current;
          mettreEnAttentePremierMessage(question, audioParoleRef.current);
          const conversationDeLaDemande = conversationIdRef.current;
          const reponse = await demanderPageBambara(question, conversationDeLaDemande, {
            surIds: (ids) => noterIdsTour(id, conversationDeLaDemande, ids),
            surOutilsEnCours: setOutils,
            surVisuels: ajouterVisuels,
            surTexte: (cumule) => {
              changerTexteTour(id, cumule, false);
              lecture.suivre(cumule, false);
            },
          });
          changerTexteTour(id, reponse, true);
          return reponse;
        },
        avantBloc: (rang) => avantBlocTexte(tourVocalRef.current, rang),
        surAudioBloc: (rang, message) => ajouterAudioBloc(tourVocalRef.current, rang, message),
        surFinTour: () => {
          envoyerPremierMessageEnAttente();
          if (tourDeLaSession) finirTour(tourDeLaSession);
        },
      });
      sessionRef.current = session;
    } catch (e) {
      setEtat("erreur");
      setErreur(messageErreurVoix(e));
    } finally {
      ouvertureEnCoursRef.current = false;
    }
  }, [demarrerTour, ajouterVisuels, ajouterAudioBloc, changerTexteTour, avantBlocTexte, mettreEnAttentePremierMessage, envoyerPremierMessageEnAttente, noterIdsTour, finirTour]);

  // Le micro fonctionne comme sur WhatsApp (demande de Bourama du 22/11/2026) : on appuie pour parler. Maintenu appuyé,
  // l'enregistrement s'arrête et part quand on lâche. Un simple toucher le lance et le laisse tourner : un second toucher
  // l'arrête et l'envoie. Pendant que Classinus travaille ou parle, toucher le micro arrête tout (le bouton Arrêter).
  const etatRef = useRef(etat);
  etatRef.current = etat;
  const enregistrementRef = useRef(false);
  const appuiEnCoursRef = useRef(false);
  const debutAppuiRef = useRef(0);
  useEffect(() => {
    if (etat !== "ecoute") enregistrementRef.current = false;
  }, [etat]);

  const surAppui = useCallback(async () => {
    appuiEnCoursRef.current = true;
    debutAppuiRef.current = Date.now();
    // Un message audio se réécoutait : toucher le micro l'arrête.
    if (messageEnLectureRef.current) fixerMessageEnLecture(null);
    // Une réponse écrite est en cours : le micro sert d'abord à l'arrêter.
    // Arrêter ne supprime rien de la conversation : seul l'effet de construction en cours disparaît.
    if (ecritureActive) {
      arreterEcriture();
      setOutils([]);
      appuiEnCoursRef.current = false;
      return;
    }
    // Un enregistrement est en cours (lancé par un toucher) : ce second toucher l'arrête et l'envoie.
    if (enregistrementRef.current) {
      enregistrementRef.current = false;
      sessionRef.current?.terminerParole();
      return;
    }
    // Classinus travaille ou parle : le micro arrête tout.
    if (sessionRef.current && (etatRef.current === "travail" || etatRef.current === "reponse")) {
      sessionRef.current.fermer();
      setOutils([]);
      appuiEnCoursRef.current = false;
      return;
    }
    if (!sessionRef.current) await ouvrir();
    const session = sessionRef.current;
    if (!session) {
      appuiEnCoursRef.current = false;
      return;
    }
    enregistrementRef.current = true;
    session.commencerParole();
  }, [ouvrir, ecritureActive, arreterEcriture, fixerMessageEnLecture]);

  const surRelache = useCallback(() => {
    if (!appuiEnCoursRef.current) return;
    appuiEnCoursRef.current = false;
    if (!enregistrementRef.current) return;
    // Maintenu : on a lâché, c'est fini. Un simple toucher (court) laisse l'enregistrement tourner.
    if (Date.now() - debutAppuiRef.current < 400) return;
    enregistrementRef.current = false;
    sessionRef.current?.terminerParole();
  }, []);

  // Le micro est « actif » quand il enregistre ou que Classinus travaille : une session ouverte au repos ne compte pas.
  const enregistre = etat === "ecoute";
  const actif = (etat !== "inactif" && etat !== "erreur" && etat !== "connecte") || ecritureActive;
  const enConnexion = etat === "connexion";
  // La voix de Classinus lit la réponse en direct (par le micro ou après un message écrit) : la bulle sert alors à la couper.
  const lectureEnDirect = etat === "reponse" || ecriture.etat === "reponse";
  const arreterVoixEnDirect = useCallback(() => {
    sessionRef.current?.interrompre();
    couperVoixEcriture();
  }, [couperVoixEcriture]);
  // Une réponse se prépare ou se lit : la dernière bulle audio de Classinus est déjà là, en préparation.
  const reponseEnCours = etat === "travail" || etat === "reponse" || ecriture.etat === "travail" || ecriture.etat === "reponse";

  // La requête n'est pas finie : les résultats (images, vidéos) arrivent à sa fin, juste avant que la voix lise la réponse.
  const requeteEnCours = etat === "travail" || ecriture.etat === "travail";

  // Effets de construction (demande de Bourama du 22/11/2026) : un effet déjà montré reste jusqu'à ce que ses résultats
  // soient là, au lieu de disparaître dès que l'outil a fini (vide, puis texte, puis résultats d'un coup).
  // `effetsMontres` retient les effets vus pendant le tour en cours (il repart de zéro à chaque nouveau tour).
  const tourEnCours = tours[tours.length - 1];
  const [effetsMontres, setEffetsMontres] = useState<{ idTour: string; effets: EffetOutil[] }>({ idTour: "", effets: [] });
  useEffect(() => {
    const actifs = effetsActifs(outils);
    if (!actifs.length) return;
    const idTour = tourCourantRef.current;
    setEffetsMontres((precedent) => {
      const base = precedent.idTour === idTour ? precedent.effets : [];
      return actifs.every((e) => base.includes(e)) ? precedent : { idTour, effets: [...base, ...actifs.filter((e) => !base.includes(e))] };
    });
  }, [outils]);
  const genresVisuels = new Set(tourEnCours?.visuels.map((v) => v.genre) ?? []);
  const effetsDuTour = tourEnCours && effetsMontres.idTour === tourEnCours.id ? effetsMontres.effets : [];
  const effets = effetsAffiches(effetsActifs(outils), requeteEnCours ? effetsDuTour : [], genresVisuels, Boolean(tourEnCours?.texte));

  if (!connecte) return <div className="bb-page fixed inset-0" />;

  return (
    <div ref={racineRef} className="bb-page fixed inset-0 overflow-hidden">
      {/* Ce qui se construit puis ce qui est trouvé : le texte de la réponse (après une demande écrite), puis de petites
          planches d'images et de vidéos. Cette couche remplit tout l'écran et défile derrière la bulle et les commandes :
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
            // La réponse découpée en blocs, dans l'ordre du modèle (23/11/2026, demande de Bourama) : des textes, des séries
            // d'images, des séries de vidéos. Les détails (titre, miniature) des visuels viennent de la recherche.
            const blocs = blocsDeReponse(tour.brut, tour.fini);
            const details = new Map(tour.visuels.map((v) => [v.id, v]));
            // Réglage des paramètres ignoré pour une question écrite (23/11/2026, demande de Bourama) : la personne qui écrit
            // reçoit toujours le texte. Une demande parlée n'a pas de texte de question (sa voix est dans audioQuestion).
            const texteAffiche = reglages.afficherTexteReponse || Boolean(tour.question);
            const reponseDuTourEnCours = dernier && reponseEnCours;
            const aUnTexte = blocs.some((b) => b.genre === "texte");
            // Avant le premier bloc de texte, la bulle de réponse attend, vivante : le premier bloc la reprend (même identifiant).
            const bullePreparee = reponseDuTourEnCours && !aUnTexte;
            if (!tour.question && !tour.audioQuestion && blocs.length === 0 && !bullePreparee) return null;
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
                {bullePreparee && (
                  <BlocTexteBambara
                    id={idBlocTexte(tour.id, 0)}
                    texte=""
                    afficherTexte={false}
                    message={null}
                    afficherBulle
                    direct={lectureEnDirect ? "lecture" : "attente"}
                    surArreterDirect={arreterVoixEnDirect}
                    idEnLecture={messageEnLecture}
                    surChangerLecture={changerMessageEnLecture}
                    libelleEcouter={textes.ecouter}
                    libelleMettreEnPause={textes.mettreEnPause}
                    libelleDeplier={textes.deplier}
                    libelleReplier={textes.replier}
                    surVisibilite={surVisibiliteBloc}
                  />
                )}
                {blocs.map((bloc) => {
                  if (bloc.genre === "texte") {
                    const message = tour.audiosBlocs[bloc.rang] ?? null;
                    return (
                      <BlocTexteBambara
                        key={bloc.id}
                        id={idBlocTexte(tour.id, bloc.rang)}
                        texte={bloc.texte}
                        afficherTexte={texteAffiche}
                        message={message}
                        // Le vocal existe, ou la voix prépare encore les blocs de cette réponse : sa bulle attend, vivante.
                        afficherBulle={message !== null || reponseDuTourEnCours}
                        direct={lectureEnDirect ? "lecture" : "attente"}
                        surArreterDirect={arreterVoixEnDirect}
                        idEnLecture={messageEnLecture}
                        surChangerLecture={changerMessageEnLecture}
                        libelleEcouter={textes.ecouter}
                        libelleMettreEnPause={textes.mettreEnPause}
                        libelleDeplier={textes.deplier}
                        libelleReplier={textes.replier}
                        surVisibilite={surVisibiliteBloc}
                      />
                    );
                  }
                  return (
                    <RangeesVisuelsBambara
                      key={bloc.id}
                      idTour={tour.id + ":" + bloc.id}
                      visuels={bloc.visuels.map((v) => details.get(v.id) ?? v)}
                      idEnLecture={videoEnLecture}
                      surChangerLecture={changerVideoEnLecture}
                      libelleLire={textes.lire}
                      libelleFermerVideo={textes.fermerVideo}
                      libelleOuvrirImage={textes.ouvrirImage}
                      garde={gardeUi}
                    />
                  );
                })}
              </div>
            );
          })}
          {/* L'effet de construction du tour en cours, tout en bas, sous ce qui est déjà arrivé. */}
          {/* Plusieurs outils peuvent travailler en même temps : leurs effets s'affichent ensemble, l'un sous l'autre. */}
          <div className="flex w-full flex-col gap-3">
            <AnimatePresence initial={false}>
              {effets.map((effet) => (
                <motion.div
                  key={effet}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full overflow-hidden"
                >
                  <EffetConstruction effet={effet} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <BarreHautBambara
        espace={espace}
        reglages={reglages}
        garde={gardeUi}
        textes={textes}
        surNouvelleConversation={nouvelleConversation}
        surOuvrirConversation={ouvrirConversation}
        idConversationCourante={idConversationCourante}
        messageEnLecture={messageEnLecture}
        changerMessageEnLecture={changerMessageEnLecture}
        videoEnLecture={videoEnLecture}
        changerVideoEnLecture={changerVideoEnLecture}
        logoMaame={surMaame}
      />

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
        {/* L'indicateur d'enregistrement : il montre que la voix de la personne est en train d'être enregistrée. */}
        <AnimatePresence initial={false}>
          {enregistre && (
            <IndicateurEnregistrementBambara
              key="enregistrement"
              niveau={() => sessionRef.current?.niveaux().entree ?? 0}
              libelle={textes.enregistrement}
            />
          )}
        </AnimatePresence>
        {/* Le micro : appuyer pour parler (maintenu, on lâche à la fin ; ou un toucher pour lancer et un second pour envoyer). */}
        <div className="pointer-events-auto relative h-16 w-16">
          {actif && !enConnexion && <span className="bb-halo" />}
          <button
            type="button"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              void surAppui();
            }}
            onPointerUp={surRelache}
            onPointerCancel={surRelache}
            onKeyDown={(e) => {
              if ((e.key === " " || e.key === "Enter") && !e.repeat) {
                e.preventDefault();
                void surAppui();
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") surRelache();
            }}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={enregistre ? textes.envoyer : actif ? textes.arreter : textes.parler}
            aria-pressed={actif}
            className="relative flex h-16 w-16 touch-none select-none items-center justify-center rounded-full border-2 transition-transform active:scale-95"
            style={{
              // Une erreur ne se dit pas par une couleur : le micro se vide (fond clair, trait d'encre).
              backgroundColor: erreur ? "var(--bb-fond)" : "var(--bb-encre)",
              color: erreur ? "var(--bb-encre)" : "var(--bb-fond)",
              borderColor: "var(--bb-encre)",
              WebkitTouchCallout: "none",
            }}
          >
            {enConnexion ? <Loader2 size={28} className="animate-spin" /> : enregistre ? <Square size={24} fill="currentColor" /> : <Mic size={28} />}
          </button>
          {/* Le bouton clavier n'est là que si la personne l'a activé dans les paramètres (masqué par défaut). */}
          <span className="absolute left-full top-1/2 ml-5 -translate-y-1/2">
            <AnimatePresence initial={false}>
              {afficherBoutonClavier && (
                <motion.button
                  key="clavier"
                  type="button"
                  onClick={() => setChampOuvert((ouvert) => !ouvert)}
                  aria-label={champOuvert ? textes.masquerChamp : textes.ecrire}
                  aria-pressed={champOuvert}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-200"
                  style={{
                    borderColor: champOuvert ? "var(--bb-encre)" : "var(--bb-trait-fort)",
                    backgroundColor: champOuvert ? "var(--bb-encre)" : "var(--bb-fond)",
                    color: champOuvert ? "var(--bb-fond)" : "var(--bb-encre)",
                  }}
                >
                  <Keyboard size={20} />
                </motion.button>
              )}
            </AnimatePresence>
          </span>
        </div>
      </div>

      {/* Lu seulement par les lecteurs d'écran : les erreurs ne sont jamais écrites à l'écran. */}
      <p role="status" aria-live="polite" className="sr-only">{erreur ? erreur || textes.erreur : ""}</p>
    </div>
  );
}
