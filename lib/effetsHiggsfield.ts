// Catalogue des effets Higgsfield affiches dans la grande page /higgsfield.
// V1 : 3 effets dont Genjutsu (demande Bourama). Chaque effet pointe vers un modele backend deja operationnel.
// V2 : brancher les 50+ effets API (meme mapping, meme UI).
export type TypeEffet = "image" | "image-to-video" | "video-to-video" | "avatar";
export type StyleEffet = "realiste" | "anime" | "cinematique" | "viral";
export type EffetHiggsfield = {
  id: string;
  nom: string;
  description: string;
  type: TypeEffet;
  style: StyleEffet;
  modele: "seedance" | "kling" | "grok";
  preview: string;
  promptChat: string;
  badge?: string;
};
export const EFFETS_HIGGSFIELD: EffetHiggsfield[] = [
  {
    id: "genjutsu",
    nom: "Genjutsu",
    description: "Effet viral TikTok — regard hypnotique, transition illusoire",
    type: "video-to-video",
    style: "viral",
    modele: "seedance",
    preview: "/previews/genjutsu.jpg",
    promptChat: "Applique l'effet Genjutsu sur ma video : regard hypnotique avec transition illusoire style Naruto",
    badge: "Viral",
  },
  {
    id: "soul-portrait",
    nom: "Soul Portrait",
    description: "Anime ton portrait — regard vivant, micro-mouvements naturels",
    type: "image-to-video",
    style: "realiste",
    modele: "kling",
    preview: "/previews/soul-portrait.jpg",
    promptChat: "Anime ce portrait avec des micro-mouvements naturels et un regard vivant (Soul Portrait)",
  },
  {
    id: "cinematic-style",
    nom: "Cinematic Style",
    description: "Transforme ton image en scene de film — lumiere et grain cinema",
    type: "image",
    style: "cinematique",
    modele: "grok",
    preview: "/previews/cinematic-style.jpg",
    promptChat: "Transforme cette image en scene cinematique avec lumiere de film et grain subtil",
  },
];
export const TYPES_EFFET: { value: TypeEffet | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "image", label: "Image" },
  { value: "image-to-video", label: "Image → Video" },
  { value: "video-to-video", label: "Video → Video" },
  { value: "avatar", label: "Avatar" },
];
export const STYLES_EFFET: { value: StyleEffet | "tous"; label: string }[] = [
  { value: "tous", label: "Tous les styles" },
  { value: "realiste", label: "Realiste" },
  { value: "anime", label: "Anime" },
  { value: "cinematique", label: "Cinematique" },
  { value: "viral", label: "Viral" },
];
