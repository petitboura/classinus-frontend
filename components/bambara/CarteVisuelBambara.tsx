"use client";

// Page bambara (16/11/2026, demande de Bourama) : une vidéo ou une image dans une planche de vignettes.
// Refonte du 18/11/2026 (demande de Bourama) : c'est une conversation, pas une page de résultats Google.
// Mise à jour du 22/11/2026 : les cartes sont plus grandes ; les images gardent leurs proportions en mosaïque
// (2 colonnes, 3 dès les écrans moyens), les vidéos sont au format vidéo, 2 par ligne (RangeesVisuelsBambara.tsx). Une vidéo en lecture prend toute la largeur de la ligne. Une vidéo YouTube se lance d'un
// toucher dans la carte (lecteur officiel), un fichier vidéo se lit avec le lecteur du navigateur ; une
// image s'agrandit au toucher. Aucun texte visible : l'utilisateur ne sait pas lire.
// Le cadre et le bouton de lecture sont en noir et blanc (18/11/2026), les angles des cartes sont nets
// (les médias sont carrés, les commandes sont rondes) ; les images et vignettes elles mêmes gardent leurs
// vraies couleurs, car elles font comprendre le contenu.

import { motion } from "framer-motion";
import { Play, X } from "lucide-react";
import { useState } from "react";
import type { VisuelBambara } from "@/lib/pageBambaraVisuels";
import { BoutonCoeurBambara, type GardeUiBambara } from "./BoutonCoeurBambara";

const ENTREE = { opacity: 0, y: 12 };
const ARRIVEE = { opacity: 1, y: 0 };
const SORTIE = { opacity: 0, scale: 0.9 };
const TRANSITION = { duration: 0.35, ease: "easeOut" } as const;

// Pas de fond derrière les icônes (demande de Bourama du 22/11/2026) : seule une fine lueur de la couleur du fond
// les garde lisibles sur n'importe quelle image, sans cacher la vidéo.
const HALO_ICONE = "drop-shadow(0 0 1.5px var(--bb-fond)) drop-shadow(0 0 3px var(--bb-fond))";

type PropsVideo = {
  visuel: VisuelBambara;
  enLecture: boolean;
  surLire: () => void;
  surFermer: () => void;
  libelleLire: string;
  libelleFermer: string;
  garde?: GardeUiBambara;
};

export function CarteVideoBambara({ visuel, enLecture, surLire, surFermer, libelleLire, libelleFermer, garde }: PropsVideo) {
  const [vignetteCassee, setVignetteCassee] = useState(false);
  const estFichier = !visuel.idVideo;

  return (
    <motion.div
      initial={ENTREE}
      animate={ARRIVEE}
      exit={SORTIE}
      transition={TRANSITION}
      className={`relative overflow-hidden border bg-black ${enLecture ? "col-span-full aspect-video" : "aspect-video"}`}
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
            style={{ color: "var(--bb-encre)", filter: HALO_ICONE }}
          >
            <X size={18} />
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
            style={{ color: "var(--bb-encre)", filter: HALO_ICONE }}
          >
            <Play size={26} fill="currentColor" />
          </span>
        </button>
      )}
      {garde && <BoutonCoeurBambara visuel={visuel} garde={garde} />}
    </motion.div>
  );
}

type PropsImage = {
  visuel: VisuelBambara;
  surOuvrir: () => void;
  libelleOuvrir: string;
  garde?: GardeUiBambara;
};

export function CarteImageBambara({ visuel, surOuvrir, libelleOuvrir, garde }: PropsImage) {
  const [cassee, setCassee] = useState(false);
  if (cassee) return null;
  return (
    <motion.div
      initial={ENTREE}
      animate={ARRIVEE}
      exit={SORTIE}
      transition={TRANSITION}
      className="relative mb-2 w-full break-inside-avoid overflow-hidden border"
      style={{ backgroundColor: "var(--bb-voile)", borderColor: "var(--bb-trait)" }}
    >
      <button type="button" onClick={surOuvrir} aria-label={visuel.titre || libelleOuvrir} className="group block w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visuel.miniature || visuel.url}
          alt={visuel.titre || ""}
          loading="lazy"
          onError={() => setCassee(true)}
          className="block h-auto w-full transition-transform duration-200 group-hover:scale-105"
        />
      </button>
      {garde && <BoutonCoeurBambara visuel={visuel} garde={garde} />}
    </motion.div>
  );
}
