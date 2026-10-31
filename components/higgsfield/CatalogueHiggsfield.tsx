"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-dj-texte-muet">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
  const [visible, setVisible] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const isVideo = effet.previewType === "video" || effet.preview.endsWith(".mp4") || effet.preview.endsWith(".webm");
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
  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{ transitionDelay: `${Math.min(index * 40, 300)}ms` }}
      className={`group flex flex-col overflow-hidden rounded-[20px] border border-dj-bordure bg-dj-surface text-left shadow-sm transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-xl ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-dj-fond">
        {!mediaError ? (
          isVideo ? (
            <video
              src={effet.preview}
              poster={effet.poster}
              muted
              loop
              playsInline
              preload="metadata"
              onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play().catch(() => {})}
              onMouseLeave={(e) => {
                const v = e.currentTarget as HTMLVideoElement;
                v.pause();
                v.currentTime = 0;
              }}
              onError={() => setMediaError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={effet.preview}
              alt={effet.nom}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              onError={() => setMediaError(true)}
            />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-dj-texte/10 via-dj-surface-haute to-dj-fond p-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-dj-texte text-dj-fond">
                <Play className="h-5 w-5 translate-x-px" />
              </div>
              <span className="text-xs font-semibold text-dj-texte-muet">Preview bientôt</span>
            </div>
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold leading-none tracking-wide text-white backdrop-blur">
          {effet.type === "video-to-video" ? "VIDÉO → VIDÉO" : effet.type === "image-to-video" ? "IMAGE → VIDÉO" : effet.type === "image" ? "IMAGE" : "AVATAR"}
        </span>
        {isVideo && !mediaError && (
          <span className="absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-black shadow">
            <Play className="h-3.5 w-3.5 translate-x-px fill-black" />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-bold leading-tight text-dj-texte">{effet.nom}</span>
          {effet.badge ? (
            <span className="shrink-0 rounded-full bg-dj-texte px-2 py-0.5 text-[10px] font-bold leading-none text-dj-fond">
              {effet.badge}
            </span>
          ) : null}
        </div>
        <span className="line-clamp-2 text-[13px] leading-snug text-dj-texte-muet">{effet.description}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-dj-texte-muet">{effet.style}</span>
      </div>
    </button>
  );
}

export function CatalogueHiggsfield() {
  const ouvrirChat = useOuvrirChatAvecTexte();
  const [typeFiltre, setTypeFiltre] = useState<string>("tous");
  const [styleFiltre, setStyleFiltre] = useState<string>("tous");
  const filtres = useMemo(
    () =>
      EFFETS_HIGGSFIELD.filter((e) => {
        const okType = typeFiltre === "tous" || e.type === typeFiltre;
        const okStyle = styleFiltre === "tous" || e.style === styleFiltre;
        return okType && okStyle;
      }),
    [typeFiltre, styleFiltre]
  );
  function auClic(effet: EffetHiggsfield) {
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
    <div className="flex flex-col gap-4 px-4 py-4 md:px-6 md:py-6">
      <p className="max-w-2xl text-sm leading-relaxed text-dj-texte-muet">
        Scrolle, filtre par type et style, survole pour prévisualiser la vidéo, clique — la carte demande d&apos;abord
        l&apos;image ou la vidéo dont l&apos;effet a besoin, puis t&apos;envoie au chat.
      </p>
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-dj-bordure bg-dj-fond/80 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-4">
        <FiltreChips label="Type" options={TYPES_EFFET as any} valeur={typeFiltre} onChange={setTypeFiltre} />
        <FiltreChips label="Style" options={STYLES_EFFET as any} valeur={styleFiltre} onChange={setStyleFiltre} />
      </div>
      {filtres.length === 0 ? (
        <p className="py-12 text-center text-sm text-dj-texte-muet">Aucun effet pour ces filtres.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
          {filtres.map((e, i) => (
            <CarteEffet key={e.id} effet={e} index={i} onClick={() => auClic(e)} />
          ))}
        </div>
      )}
    </div>
  );
}
