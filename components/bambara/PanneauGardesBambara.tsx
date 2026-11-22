"use client";

// Page bambara (18/11/2026, demande de Bourama) : le panneau du bouton des éléments gardés. Deux onglets avec
// une icône chacun, les vidéos et les images, sans texte. Chaque onglet réutilise les mêmes cartes que la
// conversation (lecture de la vidéo, image en plein écran) et garde le cœur : le toucher une seconde fois retire
// l'élément. Noir et blanc seulement (couleurs de .bb-page).

import { motion } from "framer-motion";
import { Heart, Image as IconeImage, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { visuelDepuisGarde, type GardeBambara } from "@/lib/bambaraEspace";
import type { GardeUiBambara } from "./BoutonCoeurBambara";
import { RangeesVisuelsBambara } from "./RangeesVisuelsBambara";

type Props = {
  gardes: GardeBambara[];
  garde: GardeUiBambara;
  idEnLecture: string | null;
  surChangerLecture: (id: string | null) => void;
  libelleVideos: string;
  libelleImages: string;
  libelleLire: string;
  libelleFermerVideo: string;
  libelleOuvrirImage: string;
};

export function PanneauGardesBambara({ gardes, garde, idEnLecture, surChangerLecture, libelleVideos, libelleImages, libelleLire, libelleFermerVideo, libelleOuvrirImage }: Props) {
  const [onglet, setOnglet] = useState<"video" | "image">("video");
  const visuels = useMemo(() => gardes.filter((g) => g.genre === onglet).map(visuelDepuisGarde), [gardes, onglet]);

  const onglets = [
    { genre: "video" as const, libelle: libelleVideos, Icone: Video },
    { genre: "image" as const, libelle: libelleImages, Icone: IconeImage },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2" role="tablist">
        {onglets.map(({ genre, libelle, Icone }) => {
          const actif = onglet === genre;
          return (
            <button
              key={genre}
              type="button"
              role="tab"
              aria-selected={actif}
              aria-label={libelle}
              onClick={() => setOnglet(genre)}
              className="flex h-11 w-14 items-center justify-center rounded-full border transition-[transform,background-color,color] active:scale-95"
              style={{
                borderColor: actif ? "var(--bb-encre)" : "var(--bb-trait-fort)",
                backgroundColor: actif ? "var(--bb-encre)" : "var(--bb-fond)",
                color: actif ? "var(--bb-fond)" : "var(--bb-encre)",
              }}
            >
              <Icone size={20} />
            </button>
          );
        })}
      </div>

      {visuels.length === 0 ? (
        <motion.div key={onglet} initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ duration: 0.3 }} className="flex justify-center py-6">
          <Heart size={40} />
        </motion.div>
      ) : (
        <RangeesVisuelsBambara
          idTour="gardes"
          visuels={visuels}
          idEnLecture={idEnLecture}
          surChangerLecture={surChangerLecture}
          libelleLire={libelleLire}
          libelleFermerVideo={libelleFermerVideo}
          libelleOuvrirImage={libelleOuvrirImage}
          garde={garde}
        />
      )}
    </div>
  );
}
