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
  message: MessageAudioBambara;
  cote: "droite" | "gauche";
  /** Identifiant de la bulle qui joue en ce moment dans la conversation, null si aucune. */
  idEnLecture: string | null;
  surChangerLecture: (id: string | null) => void;
  libelleEcouter: string;
  libelleMettreEnPause: string;
};

// Quand le message n'a pas de forme d'onde (enregistrement gardé tel quel), des barres régulières.
const BARRES_PAR_DEFAUT = Array.from({ length: NOMBRE_PICS }, () => 0.35);

export function BulleAudioBambara({ id, message, cote, idEnLecture, surChangerLecture, libelleEcouter, libelleMettreEnPause }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [adresse, setAdresse] = useState<string | null>(null);
  const [progres, setProgres] = useState(0);
  const [enCours, setEnCours] = useState(false);

  // L'adresse du fichier vit avec la bulle et est libérée quand elle disparaît.
  useEffect(() => {
    const url = URL.createObjectURL(message.blob);
    setAdresse(url);
    return () => URL.revokeObjectURL(url);
  }, [message.blob]);

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
      if (audio && message.dureeMs > 0) setProgres(Math.min(1, (audio.currentTime * 1000) / message.dureeMs));
      image = requestAnimationFrame(suivre);
    };
    image = requestAnimationFrame(suivre);
    return () => cancelAnimationFrame(image);
  }, [enCours, message.dureeMs]);

  const basculer = () => {
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
    if (!audio || !adresse || message.dureeMs <= 0) return;
    const zone = e.currentTarget.getBoundingClientRect();
    if (zone.width <= 0) return;
    const fraction = Math.min(1, Math.max(0, (e.clientX - zone.left) / zone.width));
    try {
      audio.currentTime = (fraction * message.dureeMs) / 1000;
      setProgres(fraction);
    } catch {
      // Fichier pas encore prêt : le toucher est ignoré.
    }
  };

  const barres = message.pics.length === NOMBRE_PICS ? message.pics : BARRES_PAR_DEFAUT;
  const barresLues = Math.round(progres * NOMBRE_PICS);
  const dureeAffichee = enCours || progres > 0 ? progres * message.dureeMs : message.dureeMs;

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
        disabled={!adresse}
        aria-label={enCours ? libelleMettreEnPause : libelleEcouter}
        aria-pressed={enCours}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-40"
        style={{ backgroundColor: "var(--bb-encre)", color: "var(--bb-fond)" }}
      >
        {enCours ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </button>
      <div onClick={placer} className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-[2px]">
        {barres.map((pic, i) => (
          <span
            key={i}
            className="min-w-[2px] max-w-[4px] flex-1 rounded-full"
            style={{
              height: Math.max(12, Math.round(pic * 100)) + "%",
              backgroundColor: i < barresLues ? "var(--bb-encre)" : "var(--bb-trait-fort)",
              transition: "background-color 0.15s ease-out",
            }}
          />
        ))}
      </div>
      <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--bb-encre)" }}>
        {formaterDuree(dureeAffichee)}
      </span>
    </motion.div>
  );
}
