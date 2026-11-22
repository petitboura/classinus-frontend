"use client";

// Page bambara (22/11/2026, demande de Bourama) : l'écran du parcours d'inscription vocal. Aucun texte lisible,
// seulement des voix et des images : une grande case micro pour parler, deux bulles audio pour réécouter sa voix et la
// voix de Classinus qui dit le nom, deux grandes images à toucher (femme, homme), une flèche pour passer la présentation.
// La logique est dans lib/useParcoursBambara.ts ; les phrases lues par la voix viennent de Supabase, jamais du code.
// Noir et blanc seulement (couleurs de .bb-page). Les libellés ci dessous ne servent qu'aux lecteurs d'écran.

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Mic, MicOff, RotateCcw, UserRound, Volume2, X, AudioLines } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { numeroEtapeParcours, useParcoursBambara } from "@/lib/useParcoursBambara";
import type { GenreProfil } from "@/lib/parcoursBambara";
import { BulleAudioBambara } from "./BulleAudioBambara";

const TEXTES = {
  fr: {
    fermer: "Fermer", consigne: "Réécouter la consigne", parler: "Parler", valider: "Valider", refaire: "Recommencer", passer: "Passer",
    femme: "Femme", homme: "Homme", maVoix: "Ma voix", voixClassinus: "La voix de Classinus", ecouter: "Écouter le message",
    pause: "Mettre le message en pause", reessayer: "Réessayer", micro: "Autoriser le micro",
  },
  en: {
    fermer: "Close", consigne: "Play the instruction again", parler: "Speak", valider: "Confirm", refaire: "Start over", passer: "Skip",
    femme: "Woman", homme: "Man", maVoix: "My voice", voixClassinus: "Classinus's voice", ecouter: "Play the message",
    pause: "Pause the message", reessayer: "Try again", micro: "Allow the microphone",
  },
} as const;

type Props = {
  creer: (nom: string, genre: GenreProfil, presentation: string | null) => Promise<boolean>;
  surTermine: () => void;
  surFermer: () => void;
};

const BOUTON_ROND = "flex shrink-0 items-center justify-center rounded-full border-2 transition-transform active:scale-95";
const STYLE_ENCRE = { backgroundColor: "var(--bb-encre)", color: "var(--bb-fond)", borderColor: "var(--bb-encre)" } as const;
const STYLE_CONTOUR = { backgroundColor: "var(--bb-fond)", color: "var(--bb-encre)", borderColor: "var(--bb-trait-fort)" } as const;

function IconeFemme() {
  return (
    <svg viewBox="0 0 64 64" className="h-24 w-24" fill="currentColor" aria-hidden="true">
      <circle cx="32" cy="12" r="8" />
      <path d="M32 22c-5 0-8 3-9 8l-8 22h34l-8-22c-1-5-4-8-9-8z" />
      <rect x="25" y="52" width="5" height="9" rx="2.5" />
      <rect x="34" y="52" width="5" height="9" rx="2.5" />
    </svg>
  );
}

function IconeHomme() {
  return (
    <svg viewBox="0 0 64 64" className="h-24 w-24" fill="currentColor" aria-hidden="true">
      <circle cx="32" cy="12" r="8" />
      <rect x="20" y="22" width="24" height="22" rx="7" />
      <rect x="22" y="40" width="9" height="21" rx="4" />
      <rect x="33" y="40" width="9" height="21" rx="4" />
      <rect x="12" y="24" width="7" height="20" rx="3.5" />
      <rect x="45" y="24" width="7" height="20" rx="3.5" />
    </svg>
  );
}

