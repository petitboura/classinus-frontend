"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Volume2, VolumeX, X } from "lucide-react";
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
  onGenerer,
}: {
  effet: EffetHiggsfield;
  sonActif: boolean;
  onGenerer: (effet: EffetHiggsfield) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  const isVideo = effet.previewType === "video" || effet.preview.endsWith(".mp4") || effet.preview.endsWith(".webm");

  useEffect(() => {
    if (!isVideo || mediaError) return;
    const v = videoRef.current;
    if (!v) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.6 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, [isVideo, mediaError]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = !sonActif;
  }, [sonActif]);

  return (
    <section className="relative h-full w-full shrink-0 snap-start snap-always overflow-hidden bg-black">
      {!mediaError ? (
        isVideo ? (
          <video
            ref={videoRef}
            src={effet.preview}
            poster={effet.poster}
            muted={!sonActif}
            loop
            autoPlay
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effet.preview}
            alt={effet.nom}
            onError={() => setMediaError(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-black p-6">
          <span className="text-sm font-semibold text-white/70">Preview bientôt</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-5 pb-6 pt-24">
        <div className="pointer-events-auto flex max-w-xl flex-col items-start gap-2.5">
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
          <h2 className="text-2xl font-bold leading-tight text-white">{effet.nom}</h2>
          <p className="text-sm leading-relaxed text-white/85">{effet.description}</p>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-white/60">
            Modèle : {effet.modele}
          </span>
          <button
            onClick={() => onGenerer(effet)}
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-black shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-95"
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
  const [sonActif, setSonActif] = useState(false);

  useEffect(() => {
    const el = conteneurRef.current;
    if (el) el.scrollTop = indexDepart * el.clientHeight;
  }, [indexDepart]);

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
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onScroll() {
    const el = conteneurRef.current;
    if (!el || el.clientHeight === 0) return;
    const i = Math.round(el.scrollTop / el.clientHeight);
    if (i !== indexCourant && i >= 0 && i < effets.length) setIndexCourant(i);
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Effets Higgsfield en plein écran">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-4">
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-transform duration-200 active:scale-90"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-xs font-bold tracking-wide text-white/85">
          {effets.length > 0 ? `${indexCourant + 1} / ${effets.length}` : ""}
        </span>
        <button
          onClick={() => setSonActif((s) => !s)}
          aria-label={sonActif ? "Couper le son" : "Activer le son"}
          className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition-transform duration-200 active:scale-90"
        >
          {sonActif ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </button>
      </div>

      <div
        ref={conteneurRef}
        onScroll={onScroll}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {effets.map((effet) => (
          <DiapoEffet key={effet.id} effet={effet} sonActif={sonActif} onGenerer={onGenerer} />
        ))}
      </div>
    </div>
  );
}
