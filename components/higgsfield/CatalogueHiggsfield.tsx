"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";
import { EFFETS_HIGGSFIELD, TYPES_EFFET, STYLES_EFFET, type EffetHiggsfield } from "@/lib/effetsHiggsfield";

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
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs font-semibold text-dj-texte-muet">{label}</span>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
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
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <button
      ref={ref}
      onClick={onClick}
      style={{ transitionDelay: `${Math.min(index * 45, 360)}ms` }}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface text-left transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-lg ${visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-dj-fond">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={effet.preview}
          alt={effet.nom}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-dj-texte">{effet.nom}</span>
          {effet.badge ? (
            <span className="rounded-full bg-dj-texte px-1.5 py-0.5 text-[10px] font-bold leading-none text-dj-fond">
              {effet.badge}
            </span>
          ) : null}
        </div>
        <span className="line-clamp-2 text-xs leading-snug text-dj-texte-muet">{effet.description}</span>
        <span className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-dj-texte-muet">
          {effet.type} · {effet.style}
        </span>
      </div>
    </button>
  );
}

export function CatalogueHiggsfield() {
  const ouvrirChat = useOuvrirChatAvecTexte();
  const [typeFiltre, setTypeFiltre] = useState<string>("tous");
  const [styleFiltre, setStyleFiltre] = useState<string>("tous");

  const filtres = useMemo(() => {
    return EFFETS_HIGGSFIELD.filter((e) => {
      const okType = typeFiltre === "tous" || e.type === typeFiltre;
      const okStyle = styleFiltre === "tous" || e.style === styleFiltre;
      return okType && okStyle;
    });
  }, [typeFiltre, styleFiltre]);

  function auClic(effet: EffetHiggsfield) {
    const besoin =
      effet.type === "image" ? "une image" : effet.type === "image-to-video" ? "une image" : effet.type === "video-to-video" ? "une vidéo" : "un avatar / une image";
    const texte = effet.promptChat + "\n\nFormat: " + effet.type + " · Modèle: " + effet.modele + "\nBesoin pour démarrer: " + besoin;
    ouvrirChat(texte);
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3 md:px-6">
      <p className="text-sm text-dj-texte-muet">
        Scrolle, filtre par type et style, clique sur une carte — elle demande d&apos;abord l&apos;image ou la
        vidéo dont l&apos;effet a besoin, puis t&apos;envoie au chat.
      </p>
      <FiltreChips label="Type" options={TYPES_EFFET as any} valeur={typeFiltre} onChange={setTypeFiltre} />
      <FiltreChips label="Style" options={STYLES_EFFET as any} valeur={styleFiltre} onChange={setStyleFiltre} />
      {filtres.length === 0 ? (
        <p className="py-8 text-center text-sm text-dj-texte-muet">Aucun effet pour ces filtres.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filtres.map((e, i) => (
            <CarteEffet key={e.id} effet={e} index={i} onClick={() => auClic(e)} />
          ))}
        </div>
      )}
    </div>
  );
}