export function ParcoursInscriptionBambara({ creer, surTermine, surFermer }: Props) {
  const locale = useLocale();
  const t = TEXTES[locale];
  const p = useParcoursBambara({ creer, surTermine });
  const rang = numeroEtapeParcours(p.etape);
  const ecoute = p.phase === "ecoute";
  const traitement = p.phase === "traitement";
  const parole = p.etape === "nom" ? p.voixNom : p.voixPresentation;

  // La grande case micro : respire avec la voix, devient un cercle de chargement pendant la transcription.
  const grandMicro = (
    <motion.button
      type="button"
      onClick={() => void p.reessayerMicro()}
      aria-label={p.microRefuse ? t.micro : t.parler}
      animate={{ scale: ecoute ? 1 + Math.min(p.niveau, 1) * 0.18 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`${BOUTON_ROND} h-40 w-40`}
      style={ecoute || traitement ? STYLE_ENCRE : STYLE_CONTOUR}
    >
      {traitement ? <Loader2 size={56} className="animate-spin" /> : p.microRefuse ? <MicOff size={56} /> : <Mic size={56} />}
    </motion.button>
  );

  // Ce que la personne a dit : sa voix à droite, la voix de Classinus à gauche, puis recommencer ou valider.
  const reecoute = (
    <div className="flex w-full max-w-sm flex-col items-stretch gap-4">
      <div className="flex items-center justify-end gap-2">
        <BulleAudioBambara
          id="parcours-moi"
          message={parole}
          cote="droite"
          idEnLecture={p.enLecture}
          surChangerLecture={p.changerLecture}
          libelleEcouter={t.ecouter}
          libelleMettreEnPause={t.pause}
        />
        <UserRound size={22} aria-label={t.maVoix} className="shrink-0" />
      </div>
      {p.etape === "nom" && (
        <div className="flex items-center justify-start gap-2">
          <AudioLines size={22} aria-label={t.voixClassinus} className="shrink-0" />
          <BulleAudioBambara
            id="parcours-classinus"
            message={p.voixClassinus}
            cote="gauche"
            idEnLecture={p.enLecture}
            surChangerLecture={p.changerLecture}
            libelleEcouter={t.ecouter}
            libelleMettreEnPause={t.pause}
          />
        </div>
      )}
      <div className="mt-2 flex items-center justify-center gap-6">
        <button type="button" onClick={p.refaire} aria-label={t.refaire} className={`${BOUTON_ROND} h-16 w-16`} style={STYLE_CONTOUR}>
          <RotateCcw size={26} />
        </button>
        <button
          type="button"
          onClick={() => (p.etape === "nom" ? p.validerNom() : void p.terminer(true))}
          aria-label={t.valider}
          className={`${BOUTON_ROND} h-20 w-20`}
          style={STYLE_ENCRE}
        >
          <Check size={36} />
        </button>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="fixed inset-0 z-40 flex flex-col"
      style={{ backgroundColor: "var(--bb-fond)", color: "var(--bb-encre)", paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={p.reecouterConsigne} aria-label={t.consigne} className={`${BOUTON_ROND} h-12 w-12`} style={STYLE_CONTOUR}>
          <Volume2 size={22} />
        </button>
        <div className="flex items-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full border transition-colors duration-300"
              style={{ borderColor: "var(--bb-encre)", backgroundColor: i <= rang ? "var(--bb-encre)" : "transparent" }}
            />
          ))}
        </div>
        <button type="button" onClick={p.etape === "fin" ? undefined : surFermer} disabled={p.etape === "fin"} aria-label={t.fermer} className={`${BOUTON_ROND} h-12 w-12 disabled:opacity-30`} style={STYLE_CONTOUR}>
          <X size={22} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-8 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={p.etape + (p.phase === "pret" ? "-pret" : "")}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex w-full flex-col items-center justify-center gap-8"
          >
            {p.etape === "nom" && (p.phase === "pret" ? reecoute : grandMicro)}

            {p.etape === "genre" && (
              <div className="flex w-full max-w-md items-center justify-center gap-5">
                {(["femme", "homme"] as const).map((choix) => {
                  const choisi = p.genre === choix;
                  return (
                    <button
                      key={choix}
                      type="button"
                      onClick={() => p.choisirGenre(choix)}
                      aria-label={choix === "femme" ? t.femme : t.homme}
                      aria-pressed={choisi}
                      className="flex aspect-square min-w-0 flex-1 items-center justify-center rounded-full border-2 transition-transform active:scale-95"
                      style={choisi ? STYLE_ENCRE : STYLE_CONTOUR}
                    >
                      {choix === "femme" ? <IconeFemme /> : <IconeHomme />}
                    </button>
                  );
                })}
              </div>
            )}

            {p.etape === "presentation" && (
              <>
                {p.phase === "pret" ? reecoute : grandMicro}
                {p.phase !== "pret" && (
                  <button
                    type="button"
                    onClick={() => void p.terminer(false)}
                    aria-label={t.passer}
                    className={`${BOUTON_ROND} h-16 w-16`}
                    style={STYLE_CONTOUR}
                  >
                    <ArrowRight size={28} />
                  </button>
                )}
              </>
            )}

            {p.etape === "fin" && (
              p.enregistrement === "echec" ? (
                <button type="button" onClick={() => void p.terminer(Boolean(p.presentation))} aria-label={t.reessayer} className={`${BOUTON_ROND} h-28 w-28`} style={STYLE_CONTOUR}>
                  <RotateCcw size={44} />
                </button>
              ) : (
                <div className={`${BOUTON_ROND} h-28 w-28`} style={STYLE_ENCRE}>
                  {p.enregistrement === "en_cours" ? <Loader2 size={44} className="animate-spin" /> : <Check size={48} />}
                </div>
              )
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
