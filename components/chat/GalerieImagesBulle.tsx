"use client";

import { useState } from "react";
import { VisionneuseImage } from "./VisionneuseImage";

// Galerie d'images affichée automatiquement par les outils qui renvoient une
// liste d'images (captures du navigateur, Higgsfield...), embarquée par
// OutilResultatBulle.tsx -- même principe que SourcesBulle.tsx (rendu "bête"
// d'une liste, pas de toggle propre), mais en grille de miniatures plutôt
// qu'en puces de texte, et TOUJOURS visible (pas besoin de déplier).
// Depuis le 08/11/2026 l'outil rechercher_image n'en fait plus partie : c'est
// le modèle qui choisit quelles images montrer et où, en les écrivant dans sa
// réponse (rendues par ImageMessage.tsx).
//
// Clic sur une image -> aperçu plein écran en app (VisionneuseImage.tsx) avec
// flèches, balayage, et téléchargement de l'image affichée.
type Image = { titre: string; url: string; miniature: string; credit?: string | null };

// 02/11/2026, décision de Bourama : cet élément s'affiche sans cadre (ni bordure ni fond de carte), le contenu repose directement sur le fond du chat. Ne jamais remettre de cadre sans que Bourama le demande.
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
          className="group relative h-44 w-56 shrink-0 overflow-hidden rounded-xl"
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
