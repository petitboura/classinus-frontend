"use client";

import { useState } from "react";
import { VisionneuseImage } from "./VisionneuseImage";

// Galerie d'images trouvées par l'outil rechercher_image (01/09, demande
// Bourama), embarquée par OutilResultatBulle.tsx -- même principe que
// SourcesBulle.tsx (rendu "bête" d'une liste, pas de toggle propre),
// mais en grille de miniatures plutôt qu'en puces de texte, et TOUJOURS
// visible (pas besoin de déplier) : contrairement aux sources d'une
// recherche web, la galerie EST le résultat que l'utilisateur est venu
// chercher.
//
// Clic sur une image -> aperçu plein écran en app (VisionneuseImage.tsx) avec
// flèches, balayage, et téléchargement de l'image affichée.
type Image = { titre: string; url: string; miniature: string; credit?: string | null };

export function GalerieImagesBulle({ images }: { images?: Image[] }) {
  const [indexOuvert, setIndexOuvert] = useState<number | null>(null);
  if (!images || !images.length) return null;

  return (
    <>
    <div className="mt-1.5 flex w-full gap-2 overflow-x-auto overscroll-x-contain pb-1">
      {images.map((image, index) => (
        <button
          key={image.url + index}
          type="button"
          onClick={() => setIndexOuvert(index)}
          title={image.credit ? `${image.titre} · ${image.credit}` : image.titre}
          className="group relative h-44 w-56 shrink-0 overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- image
              externe (Pixabay/Pexels), pas un asset local optimisable par
              next/image */}
          <img
            src={image.miniature}
            alt={image.titre}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </button>
      ))}
    </div>
    {indexOuvert !== null && (
      <VisionneuseImage
        src={images[indexOuvert].url}
        alt={images[indexOuvert].titre}
        onFermer={() => setIndexOuvert(null)}
        liste={images.map((i) => ({ src: i.url, alt: i.titre }))}
        indexInitial={indexOuvert}
      />
    )}
    </>
  );
}
