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

import "./bambara.css";
import { AnimatePresence, motion } from "framer-motion";
import { Keyboard, Loader2, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { OndeVoix } from "@/components/voix/OndeVoix";
import type { EtatVoixDirecte } from "@/lib/contexteVoixDirecte";
import { messageErreurVoix } from "@/lib/erreurs";
import { useLocale } from "@/lib/i18n/useLocale";
import { demanderPageBambara } from "@/lib/pageBambara";
import { effetPrincipal, fusionnerVisuels, type VisuelBambara } from "@/lib/pageBambaraVisuels";
import { supabase } from "@/lib/supabase";
import { useDecalageClavier } from "@/lib/useDecalageClavier";
import { useEcritureBambara } from "@/lib/useEcritureBambara";
import { ouvrirVoixBambara } from "@/lib/voixBambara";
import type { SessionGeminiLive } from "@/lib/geminiLive";
import { ChampEcritureBambara } from "./ChampEcritureBambara";
import { EffetConstruction } from "./EffetConstruction";
import { RangeesVisuelsBambara } from "./RangeesVisuelsBambara";

const TEXTES = {
  fr: {
    parler: "Parler", arreter: "Arrêter", lire: "Lancer la vidéo", fermerVideo: "Fermer la vidéo", ouvrirImage: "Voir l'image", erreur: "Un problème est survenu.",
    ecrire: "Écrire un message", masquerChamp: "Masquer le champ d'écriture", placeholder: "Écrire ici", envoyer: "Envoyer",
  },
  en: {
    parler: "Speak", arreter: "Stop", lire: "Play the video", fermerVideo: "Close the video", ouvrirImage: "View the image", erreur: "Something went wrong.",
    ecrire: "Write a message", masquerChamp: "Hide the writing field", placeholder: "Write here", envoyer: "Send",
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
  const [visuels, setVisuels] = useState<VisuelBambara[]>([]);
  const [outils, setOutils] = useState<string[]>([]);
  const [texteReponse, setTexteReponse] = useState("");
  const [champOuvert, setChampOuvert] = useState(false);

  const racineRef = useRef<HTMLDivElement>(null);
  const decalageClavier = useDecalageClavier(racineRef);
  const sessionRef = useRef<SessionGeminiLive | null>(null);
  const ouvertureEnCoursRef = useRef(false);
  const conversationIdRef = useRef<string>("");
  if (!conversationIdRef.current) conversationIdRef.current = nouvelIdentifiant();

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

  // Demande écrite : l'écran repart de zéro et une écoute du micro encore ouverte est fermée.
  const ecriture = useEcritureBambara({
    conversationId: () => conversationIdRef.current,
    avantEnvoi: () => {
      sessionRef.current?.fermer();
      setErreur(null);
      setVisuels([]);
      setOutils([]);
      setTexteReponse("");
    },
    surOutilsEnCours: setOutils,
    surVisuels: (nouveaux) => setVisuels((precedents) => fusionnerVisuels(precedents, nouveaux)),
    surTexte: setTexteReponse,
    surErreur: setErreur,
  });
  const { actif: ecritureActive, arreter: arreterEcriture, niveau: niveauEcriture } = ecriture;

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
        surDemande: async (question) => {
          // Nouvelle demande : l'écran repart de zéro, seuls les visuels de cette réponse sont montrés.
          setVisuels([]);
          setOutils([]);
          setTexteReponse("");
          return demanderPageBambara(question, conversationIdRef.current, {
            surOutilsEnCours: setOutils,
            surVisuels: (nouveaux) => setVisuels((precedents) => fusionnerVisuels(precedents, nouveaux)),
          });
        },
      });
      sessionRef.current = session;
    } catch (e) {
      setEtat("erreur");
      setErreur(messageErreurVoix(e));
    } finally {
      ouvertureEnCoursRef.current = false;
    }
  }, []);

  const basculer = useCallback(() => {
    // Une réponse écrite est en cours : le micro sert d'abord à l'arrêter.
    if (ecritureActive) {
      arreterEcriture();
      setVisuels([]);
      setOutils([]);
      setTexteReponse("");
      return;
    }
    if (sessionRef.current) {
      sessionRef.current.fermer();
      setVisuels([]);
      setOutils([]);
      return;
    }
    void ouvrir();
  }, [ouvrir, ecritureActive, arreterEcriture]);

  const effet = effetPrincipal(outils);
  const actif = (etat !== "inactif" && etat !== "erreur") || ecritureActive;
  const etatBulle: EtatVoixDirecte = etat !== "inactif" ? etat : ecriture.etat;
  const enConnexion = etat === "connexion";

  if (!connecte) return <div className="bb-page fixed inset-0" />;

  return (
    <div ref={racineRef} className="bb-page fixed inset-0 overflow-hidden">
      {/* Ce qui se construit puis ce qui est trouvé : le texte de la réponse (après une demande écrite), puis de petites
          rangées d'images et de vidéos. Cette couche remplit tout l'écran et défile derrière la bulle et les commandes :
          ses marges haute et basse sont fixes, elles ne changent jamais quand le champ ou le clavier s'ouvrent. */}
      <main
        className="absolute inset-0 overflow-y-auto overscroll-contain px-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 6.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12rem)",
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
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
          {texteReponse && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full whitespace-pre-line break-words text-base leading-relaxed"
              style={{ color: "var(--bb-encre)" }}
            >
              {texteReponse}
            </motion.p>
          )}
          <RangeesVisuelsBambara
            visuels={visuels}
            libelleLire={textes.lire}
            libelleFermerVideo={textes.fermerVideo}
            libelleOuvrirImage={textes.ouvrirImage}
          />
        </div>
      </main>

      {/* La bulle en haut : l'onde de la voix, qui montre qui écoute, qui parle et qui travaille. Elle flotte par dessus
          le contenu (fond plein, le contenu passe dessous) et ne prend aucune place dans la page. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <div
          className="h-16 w-full max-w-sm overflow-hidden rounded-full border px-5"
          style={{ borderColor: "var(--bb-trait)", backgroundColor: "var(--bb-voile)" }}
        >
          <OndeVoix mini etat={etatBulle} lireNiveaux={lireNiveaux} />
        </div>
      </div>

      {/* En bas, par dessus le contenu : le champ d'écriture (caché par défaut), puis le micro avec le petit bouton clavier
          à côté. Quand le clavier du téléphone s'ouvre, cette couche remonte juste au dessus de lui. */}
      <div
        className="bb-clavier pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
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
        <div className="pointer-events-auto relative h-20 w-20">
          {actif && !enConnexion && <span className="bb-halo" />}
          <button
            type="button"
            onClick={basculer}
            aria-label={actif ? textes.arreter : textes.parler}
            aria-pressed={actif}
            className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
            style={{
              // Une erreur ne se dit pas par une couleur : le micro se vide (fond clair, trait d'encre).
              backgroundColor: erreur ? "var(--bb-fond)" : "var(--bb-encre)",
              color: erreur ? "var(--bb-encre)" : "var(--bb-fond)",
              borderColor: "var(--bb-encre)",
            }}
          >
            {enConnexion ? <Loader2 size={34} className="animate-spin" /> : <Mic size={34} />}
          </button>
          <button
            type="button"
            onClick={() => setChampOuvert((ouvert) => !ouvert)}
            aria-label={champOuvert ? textes.masquerChamp : textes.ecrire}
            aria-pressed={champOuvert}
            className="absolute left-full top-1/2 ml-6 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border transition-transform active:scale-95"
            style={{
              borderColor: champOuvert ? "var(--bb-encre)" : "var(--bb-trait-fort)",
              backgroundColor: champOuvert ? "var(--bb-encre)" : "var(--bb-fond)",
              color: champOuvert ? "var(--bb-fond)" : "var(--bb-encre)",
            }}
          >
            <Keyboard size={22} />
          </button>
        </div>
      </div>

      {/* Lu seulement par les lecteurs d'écran : les erreurs ne sont jamais écrites à l'écran. */}
      <p role="status" aria-live="polite" className="sr-only">{erreur ? erreur || textes.erreur : ""}</p>
    </div>
  );
}
