// Catalogue des effets Higgsfield affiches dans la grande page /higgsfield.
// URLs CDN = celles servies par higgsfield.ai/effects (cdn.higgsfield.ai) — rien d'invente.
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
  previewType?: "image" | "video";
  poster?: string;
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
    preview: "https://static.higgsfield.ai/gpt-astra/use-cases/exploded-engine-showcase-20260907/exploded-engine-showcase.mp4",
    previewType: "video",
    poster: "https://cdn.higgsfield.ai/viral_hub/4421b2a7-66f8-474d-9019-da309ab8fd37.webp",
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
    preview: "https://cdn.higgsfield.ai/viral_hub/05201733-c72f-43ed-8393-8b8cea28b8ce.webp",
    previewType: "image",
    promptChat: "Anime ce portrait avec des micro-mouvements naturels et un regard vivant (Soul Portrait)",
  },
  {
    id: "cinematic-style",
    nom: "Cinematic Style",
    description: "Transforme ton image en scene de film — lumiere et grain cinema",
    type: "image",
    style: "cinematique",
    modele: "grok",
    preview: "https://cdn.higgsfield.ai/mixed_media_preset/08178a2a-f0bf-4f95-b5ae-8e48fc8015e0.webp",
    previewType: "image",
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
