"use client";

// Page bambara (19/11/2026, demande de Bourama) : un message audio comme sur WhatsApp. Un bouton pour
// écouter ou mettre en pause, les barres de la voix qui se remplissent pendant la lecture (un toucher sur
// les barres avance ou recule), et la durée. Il sert pour ce que dit la personne (bulle à droite) et pour
// la voix de Classinus (bulle à gauche). Une seule bulle joue à la fois dans toute la conversation : la page
// garde l'identifiant de celle qui joue (`idEnLecture`) et chaque bulle se met en pause quand ce n'est plus la sienne.
// Noir et blanc seulement : les couleurs viennent de .bb-page (bambara.css).

import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { NOMBRE_PICS, formaterDuree, type MessageAudioBambara } from "@/lib/audioMessageBambara";

type Props = {
  /** Identifiant de la bulle dans la conversation (tour et sens). */
  id: string;
  /** Le message audio, ou null tant qu'il n'est pas prêt : la bulle est alors déjà là (même taille, barres qui pulsent). */
  message: MessageAudioBambara | null;
  cote: "droite" | "gauche";
  /** Identifiant de la bulle qui joue en ce moment dans la conversation, null si aucune. */
  idEnLecture: string | null;
  surChangerLecture: (id: string | null) => void;
  libelleEcouter: string;
  libelleMettreEnPause: string;
  /**
   * Tant que le message n'est pas prêt : "attente" (rien ne se dit encore, les barres bougent) ou "lecture" (la voix de
   * Classinus lit la réponse en direct : le bouton met en pause, ce qui coupe la voix).
   */
  direct?: "attente" | "lecture";
  /** Coupe la voix qui lit en direct ; la partie déjà lue reste réécoutable dans cette même bulle. */
  surArreterDirect?: () => void;
};

// Quand le message n'a pas de forme d'onde (enregistrement gardé tel quel), des barres régulières.
const BARRES_PAR_DEFAUT = Array.from({ length: NOMBRE_PICS }, () => 0.35);

export function BulleAudioBambara({ id, message, cote, idEnLecture, surChangerLecture, libelleEcouter, libelleMettreEnPause, direct, surArreterDirect }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [adresse, setAdresse] = useState<string | null>(null);
  const dureeMs = message?.dureeMs ?? 0;
  const blob = message?.blob ?? null;
  const [progres, setProgres] = useState(0);
  const [enCours, setEnCours] = useState(false);

  // L'adresse du fichier vit avec la bulle et est libérée quand elle disparaît.
  useEffect(() => {
    if (!blob) {
      setAdresse(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setAdresse(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  // Ce n'est plus cette bulle qui doit jouer (une autre démarre, une nouvelle demande arrive) : pause.
  useEffect(() => {
    const audio = audioRef.current;
    if (idEnLecture !== id && audio && !audio.paused) audio.pause();
  }, [idEnLecture, id]);

  // Les barres suivent la lecture image par image, pas seulement quatre fois par seconde.
  useEffect(() => {
    if (!enCours) return;
    let image = 0;
    const suivre = () => {
      const audio = audioRef.current;
      if (audio && dureeMs > 0) setProgres(Math.min(1, (audio.currentTime * 1000) / dureeMs));
      image = requestAnimationFrame(suivre);
    };
    image = requestAnimationFrame(suivre);
    return () => cancelAnimationFrame(image);
  }, [enCours, dureeMs]);

  const basculer = () => {
    if (message === null) {
      if (direct === "lecture") surArreterDirect?.();
      return;
    }
    const audio = audioRef.current;
    if (!audio || !adresse) return;
    if (!audio.paused) {
      audio.pause();
      surChangerLecture(null);
      return;
    }
    surChangerLecture(id);
    audio.play().catch(() => surChangerLecture(null));
  };

  const placer = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !adresse || dureeMs <= 0) return;
    const zone = e.currentTarget.getBoundingClientRect();
    if (zone.width <= 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - zone.left) / zone.width));
    try {
      audio.currentTime = (fraction * dureeMs) / 1000;
      setProgres(fraction);
    } catch {
      // Fichier pas encore prêt : le toucher est ignoré.
    }
  };

  const enPreparation = message === null;
  const lectureDirecte = enPreparation && direct === "lecture";
  const barres = message && message.pics.length === NOMBRE_PICS ? message.pics : BARRES_PAR_DEFAUT;
  const barresLues = Math.round(progres * NOMBRE_PICS);
  const dureeAffichee = enCours || progres > 0 ? progres * dureeMs : dureeMs;

  // Option B (demande de Bourama du 23/11/2026) : tant que rien ne se dit, pas de bulle, seulement une onde vivante de la
  // même taille. Quand la voix lit, la bulle apparaît à sa place avec le bouton pause.
  if (enPreparation && direct === "attente") {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        aria-busy="true"
        className={"flex h-14 w-72 max-w-[85%] items-center gap-[2px] px-3 " + (cote === "droite" ? "self-end" : "self-start")}
      >
        {barres.map((pic, i) => (
          <span
            key={i}
            className="bb-onde-barre min-w-[2px] max-w-[4px] flex-1 rounded-full"
            style={{ height: Math.max(12, Math.round(pic * 100)) + "%", backgroundColor: "var(--bb-encre)", animationDelay: (i % 12) * 90 + "ms" }}
          />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={"flex w-72 max-w-[85%] items-center gap-3 rounded-2xl border px-3 py-2 " + (cote === "droite" ? "self-end" : "self-start")}
      style={{ borderColor: "var(--bb-trait)", backgroundColor: cote === "droite" ? "var(--bb-voile)" : "var(--bb-fond)" }}
    >
      <audio
        ref={audioRef}
        src={adresse ?? undefined}
        preload="auto"
        onPlay={() => setEnCours(true)}
        onPause={() => setEnCours(false)}
        onEnded={() => {
          setEnCours(false);
          setProgres(0);
          const audio = audioRef.current;
          if (audio) audio.currentTime = 0;
          if (idEnLecture === id) surChangerLecture(null);
        }}
      />
      <button
        type="button"
        onClick={basculer}
        disabled={enPreparation ? !lectureDirecte : !adresse}
        aria-label={enCours || lectureDirecte ? libelleMettreEnPause : libelleEcouter}
        aria-pressed={enCours || lectureDirecte}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-40"
        style={{ backgroundColor: "var(--bb-encre)", color: "var(--bb-fond)" }}
      >
        {enCours || lectureDirecte ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <div
        onClick={placer}
        className={"flex h-8 min-w-0 flex-1 items-center gap-[2px] " + (enPreparation ? "" : "cursor-pointer")}
      >
        {barres.map((pic, i) => (
          <span
            key={i}
            className={"min-w-[2px] max-w-[4px] flex-1 rounded-full" + (enPreparation ? " bb-onde-barre" : "")}
            style={{
              height: Math.max(12, Math.round(pic * 100)) + "%",
              backgroundColor: enPreparation ? "var(--bb-encre)" : i < barresLues ? "var(--bb-encre)" : "var(--bb-trait-fort)",
              transition: "background-color 0.15s ease-out",
              animationDelay: enPreparation ? (i % 12) * 90 + "ms" : undefined,
            }}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--bb-encre)" }}>
        {enPreparation ? <span className="invisible">0:00</span> : formaterDuree(dureeAffichee)}
      </span>
    </motion.div>
  );
}
