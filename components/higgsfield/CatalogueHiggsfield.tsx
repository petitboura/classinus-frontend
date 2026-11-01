"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { VisionneurHiggsfield } from "@/components/higgsfield/VisionneurHiggsfield";
import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";
import { EFFETS_HIGGSFIELD, STYLES_EFFET, TYPES_EFFET, type EffetHiggsfield } from "@/lib/effetsHiggsfield";

function FiltreChips({
  label,
  options,
  valeur,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  valeur: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
      <span className="shrink-0 text-xs font-semibold text-dj-texte-muet">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            valeur === o.value
              ? "border-dj-texte bg-dj-texte text-dj-fond"
              : "border-dj-bordure bg-transparent text-dj-texte-muet hover:border-dj-texte-muet hover:text-dj-texte"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CarteEffet({ effet, index, onClick }: { effet: EffetHiggsfield; index: number; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [survolActif, setSurvolActif] = useState(false);
  const isVideo = effet.previewType === "video" || effet.preview.endsWith(".mp4") || effet.preview.endsWith(".webm");

  // 1. apparition entree (fade-in)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 2. autoplay quand la video entre a l'ecran, pause quand elle sort (comme higgsfield.ai)
  useEffect(() => {
    if (!isVideo || mediaError) return;
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
  }, [isVideo, mediaError]);

  // 3. son direct au survol (desktop) — mute par defaut, unmute au hover
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo || mediaError) return;
    v.muted = !survolActif;
    if (survolActif) v.play().catch(() => {});
  }, [survolActif, isVideo, mediaError]);

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
      onClick={onClick}
      onMouseEnter={activerSon}
      onMouseLeave={couperSon}
      onFocus={activerSon}
      onBlur={couperSon}
      style={{ transitionDelay: `${Math.min(index * 40, 300)}ms` }}
      className={`group relative flex aspect-[3/4] touch-manipulation flex-col justify-end overflow-hidden rounded-[20px] border border-dj-bordure text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl active:scale-[0.98] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      {/* video full-bleed prend toute la carte */}
      {!mediaError ? (
        isVideo ? (
          <video
            ref={videoRef}
            src={effet.preview}
            poster={effet.poster}
            muted={!survolActif}
            loop
            autoPlay
            playsInline
            preload="metadata"
            onError={() => setMediaError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={effet.preview}
            alt={effet.nom}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setMediaError(true)}
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

      {/* badge type en haut */}
      <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold leading-none tracking-wide text-white backdrop-blur">
        {effet.type === "video-to-video" ? "VIDÉO → VIDÉO" : effet.type === "image-to-video" ? "IMAGE → VIDÉO" : effet.type === "image" ? "IMAGE" : "AVATAR"}
      </span>

      {/* fond transparent : degrade noir leger pour lisibilite */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-12 sm:px-3.5 sm:pb-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold leading-tight text-white sm:text-[15px]">{effet.nom}</span>
            {effet.badge ? (
              <span className="hidden shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold leading-none text-black min-[480px]:inline-flex">
                {effet.badge}
              </span>
            ) : null}
          </div>
          <span className="line-clamp-2 text-xs leading-snug text-white/80 sm:text-[13px]">{effet.description}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{effet.style}</span>
        </div>
      </div>

      {/* bouton generer flottant */}
      {!mediaError && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex min-h-8 items-center gap-1 rounded-full bg-white/95 px-3 py-2 text-[11px] font-bold leading-none text-black shadow backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          Générer
        </span>
      )}
    </button>
  );
}

export function CatalogueHiggsfield() {
  const ouvrirChat = useOuvrirChatAvecTexte();
  const [typeFiltre, setTypeFiltre] = useState<string>("tous");
  const [styleFiltre, setStyleFiltre] = useState<string>("tous");
  const [indexVisionneur, setIndexVisionneur] = useState<number | null>(null);
  const filtres = useMemo(
    () =>
      EFFETS_HIGGSFIELD.filter((e) => {
        const okType = typeFiltre === "tous" || e.type === typeFiltre;
        const okStyle = styleFiltre === "tous" || e.style === styleFiltre;
        return okType && okStyle;
      }),
    [typeFiltre, styleFiltre]
  );
  function generer(effet: EffetHiggsfield) {
    setIndexVisionneur(null);
    const besoin =
      effet.type === "image"
        ? "une image"
        : effet.type === "image-to-video"
          ? "une image"
          : effet.type === "video-to-video"
            ? "une vidéo"
            : "un avatar / une image";
    ouvrirChat(effet.promptChat + "\n\nFormat: " + effet.type + " · Modèle: " + effet.modele + "\nBesoin pour démarrer: " + besoin);
  }
  return (
    <div className="flex flex-col gap-4 py-4 md:py-6">
      <div className="flex flex-col gap-1 rounded-[20px] border border-dj-bordure bg-dj-surface px-4 py-3.5">
        <span className="inline-flex w-fit items-center rounded-full bg-dj-texte px-2.5 py-1 text-[10px] font-bold leading-none tracking-wide text-dj-fond">
          BIENTÔT DISPONIBLE
        </span>
        <p className="text-sm leading-relaxed text-dj-texte-muet">
          La génération arrive bientôt. En attendant, explore le catalogue et ouvre un effet en plein écran pour préparer ton idée.
        </p>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-dj-texte-muet">
        Filtre par type et style, clique sur un effet pour l&apos;ouvrir en plein écran, scrolle de vidéo en
        vidéo, puis Générer t&apos;envoie au chat.
      </p>
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-dj-bordure bg-dj-fond/80 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-4">
        <FiltreChips label="Type" options={TYPES_EFFET as any} valeur={typeFiltre} onChange={setTypeFiltre} />
        <FiltreChips label="Style" options={STYLES_EFFET as any} valeur={styleFiltre} onChange={setStyleFiltre} />
      </div>
      {filtres.length === 0 ? (
        <p className="py-12 text-center text-sm text-dj-texte-muet">Aucun effet pour ces filtres.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {filtres.map((e, i) => (
            <CarteEffet key={e.id} effet={e} index={i} onClick={() => setIndexVisionneur(i)} />
          ))}
        </div>
      )}
      {indexVisionneur !== null && filtres[indexVisionneur] ? (
        <VisionneurHiggsfield
          effets={filtres}
          indexDepart={indexVisionneur}
          onClose={() => setIndexVisionneur(null)}
          onGenerer={generer}
        />
      ) : null}
    </div>
  );
}
