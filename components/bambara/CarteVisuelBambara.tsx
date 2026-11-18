"use client";

// Page bambara (16/11/2026, demande de Bourama) : une vidéo ou une image dans une planche de vignettes.
// Refonte du 18/11/2026 (demande de Bourama) : c'est une conversation, pas une page de résultats Google.
// Les cartes sont donc de petites vignettes carrées, toutes de la même taille, qui se suivent en grille de
// 3 par ligne (RangeesVisuelsBambara.tsx). Une vidéo en lecture prend toute la largeur de la ligne. Une vidéo YouTube se lance d'un
// toucher dans la carte (lecteur officiel), un fichier vidéo se lit avec le lecteur du navigateur ; une
// image s'agrandit au toucher. Aucun texte visible : l'utilisateur ne sait pas lire.
// Le cadre et le bouton de lecture sont en noir et blanc (18/11/2026), les angles des cartes sont nets
// (les médias sont carrés, les commandes sont rondes) ; les images et vignettes elles mêmes gardent leurs
// vraies couleurs, car elles font comprendre le contenu.

import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useState } from "react";
import type { VisuelBambara } from "@/lib/pageBambaraVisuels";

const ENTREE = { opacity: 0, y: 12 };
const ARRIVEE = { opacity: 1, y: 0 };
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
      className={`relative overflow-hidden border bg-black ${enLecture ? "col-span-full aspect-video" : "aspect-square"}`}
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
            className="relative flex h-9 w-9 items-center justify-center rounded-full transition-transform group-active:scale-95 sm:h-11 sm:w-11"
            style={{ backgroundColor: "var(--bb-fond)", color: "var(--bb-encre)", border: "2px solid var(--bb-encre)" }}
          >
            <Play size={18} fill="currentColor" />
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
      className="group relative aspect-square w-full overflow-hidden border"
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
