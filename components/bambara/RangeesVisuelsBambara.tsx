"use client";

// Page bambara (18/11/2026, demande de Bourama) : ce que l'IA a trouvé, montré comme une pellicule.
// Refonte du 18/11/2026 (demande de Bourama) : plus de défilement de gauche à droite, plus une photo par
// ligne : les images forment une planche de 3 vignettes par ligne (4 sur grand écran) qui passe à la ligne
// et descend avec la conversation, puis les vidéos forment leur propre planche, sous le texte de la
// réponse. Chaque demande ajoute sa planche après la précédente. Une seule vidéo se lit à la fois : en lancer une ferme la
// précédente (même principe que CartesVideosBulle.tsx), y compris d'un tour de la conversation à l'autre :
// c'est la page qui garde la vidéo en lecture (`idEnLecture`). Une image touchée s'agrandit en plein écran
// avec le visionneur du chat (VisionneuseImage.tsx : flèches, balayage, fermeture).

import { AnimatePresence } from "framer-motion";
import { useState } from "react";
import { VisionneuseImage } from "@/components/chat/VisionneuseImage";
import type { VisuelBambara } from "@/lib/pageBambaraVisuels";
import type { GardeUiBambara } from "./BoutonCoeurBambara";
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
  /** Le cœur pour garder chaque vidéo et image, quand la page le propose. */
  garde?: GardeUiBambara;
};

// Mise à jour du 22/11/2026 (demande de Bourama, « comme chez Google ») : les images forment des rangées de hauteur
// égale et de largeurs différentes, d'après la forme de chaque photo (.bb-rangees-images dans bambara.css, calcul dans
// rangeesImages.ts), comme Google Images. Les vidéos sont en grille de 2 colonnes (3 sur grand écran), au format
// vidéo. Aucune barre de défilement horizontale. Une vidéo en lecture prend toute la largeur de la ligne (voir
// CarteVisuelBambara.tsx).
const CLASSE_RANGEES_IMAGES = "bb-rangees-images w-full";
const CLASSE_PLANCHE_VIDEOS = "grid w-full grid-cols-2 gap-2 lg:grid-cols-3";

export function RangeesVisuelsBambara({ idTour, visuels, idEnLecture, surChangerLecture, libelleLire, libelleFermerVideo, libelleOuvrirImage, garde }: Props) {
  const [indexImage, setIndexImage] = useState<number | null>(null);

  const images = visuels.filter((v) => v.genre === "image");
  const videos = visuels.filter((v) => v.genre === "video");

  if (!images.length && !videos.length) return null;

  return (
    <div className="flex w-full flex-col gap-3">
      {images.length > 0 && (
        <div className={CLASSE_RANGEES_IMAGES}>
          <AnimatePresence initial={false}>
            {images.map((visuel, index) => (
              <CarteImageBambara key={visuel.id} visuel={visuel} surOuvrir={() => setIndexImage(index)} libelleOuvrir={libelleOuvrirImage} garde={garde} />
            ))}
          </AnimatePresence>
        </div>
      )}
      {videos.length > 0 && (
        <div className={CLASSE_PLANCHE_VIDEOS}>
          <AnimatePresence initial={false}>
            {videos.map((visuel) => (
              <CarteVideoBambara
                key={visuel.id}
                visuel={visuel}
                enLecture={idEnLecture === idTour + ":" + visuel.id}
                surLire={() => surChangerLecture(idTour + ":" + visuel.id)}
                surFermer={() => surChangerLecture(null)}
                libelleLire={libelleLire}
                libelleFermer={libelleFermerVideo}
                garde={garde}
              />
            ))}
          </AnimatePresence>
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
