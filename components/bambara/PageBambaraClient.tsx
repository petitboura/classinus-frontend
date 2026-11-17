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
import { useEcritureBambara } from "@/lib/useEcritureBambara";
import { ouvrirVoixBambara } from "@/lib/voixBambara";
import type { SessionGeminiLive } from "@/lib/geminiLive";
import { CarteVisuelBambara } from "./CarteVisuelBambara";
import { ChampEcritureBambara } from "./ChampEcritureBambara";
import { EffetConstruction } from "./EffetConstruction";

const TEXTES = {
  fr: {
    parler: "Parler", arreter: "Arrêter", lire: "Lancer la vidéo", erreur: "Un problème est survenu.",
    ecrire: "Écrire un message", masquerChamp: "Masquer le champ d'écriture", placeholder: "Écrire ici", envoyer: "Envoyer",
  },
  en: {
    parler: "Speak", arreter: "Stop", lire: "Play the video", erreur: "Something went wrong.",
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

  if (!connecte) return <div className="fixed inset-0" style={{ backgroundColor: "var(--dj-fond)" }} />;

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{
        backgroundColor: "var(--dj-fond)",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* La bulle en haut : l'onde de la voix, qui montre qui écoute, qui parle et qui travaille. */}
      <div className="flex shrink-0 justify-center px-4 pt-4">
        <div
          className="h-16 w-full max-w-sm overflow-hidden rounded-full border px-5 shadow-sm"
          style={{ borderColor: "var(--dj-bordure)", backgroundColor: "color-mix(in srgb, var(--dj-surface) 88%, var(--dj-fond))" }}
        >
          <OndeVoix mini etat={etatBulle} lireNiveaux={lireNiveaux} />
        </div>
      </div>

      {/* Ce qui se construit puis ce qui est trouvé : des vidéos et des images, et le texte de la réponse après une demande écrite. */}
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4">
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
              style={{ color: "var(--dj-texte)" }}
            >
              {texteReponse}
            </motion.p>
          )}
          {visuels.map((visuel) => (
            <CarteVisuelBambara key={visuel.id} visuel={visuel} libelleLire={textes.lire} />
          ))}
        </div>
      </main>

      {/* En bas : le champ d'écriture (caché par défaut), puis le micro avec le petit bouton clavier à côté. */}
      <div className="flex shrink-0 flex-col items-center gap-3 pb-8 pt-3">
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
        <div className="relative h-20 w-20">
          {actif && !enConnexion && <span className="bb-halo" />}
          <button
            type="button"
            onClick={basculer}
            aria-label={actif ? textes.arreter : textes.parler}
            aria-pressed={actif}
            className="relative flex h-20 w-20 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
            style={{
              backgroundColor: erreur ? "var(--dj-erreur)" : "var(--dj-accent-1)",
              color: "var(--dj-accent-1-texte)",
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
              borderColor: "var(--dj-bordure)",
              backgroundColor: champOuvert ? "var(--dj-accent-1)" : "color-mix(in srgb, var(--dj-surface) 88%, var(--dj-fond))",
              color: champOuvert ? "var(--dj-accent-1-texte)" : "var(--dj-texte)",
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
