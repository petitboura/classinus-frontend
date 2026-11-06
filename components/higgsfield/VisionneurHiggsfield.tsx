"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import type { EffetHiggsfield } from "@/lib/effetsHiggsfield";

function libelleType(effet: EffetHiggsfield) {
  return effet.type === "video-to-video"
    ? "VIDÉO → VIDÉO"
    : effet.type === "image-to-video"
      ? "IMAGE → VIDÉO"
      : effet.type === "image"
        ? "IMAGE"
        : "AVATAR";
}

function DiapoEffet({
  effet,
  sonActif,
  courant,
  proche,
  onGenerer,
}: {
  effet: EffetHiggsfield;
  sonActif: boolean;
  // courant : c'est l'effet affiché à l'écran, sa vidéo joue.
  courant: boolean;
  // proche : c'est l'effet affiché ou son voisin direct, seuls ces trois-là ont une vraie vidéo.
  proche: boolean;
  onGenerer: (effet: EffetHiggsfield) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  const isVideo = effet.previewType === "video" || effet.preview.endsWith(".mp4") || effet.preview.endsWith(".webm");
  const vraieVideo = isVideo && proche;

  // Le son, la lecture et la pause suivent l'effet courant ; la vidéo n'existe que pour les
  // trois effets proches, donc ce réglage est refait quand elle apparaît.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !sonActif;
    if (courant) v.play().catch(() => {});
    else v.pause();
  }, [courant, sonActif, vraieVideo, mediaError]);

  // Les autres effets n'affichent que leur image fixe, légère : ouvrir le plein écran ne lance
  // plus toutes les vidéos du catalogue en même temps.
  const imageFixe = isVideo ? effet.poster : effet.preview;

  return (
    <section className="relative h-full min-h-[100dvh] w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {!mediaError ? (
        vraieVideo ? (
          <video
            ref={videoRef}
            src={effet.preview}
            poster={effet.poster}
            muted={!sonActif}
            loop
            playsInline
            preload="auto"
            onError={() => setMediaError(true)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : imageFixe ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageFixe}
            alt={effet.nom}
            loading="lazy"
            decoding="async"
            onError={() => setMediaError(true)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : null
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
          <span className="text-sm font-semibold text-white/70">Preview bientôt</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-4 pb-[calc(1.25rem+var(--safe-bottom,0px))] pt-24 sm:px-5 sm:pb-[calc(1.5rem+var(--safe-bottom,0px))]">
        <div className="pointer-events-auto flex w-full max-w-xl flex-col items-start gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold leading-none tracking-wide text-black">
              {libelleType(effet)}
            </span>
            {effet.badge ? (
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold leading-none tracking-wide text-white backdrop-blur">
                {effet.badge}
              </span>
            ) : null}
            <span className="text-[11px] font-semibold uppercase tracking-widest text-white/70">{effet.style}</span>
          </div>
          <h2 className="text-xl font-bold leading-tight text-white sm:text-2xl">{effet.nom}</h2>
          <p className="line-clamp-3 text-sm leading-relaxed text-white/85 sm:line-clamp-none">{effet.description}</p>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">Modèle : {effet.modele}</span>
          <button
            onClick={() => onGenerer(effet)}
            className="mt-2 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-95 sm:w-auto sm:justify-start"
          >
            <Sparkles className="h-4 w-4" />
            Générer
          </button>
        </div>
      </div>
    </section>
  );
}

export function VisionneurHiggsfield({
  effets,
  indexDepart,
  onClose,
  onGenerer,
}: {
  effets: EffetHiggsfield[];
  indexDepart: number;
  onClose: () => void;
  onGenerer: (effet: EffetHiggsfield) => void;
}) {
  const conteneurRef = useRef<HTMLDivElement>(null);
  const [indexCourant, setIndexCourant] = useState(indexDepart);
  const [sonActif, setSonActif] = useState(true);

  useEffect(() => {
    const el = conteneurRef.current;
    if (el) el.scrollTop = indexDepart * el.clientHeight;
  }, [indexDepart]);

  // instantane : utilisé quand on fait glisser le curseur de la colonne, où un défilement
  // animé se battrait avec le doigt ; les flèches et les clics gardent l'animation.
  const scrollerVers = useCallback(
    (i: number, instantane = false) => {
      const el = conteneurRef.current;
      if (!el || i < 0 || i >= effets.length) return;
      el.scrollTo({ top: i * el.clientHeight, behavior: instantane ? "auto" : "smooth" });
    },
    [effets.length]
  );

  useEffect(() => {
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        scrollerVers(Math.min(indexCourant + 1, effets.length - 1));
      }
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        scrollerVers(Math.max(indexCourant - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, indexCourant, effets.length, scrollerVers]);

  function onScroll() {
    const el = conteneurRef.current;
    if (!el || el.clientHeight === 0) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== indexCourant && i >= 0 && i < effets.length) setIndexCourant(i);
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex h-[100dvh] flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Effets Higgsfield en plein écran"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-[calc(1rem+var(--safe-top,0px))]">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-transform duration-200 active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-xs font-bold tracking-wide text-white/85">
          {effets.length > 0 ? `${indexCourant + 1} / ${effets.length}` : ""}
        </span>
        <button
          onClick={() => setSonActif((s) => !s)}
          aria-label={sonActif ? "Couper le son" : "Activer le son"}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-transform duration-200 active:scale-90"
        >
          {sonActif ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>

      {/* Flèches gauche et droite : sur PC seulement, le téléphone se manipule au doigt. */}
      <button
        onClick={() => scrollerVers(indexCourant - 1)}
        disabled={indexCourant <= 0}
        aria-label="Effet précédent"
        className="pointer-events-auto absolute left-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-all duration-200 hover:bg-black/70 active:scale-90 disabled:pointer-events-none disabled:opacity-30 md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => scrollerVers(indexCourant + 1)}
        disabled={indexCourant >= effets.length - 1}
        aria-label="Effet suivant"
        className="pointer-events-auto absolute right-2 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-all duration-200 hover:bg-black/70 active:scale-90 disabled:pointer-events-none disabled:opacity-30 md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={conteneurRef}
        onScroll={onScroll}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {effets.map((effet, i) => (
          <DiapoEffet
            key={effet.id}
            effet={effet}
            sonActif={sonActif}
            courant={i === indexCourant}
            proche={Math.abs(i - indexCourant) <= 1}
            onGenerer={onGenerer}
          />
        ))}
      </div>

      {/* Petits points en bas : sur PC seulement. L'effet affiché a un point allongé et blanc. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden items-center justify-center gap-1.5 pb-[calc(0.75rem+var(--safe-bottom,0px))] pt-6 md:flex">
        {effets.map((effet, i) => (
          <button
            key={effet.id}
            onClick={() => scrollerVers(i)}
            aria-label={`Aller à l'effet ${i + 1}`}
            className={`pointer-events-auto h-1.5 rounded-full transition-all duration-300 ${
              i === indexCourant ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
