"use client";

// Page bambara (18/11/2026, demande de Bourama) : ce que l'IA a trouvé, montré comme dans le chat. Les
// images forment une rangée et les vidéos une autre rangée, chacune petite et défilante de gauche à
// droite, sous le texte de la réponse. Une seule vidéo se lit à la fois : en lancer une ferme la
// précédente (même principe que CartesVideosBulle.tsx), y compris d'un tour de la conversation à l'autre :
// c'est la page qui garde la vidéo en lecture (`idEnLecture`). Une image touchée s'agrandit en plein écran
// avec le visionneur du chat (VisionneuseImage.tsx : flèches, balayage, fermeture).

import { useState } from "react";
import { VisionneuseImage } from "@/components/chat/VisionneuseImage";
import type { VisuelBambara } from "@/lib/pageBambaraVisuels";
import { CarteImageBambara, CarteVideoBambara } from "./CarteVisuelBambara";

type Props = {
  /** Tour de la conversation auquel appartiennent ces visuels : sert à distinguer deux fois la même vidéo. */
  idTour: string;
  visuels: VisuelBambara[];
  idEnLecture: string | null;
  surChangerLecture: (id: string | null) => void;
  libelleLire: string;
  libelleFermerVideo: string;
  libelleOuvrirImage: string;
};

// Les rangées sortent des marges de la page (-mx-4 puis px-4) pour que le défilement aille jusqu'au bord de l'écran.
const CLASSE_RANGEE = "-mx-4 flex w-auto snap-x gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1";

export function RangeesVisuelsBambara({ idTour, visuels, idEnLecture, surChangerLecture, libelleLire, libelleFermerVideo, libelleOuvrirImage }: Props) {
  const [indexImage, setIndexImage] = useState<number | null>(null);

  const images = visuels.filter((v) => v.genre === "image");
  const videos = visuels.filter((v) => v.genre === "video");

  if (!images.length && !videos.length) return null;

  return (
    <div className="flex w-full flex-col gap-3">
      {images.length > 0 && (
        <div className={CLASSE_RANGEE}>
          {images.map((visuel, index) => (
            <CarteImageBambara key={visuel.id} visuel={visuel} surOuvrir={() => setIndexImage(index)} libelleOuvrir={libelleOuvrirImage} />
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <div className={CLASSE_RANGEE}>
          {videos.map((visuel) => (
            <CarteVideoBambara
              key={visuel.id}
              visuel={visuel}
              enLecture={idEnLecture === idTour + ":" + visuel.id}
              surLire={() => surChangerLecture(idTour + ":" + visuel.id)}
              surFermer={() => surChangerLecture(null)}
              libelleLire={libelleLire}
              libelleFermer={libelleFermerVideo}
            />
          ))}
        </div>
      )}
      {indexImage !== null && images[indexImage] && (
        <VisionneuseImage
          src={images[indexImage].url}
          alt={images[indexImage].titre}
          onFermer={() => setIndexImage(null)}
          liste={images.map((i) => ({ src: i.url, alt: i.titre }))}
          indexInitial={indexImage}
        />
      )}
    </div>
  );
}
