"use client";

// Page bambara (16/11/2026, demande de Bourama) : une vidéo ou une image dans une rangée qui défile.
// Refonte du 18/11/2026 (demande de Bourama) : c'est une conversation, pas une page de résultats Google.
// Les cartes sont donc petites, comme dans le chat (GalerieImagesBulle.tsx et CartesVideosBulle.tsx), et
// se suivent en rangée de gauche à droite (RangeesVisuelsBambara.tsx). Une vidéo YouTube se lance d'un
// toucher dans la carte (lecteur officiel), un fichier vidéo se lit avec le lecteur du navigateur ; une
// image s'agrandit au toucher. Aucun texte visible : l'utilisateur ne sait pas lire.
// Le cadre et le bouton de lecture sont en noir et blanc (18/11/2026), les angles des cartes sont nets
// (les médias sont carrés, les commandes sont rondes) ; les images et vignettes elles mêmes gardent leurs
// vraies couleurs, car elles font comprendre le contenu.

import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useState } from "react";
import type { VisuelBambara } from "@/lib/pageBambaraVisuels";

const ENTREE = { opacity: 0, x: 16 };
const ARRIVEE = { opacity: 1, x: 0 };
const TRANSITION = { duration: 0.35, ease: "easeOut" } as const;

type PropsVideo = {
  visuel: VisuelBambara;
  enLecture: boolean;
  surLire: () => void;
  surFermer: () => void;
  libelleLire: string;
  libelleFermer: string;
};

export function CarteVideoBambara({ visuel, enLecture, surLire, surFermer, libelleLire, libelleFermer }: PropsVideo) {
  const [vignetteCassee, setVignetteCassee] = useState(false);
  const estFichier = !visuel.idVideo;

  return (
    <motion.div
      initial={ENTREE}
      animate={ARRIVEE}
      transition={TRANSITION}
      className="relative aspect-video w-60 shrink-0 snap-start overflow-hidden border bg-black sm:w-72"
      style={{ borderColor: "var(--bb-trait)" }}
    >
      {enLecture ? (
        <>
          {estFichier ? (
            <video src={visuel.url} controls autoPlay playsInline className="h-full w-full" />
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${visuel.idVideo}?autoplay=1&playsinline=1`}
              title={visuel.titre || "video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="h-full w-full"
            />
          )}
          <button
            type="button"
            onClick={surFermer}
            aria-label={libelleFermer}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full transition-transform active:scale-95"
            style={{ backgroundColor: "color-mix(in srgb, var(--bb-fond) 92%, transparent)", color: "var(--bb-encre)" }}
          >
            <X size={15} />
          </button>
        </>
      ) : (
        <button type="button" onClick={surLire} aria-label={libelleLire} className="group absolute inset-0 flex items-center justify-center">
          {visuel.miniature && !vignetteCassee && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={visuel.miniature}
              alt=""
              loading="lazy"
              onError={() => setVignetteCassee(true)}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          )}
          <span
            className="relative flex h-12 w-12 items-center justify-center rounded-full transition-transform group-active:scale-95"
            style={{ backgroundColor: "var(--bb-fond)", color: "var(--bb-encre)", border: "2px solid var(--bb-encre)" }}
          >
            <Play size={22} fill="currentColor" />
          </span>
        </button>
      )}
    </motion.div>
  );
}

type PropsImage = {
  visuel: VisuelBambara;
  surOuvrir: () => void;
  libelleOuvrir: string;
};

export function CarteImageBambara({ visuel, surOuvrir, libelleOuvrir }: PropsImage) {
  const [cassee, setCassee] = useState(false);
  if (cassee) return null;
  return (
    <motion.button
      type="button"
      initial={ENTREE}
      animate={ARRIVEE}
      transition={TRANSITION}
      onClick={surOuvrir}
      aria-label={visuel.titre || libelleOuvrir}
      className="group relative h-36 w-48 shrink-0 snap-start overflow-hidden border sm:h-40 sm:w-56"
      style={{ backgroundColor: "var(--bb-voile)", borderColor: "var(--bb-trait)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={visuel.miniature || visuel.url}
        alt={visuel.titre || ""}
        loading="lazy"
        onError={() => setCassee(true)}
        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
      />
    </motion.button>
  );
}
