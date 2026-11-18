"use client";

// Page bambara (16/11/2026, demande de Bourama) : une vidéo ou une image montrée en grand. Une vidéo
// YouTube se lance d'un toucher, dans la carte (lecteur officiel, comme CartesVideosBulle.tsx) ; un
// fichier vidéo se lit avec le lecteur du navigateur. Aucun texte : l'utilisateur ne sait pas lire.
// Le cadre et le bouton de lecture sont en noir et blanc (18/11/2026) ; les images et vignettes
// elles mêmes gardent leurs vraies couleurs, car elles font comprendre le contenu.

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useState } from "react";
import type { VisuelBambara } from "@/lib/pageBambaraVisuels";

const ENTREE = { opacity: 0, scale: 0.96, y: 14 };
const ARRIVEE = { opacity: 1, scale: 1, y: 0 };

function Video({ visuel, libelleLire }: { visuel: VisuelBambara; libelleLire: string }) {
  const [lecture, setLecture] = useState(false);
  const [vignetteCassee, setVignetteCassee] = useState(false);
  const estFichier = !visuel.idVideo;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black" style={{ borderColor: "var(--bb-trait)" }}>
      {lecture && !estFichier ? (
        <iframe
          src={`https://www.youtube.com/embed/${visuel.idVideo}?autoplay=1&playsinline=1`}
          title={visuel.titre || "video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full"
        />
      ) : lecture && estFichier ? (
        <video src={visuel.url} controls autoPlay playsInline className="h-full w-full" />
      ) : (
        <button type="button" onClick={() => setLecture(true)} aria-label={libelleLire} className="group absolute inset-0 flex items-center justify-center">
          {visuel.miniature && !vignetteCassee && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visuel.miniature} alt="" onError={() => setVignetteCassee(true)} className="absolute inset-0 h-full w-full object-cover" />
          )}
          <span
            className="relative flex h-20 w-20 items-center justify-center rounded-full transition-transform group-active:scale-95"
            style={{ backgroundColor: "color-mix(in srgb, var(--bb-fond) 92%, transparent)", color: "var(--bb-encre)" }}
          >
            <Play size={36} fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}

function Image({ visuel }: { visuel: VisuelBambara }) {
  const [cassee, setCassee] = useState(false);
  if (cassee) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={visuel.url}
      alt={visuel.titre || ""}
      onError={() => setCassee(true)}
      className="max-h-[62vh] w-full rounded-2xl border object-contain"
      style={{ backgroundColor: "var(--bb-voile)", borderColor: "var(--bb-trait)" }}
    />
  );
}

export function CarteVisuelBambara({ visuel, libelleLire }: { visuel: VisuelBambara; libelleLire: string }) {
  return (
    <motion.div initial={ENTREE} animate={ARRIVEE} transition={{ duration: 0.45, ease: "easeOut" }} className="w-full">
      {visuel.genre === "video" ? <Video visuel={visuel} libelleLire={libelleLire} /> : <Image visuel={visuel} />}
    </motion.div>
  );
}
