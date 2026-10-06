"use client";

import { useState } from "react";
import { Play, X } from "lucide-react";

// Filet de sécurité des vidéos trouvées par l'outil rechercher_video : le
// modèle place normalement les liens lui même dans sa réponse (rendus en
// grandes cartes par LinkPreview.tsx). Ces cartes ne s'affichent que pour les
// vidéos qu'il a oublié de placer, sous le message, en une rangée où chaque
// carte garde sa taille et se fait défiler à gauche et à droite.
//
// Un clic sur une carte lance la lecture sur place, dans la carte elle même,
// avec le lecteur officiel de YouTube (même principe que LinkPreview.tsx pour
// un lien YouTube collé dans le chat, aucune sortie de l'application). Une
// seule vidéo se lit à la fois : lancer une autre carte ferme la précédente.
//
// "chaine" et "duree" peuvent être absentes (recherche de secours sans ces
// informations) : la carte s'affiche alors sans ces lignes, jamais vide.
export type VideoTrouvee = {
  titre: string;
  url: string;
  miniature?: string | null;
  chaine?: string | null;
  duree?: string | null;
  id_video?: string | null;
};

const MOTIF_ID_YOUTUBE = /(?:youtube\.com\/watch\?(?:[^#]*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/;

function idDeLaVideo(video: VideoTrouvee): string | null {
  if (video.id_video) return video.id_video;
  return video.url.match(MOTIF_ID_YOUTUBE)?.[1] ?? null;
}

function LecteurSurPlace({ idVideo, titre, onFermer }: { idVideo: string; titre: string; onFermer: () => void }) {
  return (
    <div className="relative aspect-video w-full animate-dj-fade-in-rapide overflow-hidden bg-black">
      <iframe
        src={`https://www.youtube.com/embed/${idVideo}?autoplay=1`}
        title={titre}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer la vidéo"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/90"
      >
        <X size={15} />
      </button>
    </div>
  );
}

export function CartesVideosBulle({ videos }: { videos?: VideoTrouvee[] }) {
  const [idEnLecture, setIdEnLecture] = useState<string | null>(null);

  const cartes = (videos ?? [])
    .map((video) => ({ video, id: idDeLaVideo(video) }))
    .filter((c): c is { video: VideoTrouvee; id: string } => c.id !== null);

  if (!cartes.length) return null;

  return (
    <div className="mt-1.5 flex w-full snap-x gap-3 overflow-x-auto overscroll-x-contain pb-1 animate-dj-fade-in-rapide">
      {cartes.map(({ video, id }) => {
        const enLecture = idEnLecture === id;
        const miniature = video.miniature || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        return (
          <div
            key={id}
            className="w-72 shrink-0 snap-start overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface sm:w-80"
          >
            {enLecture ? (
              <LecteurSurPlace idVideo={id} titre={video.titre} onFermer={() => setIdEnLecture(null)} />
            ) : (
              <button
                type="button"
                onClick={() => setIdEnLecture(id)}
                aria-label={`Lire la vidéo : ${video.titre}`}
                className="group relative block aspect-video w-full overflow-hidden bg-black"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={miniature}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors duration-200 group-hover:bg-black/25">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition-transform duration-200 group-hover:scale-110">
                    <Play size={18} fill="currentColor" />
                  </span>
                </span>
                {video.duree && (
                  <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-medium leading-none text-white">
                    {video.duree}
                  </span>
                )}
              </button>
            )}
            <div className="px-2.5 py-2">
              <p className="line-clamp-2 break-words text-sm font-medium leading-snug text-dj-texte">{video.titre}</p>
              {video.chaine && <p className="mt-0.5 truncate text-xs text-dj-texte-muet">{video.chaine}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
