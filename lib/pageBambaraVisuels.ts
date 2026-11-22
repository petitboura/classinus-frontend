// Page bambara (16/11/2026, demande de Bourama) : fonctions pures, sans React ni réseau, qui disent
// quoi montrer à l'écran. L'utilisateur ne sait ni lire ni écrire : seules des vidéos et des images
// sont montrées. C'est l'IA qui choisit lesquelles (19/11/2026, demande de Bourama) : les liens qu'elle
// écrit elle même dans sa réponse, et les fichiers qu'elle génère. Les listes d'images et de vidéos que
// le serveur envoie pendant une recherche ne sont jamais montrées d'office : elles servent seulement à
// compléter (miniature, titre) celles que l'IA cite.

import type { MessageAudioBambara } from "./audioMessageBambara";

export type VisuelBambara = {
  id: string;
  genre: "video" | "image";
  url: string;
  titre: string;
  miniature?: string | null;
  idVideo?: string | null;
};

const MOTIF_ID_YOUTUBE = /(?:youtube\.com\/watch\?(?:[^#\s]*&)?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([\w-]{11})/;
const MOTIF_IMAGE_MARKDOWN = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const MOTIF_URL = /https?:\/\/[^\s)\]>"'`]+/g;
const EXTENSIONS_IMAGE = /\.(png|jpe?g|gif|webp|avif|svg)(\?[^\s]*)?$/i;
const EXTENSIONS_VIDEO = /\.(mp4|webm|mov|m4v)(\?[^\s]*)?$/i;

export function idVideoYoutube(url: string): string | null {
  return url.match(MOTIF_ID_YOUTUBE)?.[1] ?? null;
}

/** Image ou vidéo d'après l'adresse d'un fichier, null si ce n'est ni l'une ni l'autre. */
export function genreDeFichier(url: string): "image" | "video" | null {
  if (EXTENSIONS_IMAGE.test(url)) return "image";
  if (EXTENSIONS_VIDEO.test(url)) return "video";
  return null;
}

export function miniatureYoutube(idVideo: string): string {
  return `https://i.ytimg.com/vi/${idVideo}/hqdefault.jpg`;
}

function visuelVideo(url: string, titre: string, miniature?: string | null, idFourni?: string | null): VisuelBambara {
  const idVideo = idFourni || idVideoYoutube(url);
  return {
    id: "video:" + (idVideo || url),
    genre: "video",
    url,
    titre,
    miniature: miniature || (idVideo ? miniatureYoutube(idVideo) : null),
    idVideo,
  };
}

function visuelImage(url: string, titre: string, miniature?: string | null): VisuelBambara {
  return { id: "image:" + url, genre: "image", url, titre, miniature: miniature || null };
}

/** Garde chaque visuel une seule fois (même vidéo ou même image), dans l'ordre d'arrivée. */
export function fusionnerVisuels(existants: VisuelBambara[], nouveaux: VisuelBambara[]): VisuelBambara[] {
  const vus = new Set(existants.map((v) => v.id));
  const resultat = [...existants];
  for (const visuel of nouveaux) {
    if (vus.has(visuel.id)) continue;
    vus.add(visuel.id);
    resultat.push(visuel);
  }
  return resultat;
}

/**
 * Un tour de la conversation (18/11/2026, demande de Bourama) : chaque demande s'ajoute à la suite des
 * précédentes au lieu de les effacer. `question` n'est remplie que pour une demande écrite (la personne
 * sait écrire dans ce cas) ; une demande parlée n'écrit aucun texte dans la bulle de la personne.
 */
export type TourBambara = {
  id: string;
  question: string;
  texte: string;
  visuels: VisuelBambara[];
  /** Ce que la personne a dit, réécoutable comme un message vocal (demande parlée seulement). */
  audioQuestion?: MessageAudioBambara | null;
  /** Ce que la voix de Classinus a lu, réécoutable comme un message vocal. */
  audioReponse?: MessageAudioBambara | null;
};

/** Le tour d'identifiant donné est remplacé par la version changée, les autres tours restent tels quels. */
export function modifierTour(tours: TourBambara[], idTour: string, changer: (tour: TourBambara) => TourBambara): TourBambara[] {
  return tours.map((tour) => (tour.id === idTour ? changer(tour) : tour));
}

/** Le tour d'identifiant donné disparaît, les autres restent tels quels. */
export function retirerTour(tours: TourBambara[], idTour: string): TourBambara[] {
  return tours.filter((tour) => tour.id !== idTour);
}

/** Les vidéos et images que l'IA a écrites dans sa réponse (image markdown, lien YouTube, fichier). */
export function extraireVisuelsDuTexte(texte: string): VisuelBambara[] {
  if (!texte) return [];
  const trouves: VisuelBambara[] = [];
  const dejaPris = new Set<string>();

  for (const m of texte.matchAll(MOTIF_IMAGE_MARKDOWN)) {
    dejaPris.add(m[2]);
    trouves.push(visuelImage(m[2], m[1] || ""));
  }
  for (const m of texte.matchAll(MOTIF_URL)) {
    const url = m[0].replace(/[.,;:!?]+$/, "");
    if (dejaPris.has(url)) continue;
    dejaPris.add(url);
    if (idVideoYoutube(url)) trouves.push(visuelVideo(url, ""));
    else if (genreDeFichier(url) === "video") trouves.push(visuelVideo(url, ""));
    else if (genreDeFichier(url) === "image") trouves.push(visuelImage(url, ""));
  }
  return fusionnerVisuels([], trouves);
}

type ImageServeur = { titre?: string; url: string; miniature?: string | null };
type VideoServeur = { titre?: string; url: string; miniature?: string | null; id_video?: string | null };

export function visuelsDepuisImages(images: ImageServeur[] | undefined): VisuelBambara[] {
  return (images ?? []).filter((i) => i?.url).map((i) => visuelImage(i.url, i.titre || "", i.miniature));
}

export function visuelsDepuisVideos(videos: VideoServeur[] | undefined): VisuelBambara[] {
  return (videos ?? []).filter((v) => v?.url).map((v) => visuelVideo(v.url, v.titre || "", v.miniature, v.id_video));
}

/** Les fichiers générés par un outil : seuls les images et vidéos sont montrés, le reste est ignoré. */
export function visuelsDepuisFichiers(fichiers: { url: string; nom?: string }[] | undefined): VisuelBambara[] {
  const resultat: VisuelBambara[] = [];
  for (const f of fichiers ?? []) {
    const genre = f?.url ? genreDeFichier(f.url) : null;
    if (genre === "image") resultat.push(visuelImage(f.url, f.nom || ""));
    else if (genre === "video") resultat.push(visuelVideo(f.url, f.nom || ""));
  }
  return resultat;
}

/**
 * Outils qui créent de vrais fichiers sur la page bambara (même liste que le serveur : core/outils_page_bambara.py,
 * OUTILS_GENERATION_VISUELLE). À compléter si le serveur en ajoute un.
 */
export const OUTILS_GENERATION_PAGE = ["generer_image"];

/**
 * Fichiers générés à montrer pour l'outil donné (19/11/2026, demande de Bourama : les miniatures de vidéos YouTube
 * s'affichaient toutes seules). Le serveur annonce comme « fichier généré » toute adresse d'image trouvée dans le résultat
 * d'un outil, donc aussi les miniatures et les images d'une recherche : ce n'est le choix de l'IA que pour un outil qui
 * crée vraiment l'image. Pour tout autre outil (recherche web, d'image, de vidéo, lecture de vidéo, mémoire) : rien.
 */
export function visuelsDepuisFichiersGeneres(nomOutil: string | undefined, fichiers: { url: string; nom?: string }[] | undefined): VisuelBambara[] {
  if (!nomOutil || !OUTILS_GENERATION_PAGE.includes(nomOutil)) return [];
  return visuelsDepuisFichiers(fichiers);
}

/**
 * Effet de construction à montrer pendant qu'un outil travaille (demande de Bourama : « un effet de
 * construire sous tes yeux », jamais une ligne avec icône et libellé). Mémoire et autres outils :
 * aucun effet, la bulle suffit.
 */
export type EffetConstruction = "images" | "videos" | "creation" | "recherche";

/**
 * Mise à jour du 22/11/2026 (demande de Bourama : l'effet de la recherche web, trois cases grises, n'avait aucun sens ;
 * deux effets ne s'affichaient jamais ensemble). La recherche web ne produit rien à regarder : elle montre donc une
 * loupe qui balaie la zone, avec des cercles qui s'élargissent, et non des cases qui promettraient des images.
 */
export function effetPourOutil(nomOutil: string | undefined | null): EffetConstruction | null {
  if (!nomOutil) return null;
  if (nomOutil === "generer_image") return "creation";
  if (nomOutil === "rechercher_image") return "images";
  if (nomOutil === "rechercher_video" || nomOutil === "lire_video") return "videos";
  if (nomOutil.startsWith("tavily_")) return "recherche";
  return null;
}

const ORDRE_EFFETS = ["creation", "videos", "images", "recherche"] as const;

/** Tous les effets des outils qui travaillent en même temps, dans l'ordre : création, vidéos, images, web. Chacun une seule fois. */
export function effetsActifs(nomsOutils: (string | undefined | null)[]): EffetConstruction[] {
  const effets = new Set(nomsOutils.map(effetPourOutil).filter((e): e is EffetConstruction => e !== null));
  return ORDRE_EFFETS.filter((e) => effets.has(e));
}

/**
 * Demande de Bourama du 22/11/2026 : l'effet ne disparaît plus dès que l'outil a fini, puis laisse un vide pendant que
 * l'IA écrit, puis fait surgir les résultats d'un coup. Un effet déjà montré reste jusqu'à ce que ce qu'il annonçait
 * soit là : les images (création ou recherche) quand une image est arrivée, les vidéos quand une vidéo est arrivée,
 * la recherche web quand la réponse commence. Les effets des outils encore en route restent toujours.
 * `gardes` : les effets déjà montrés pendant ce tour. `genres` : les genres de visuels arrivés dans ce tour.
 */
export function effetsAffiches(
  actifs: EffetConstruction[],
  gardes: EffetConstruction[],
  genres: ReadonlySet<string>,
  texteCommence: boolean
): EffetConstruction[] {
  const restes = gardes.filter((e) => {
    if (actifs.includes(e)) return false;
    if (e === "videos") return !genres.has("video");
    if (e === "recherche") return !texteCommence;
    return !genres.has("image");
  });
  const tous = new Set<EffetConstruction>([...actifs, ...restes]);
  return ORDRE_EFFETS.filter((e) => tous.has(e));
}
