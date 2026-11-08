"use client";

import { memo, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { renduEffet, type EffetHiggsfield } from "@/lib/effetsHiggsfield";

// memo : ouvrir ou fermer le plein écran ne redessine plus les cartes du catalogue.
export const CarteEffet = memo(function CarteEffet({
  effet,
  index,
  onOuvrir,
}: {
  effet: EffetHiggsfield;
  index: number;
  onOuvrir: (index: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // La vidéo n'existe en mémoire que lorsque la carte est proche de l'écran : l'image fixe
  // s'affiche tout de suite, la vidéo se charge à l'approche, et elle est libérée dès que la
  // carte s'éloigne. Sans cela, toutes les vidéos déjà passées restaient chargées en mémoire
  // et le téléphone ralentissait de plus en plus.
  const [proche, setProche] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  // Les images de carte utilisent la miniature redimensionnee quand elle existe (bien plus legere
  // que l'original, qui reste reserve au plein ecran). Si elle echoue, on retombe sur l'original.
  const [miniatureEchec, setMiniatureEchec] = useState(false);
  const [survolActif, setSurvolActif] = useState(false);
  const srcImage = effet.poster && !miniatureEchec ? effet.poster : effet.preview;
  const isVideo = effet.previewType === "video" || effet.preview.endsWith(".mp4") || effet.preview.endsWith(".webm");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setProche(entry.isIntersecting), { rootMargin: "700px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Quand la carte s'éloigne, React retire la source de la vidéo ; load() force le navigateur
  // à vraiment libérer ce qu'il avait téléchargé.
  useEffect(() => {
    if (proche) return;
    const v = videoRef.current;
    if (v && v.currentSrc) {
      v.pause();
      v.load();
    }
  }, [proche]);

  useEffect(() => {
    if (!isVideo || mediaError || !proche) return;
    const v = videoRef.current;
    if (!v) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, [isVideo, mediaError, proche]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo || mediaError || !proche) return;
    v.muted = !survolActif;
    if (survolActif) v.play().catch(() => {});
  }, [survolActif, isVideo, mediaError, proche]);

  function activerSon() {
    if (!isVideo || mediaError) return;
    setSurvolActif(true);
  }
  function couperSon() {
    if (!isVideo || mediaError) return;
    setSurvolActif(false);
  }

  return (
    <button
      ref={ref}
      onClick={() => onOuvrir(index)}
      onMouseEnter={activerSon}
      onMouseLeave={couperSon}
      onFocus={activerSon}
      onBlur={couperSon}
      className="group relative flex aspect-[3/4] animate-dj-fade-in-rapide touch-manipulation flex-col justify-end overflow-hidden rounded-[20px] border border-dj-bordure bg-dj-surface-haute text-left shadow-sm transition-transform duration-300 ease-out md:transition-all md:duration-500 md:hover:-translate-y-1 md:hover:shadow-xl active:scale-[0.98]"
    >
      {!mediaError ? (
        isVideo ? (
          <video
            ref={videoRef}
            src={proche ? effet.preview : undefined}
            poster={effet.poster}
            muted={!survolActif}
            loop
            playsInline
            preload={proche ? "metadata" : "none"}
            onError={() => setMediaError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={srcImage}
            alt={effet.nom}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => {
              if (srcImage !== effet.preview) setMiniatureEchec(true);
              else setMediaError(true);
            }}
          />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dj-texte/10 via-dj-surface-haute to-dj-fond p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-dj-texte text-dj-fond">
              <Play className="h-5 w-5 translate-x-px" />
            </div>
            <span className="text-xs font-semibold text-dj-texte-muet">Preview bientôt</span>
          </div>
        </div>
      )}

      <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold leading-none tracking-wide text-white">
        {effet.libelleType ?? (renduEffet(effet) === "video" ? "VIDÉO" : "IMAGE")}
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-12 sm:px-3.5 sm:pb-3.5">
        <div className="flex flex-col gap-1">
          <span className="truncate text-sm font-bold leading-tight text-white sm:text-[15px]">{effet.nom}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{effet.style}</span>
        </div>
      </div>

    </button>
  );
});
