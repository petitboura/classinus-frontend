// Vidéos et images trouvées par un outil que le modèle n'a PAS placées lui même
// dans sa réponse. Le modèle écrit les liens et les images où il veut ; ce qu'il
// oublie de placer s'affiche sous le message, une fois la réponse terminée, pour
// que l'utilisateur ne se retrouve jamais sans rien.

const MOTIF_ID_YOUTUBE = /(?:youtube\.com\/watch\?(?:[^#\s)]*&)?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{11})/g;

function idsYoutubeDuTexte(texte: string): Set<string> {
  const ids = new Set<string>();
  for (const m of texte.matchAll(MOTIF_ID_YOUTUBE)) ids.add(m[1]);
  return ids;
}

type VideoMinimale = { url: string; id_video?: string | null };
type ImageMinimale = { url: string; miniature: string };

export function videosNonPlacees<T extends VideoMinimale>(videos: T[] | undefined, texte: string, reponseTerminee: boolean): T[] | undefined {
  if (!videos || !videos.length) return videos;
  if (!reponseTerminee) return undefined;
  const ids = idsYoutubeDuTexte(texte);
  const restantes = videos.filter((v) => {
    const id = v.id_video || [...idsYoutubeDuTexte(v.url)][0];
    return !(id && ids.has(id));
  });
  return restantes.length ? restantes : undefined;
}

export function imagesNonPlacees<T extends ImageMinimale>(images: T[] | undefined, texte: string, reponseTerminee: boolean): T[] | undefined {
  if (!images || !images.length) return images;
  if (!reponseTerminee) return undefined;
  const restantes = images.filter((i) => !texte.includes(i.url) && !texte.includes(i.miniature));
  return restantes.length ? restantes : undefined;
}
