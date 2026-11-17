"use client";

// Page bambara (16/11/2026, demande de Bourama) : une page de Classinus pour les personnes qui parlent
// bambara et ne savent ni lire ni écrire. Elle ne contient que la bulle en haut et le micro. On touche
// le micro, on parle, l'IA répond à voix haute en bambara comme le mode vocal bambara (lib/voixBambara.ts),
// et l'écran ne montre que ce qui aide à comprendre : des vidéos, des images, et un effet de
// construction pendant que l'IA cherche ou crée. La réflexion n'est jamais montrée, les outils non plus.
// Côté serveur, cette page n'a que la recherche, la génération visuelle et la mémoire, avec l'effort
// de réflexion au plus faible (client `page_bambara`, core/outils_page_bambara.py).

import "./bambara.css";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Mic } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { OndeVoix } from "@/components/voix/OndeVoix";
import type { EtatVoixDirecte } from "@/lib/contexteVoixDirecte";
import { messageErreurVoix } from "@/lib/erreurs";
import { useLocale } from "@/lib/i18n/useLocale";
import { demanderPageBambara } from "@/lib/pageBambara";
import { effetPrincipal, fusionnerVisuels, type VisuelBambara } from "@/lib/pageBambaraVisuels";
import { supabase } from "@/lib/supabase";
import { ouvrirVoixBambara } from "@/lib/voixBambara";
import type { SessionGeminiLive } from "@/lib/geminiLive";
import { CarteVisuelBambara } from "./CarteVisuelBambara";
import { EffetConstruction } from "./EffetConstruction";

const TEXTES = {
  fr: { parler: "Parler", arreter: "Arrêter", lire: "Lancer la vidéo", erreur: "Un problème est survenu." },
  en: { parler: "Speak", arreter: "Stop", lire: "Play the video", erreur: "Something went wrong." },
} as const;

function nouvelIdentifiant(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "bambara-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

const NIVEAUX_NULS = { entree: 0, sortie: 0 };

export default function PageBambaraClient() {
  const router = useRouter();
  const locale = useLocale();
  const textes = TEXTES[locale];

  const [connecte, setConnecte] = useState(false);
  const [etat, setEtat] = useState<EtatVoixDirecte>("inactif");
  const [erreur, setErreur] = useState<string | null>(null);
  const [visuels, setVisuels] = useState<VisuelBambara[]>([]);
  const [outils, setOutils] = useState<string[]>([]);

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

  const lireNiveaux = useCallback(() => sessionRef.current?.niveaux() ?? NIVEAUX_NULS, []);

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
    if (sessionRef.current) {
      sessionRef.current.fermer();
      setVisuels([]);
      setOutils([]);
      return;
    }
    void ouvrir();
  }, [ouvrir]);

  const effet = effetPrincipal(outils);
  const actif = etat !== "inactif" && etat !== "erreur";
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
          <OndeVoix mini etat={etat} lireNiveaux={lireNiveaux} />
        </div>
      </div>

      {/* Ce qui se construit puis ce qui est trouvé : seulement des vidéos et des images. */}
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
          {visuels.map((visuel) => (
            <CarteVisuelBambara key={visuel.id} visuel={visuel} libelleLire={textes.lire} />
          ))}
        </div>
      </main>

      {/* Le micro : un toucher pour parler, un toucher pour arrêter. */}
      <div className="flex shrink-0 justify-center pb-8 pt-3">
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
        </div>
      </div>

      {/* Lu seulement par les lecteurs d'écran : l'écran n'affiche aucun texte. */}
      <p role="status" aria-live="polite" className="sr-only">{erreur ? erreur || textes.erreur : ""}</p>
    </div>
  );
}
