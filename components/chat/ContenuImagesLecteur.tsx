"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff, Minus, Plus } from "lucide-react";
import type { ImageLecteur } from "@/lib/lecteurLateral";

// Contenu du volet pour une ou plusieurs images (27/11/2026, demande de Bourama).
// Une image s'ouvre grande, avec le zoom en haut ; quand il y en a plusieurs
// d'affilée (galerie, images générées), des vignettes et des flèches en bas
// permettent de passer de l'une à l'autre sans quitter la conversation.
// Remplace les visionneuses plein écran de VisionneuseImage.tsx là où le volet
// existe.

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const PAS_ZOOM = 0.25;

const classeBoutonRond =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dj-surface-haute text-dj-texte transition-colors hover:bg-dj-bordure disabled:opacity-40 disabled:hover:bg-dj-surface-haute";

export function ContenuImagesLecteur({
  liste,
  index,
  surChoisir,
}: {
  liste: ImageLecteur[];
  index: number;
  surChoisir: (index: number) => void;
}) {
  const courante = liste[index] ?? liste[0];
  const plusieurs = liste.length > 1;
  const [zoom, setZoom] = useState(1);
  const [enErreur, setEnErreur] = useState(false);
  const [chargee, setChargee] = useState(false);
  const departToucher = useRef<number | null>(null);
  const vignetteCouranteRef = useRef<HTMLButtonElement | null>(null);

  // Chaque image repart du zoom d'origine et de son propre état de chargement.
  useEffect(() => {
    setZoom(1);
    setEnErreur(false);
    setChargee(false);
  }, [courante?.src]);

  // La vignette de l'image affichée reste visible dans la rangée.
  useEffect(() => {
    vignetteCouranteRef.current?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  function aller(sens: 1 | -1) {
    if (!plusieurs) return;
    surChoisir((index + sens + liste.length) % liste.length);
  }

  function surTouche(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      aller(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      aller(1);
    }
  }

  if (!courante) return null;

  return (
    <div className="flex h-full min-h-0 flex-col outline-none" tabIndex={-1} onKeyDown={surTouche}>
      <div className="flex shrink-0 items-center gap-2 border-b border-dj-bordure px-3 py-2">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - PAS_ZOOM))}
          disabled={zoom <= ZOOM_MIN}
          aria-label="Zoom arrière"
          className={classeBoutonRond}
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          onClick={() => setZoom(1)}
          className="min-w-[3.25rem] rounded-lg px-1 text-center text-xs tabular-nums text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          {Math.round(zoom * 100)} %
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + PAS_ZOOM))}
          disabled={zoom >= ZOOM_MAX}
          aria-label="Zoom avant"
          className={classeBoutonRond}
        >
          <Plus size={16} />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-auto"
        onTouchStart={(e) => {
          departToucher.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (departToucher.current === null) return;
          const ecart = e.changedTouches[0].clientX - departToucher.current;
          departToucher.current = null;
          // Le balayage change d'image seulement quand rien n'est zoomé : sinon il fait défiler l'image.
          if (zoom === 1 && Math.abs(ecart) > 50) aller(ecart < 0 ? 1 : -1);
        }}
      >
        {enErreur ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-dj-texte-muet">
            <ImageOff size={22} />
            <p className="text-sm">Image indisponible</p>
          </div>
        ) : (
          <div className="flex min-h-full min-w-full p-4">
            {/* Source dynamique, pas un asset local optimisable. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={courante.src}
              src={courante.src}
              alt={courante.alt || ""}
              onLoad={() => setChargee(true)}
              onError={() => setEnErreur(true)}
              style={zoom === 1 ? undefined : { width: `${zoom * 100}%` }}
              className={`m-auto rounded-xl object-contain transition-opacity duration-300 ${
                zoom === 1 ? "max-h-full max-w-full" : "max-w-none"
              } ${chargee ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        )}
      </div>

      {plusieurs && (
        <div className="flex shrink-0 items-center justify-center gap-2 border-t border-dj-bordure px-3 py-2.5">
          <button type="button" onClick={() => aller(-1)} aria-label="Image précédente" className={classeBoutonRond}>
            <ChevronLeft size={18} />
          </button>
          <div className="flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain py-1">
            {liste.map((image, i) => {
              const active = i === index;
              return (
                <button
                  key={image.src + i}
                  ref={active ? vignetteCouranteRef : undefined}
                  type="button"
                  onClick={() => surChoisir(i)}
                  aria-label={image.alt || `Image ${i + 1} sur ${liste.length}`}
                  aria-current={active}
                  className={`h-[60px] w-[88px] shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                    active ? "border-dj-accent-1 opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  {/* Source dynamique, miniature d'une image du chat. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src} alt="" className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => aller(1)} aria-label="Image suivante" className={classeBoutonRond}>
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
