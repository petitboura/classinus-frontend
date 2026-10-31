// Catalogue Higgsfield affiche dans la grande page /higgsfield.
// Source : MCP Higgsfield connecte (get_presets genjutsu / viral / soul), recupere le 31/10/2026.
// Aucune URL inventee : preview et poster sont les preview_url / thumbnail_url renvoyes par Higgsfield.
export type TypeEffet = "image" | "image-to-video" | "video-to-video" | "avatar";
export type StyleEffet = "realiste" | "anime" | "cinematique" | "viral";
export type EffetHiggsfield = {
  id: string;
  nom: string;
  description: string;
  type: TypeEffet;
  style: StyleEffet;
  modele: string;
  preview: string;
  previewType?: "image" | "video";
  poster?: string;
  promptChat: string;
  badge?: string;
};

const G = "https://cdn.higgsfield.ai/genjutsu/preview/genjutsu-h264-600-v1/";
const P = "https://cdn.higgsfield.ai/higgsfield_multiplier_video_explore_variant/";
const V = "https://cdn.higgsfield.ai/viral_hub/";

function genjutsu(id: string, nom: string, preview: string, poster: string | undefined, modele: string): EffetHiggsfield {
  return {
    id: "genjutsu-" + id,
    nom: "Genjutsu · " + nom,
    description: modele === "hf_mult_replace_object" ? "Genjutsu Higgsfield : remplace le sujet de la video par ton image" : "Genjutsu Higgsfield : transfere le mouvement de la video sur ton image",
    type: "video-to-video",
    style: "viral",
    modele,
    preview,
    previewType: "video",
    poster,
    promptChat: "Applique l'effet Genjutsu \"" + nom + "\" : " + (modele === "hf_mult_replace_object" ? "remplace le sujet de ma video par le personnage de mon image de reference" : "transfere le mouvement de ma video de reference sur mon image") + " (modele Higgsfield " + modele + ")",
    badge: "Genjutsu",
  };
}

function viral(id: string, nom: string, description: string, preview: string, poster: string): EffetHiggsfield {
  return {
    id: "viral-" + id,
    nom,
    description,
    type: "video-to-video",
    style: "viral",
    modele: "higgsfield-viral",
    preview: V + preview,
    previewType: "video",
    poster: V + poster,
    promptChat: "Applique l'effet Higgsfield \"" + nom + "\" sur ma video : " + description,
    badge: "Viral",
  };
}

export const EFFETS_HIGGSFIELD: EffetHiggsfield[] = [
  genjutsu("countryside-duo", "Countryside Duo", G + "90d01517-46a5-467d-a37e-b2e18b401386.mp4", P + "54b6f52b-08b2-5acf-9557-2e599560acd8.webp", "hf_mult_replace_object"),
  genjutsu("orange-jacket", "Orange Jacket", G + "76933ec2-b002-4446-8713-180f60286ad7.mp4", P + "c045b52b-ab93-5d96-8e2b-72115697cb50.webp", "hf_mult_replace_object"),
  genjutsu("dance-duo", "Dance Duo", G + "91e73b88-b2e6-48cb-964c-e8e9cd208c3d.mp4", P + "9650072f-7ed8-5c91-bc2f-edc3a30ba02e.webp", "hf_mult_replace_object"),
  genjutsu("umbrella-transformation", "Umbrella Transformation", G + "f4031d7d-2d6a-4883-b1c4-1300b6e2611e.mp4", P + "e1db4f4b-3101-5151-91bf-a06be7a8a316.webp", "hf_mult_motion_control"),
  genjutsu("selfie-walk", "Selfie Walk", G + "7f762557-d6d2-456d-9041-d4972d7c3928.mp4", P + "1bc47dfd-2af0-509b-bd76-3896ec07bf3d.webp", "hf_mult_motion_control"),
  genjutsu("anime-times-square", "Anime Times Square", G + "cdf35c08-c873-4853-b752-bc2e347db74d.mp4", P + "067a9f92-94b2-5e63-accf-2c57fe1a0cdf.webp", "hf_mult_replace_object"),
  genjutsu("couple-recast", "Couple Recast", G + "fd9d42a8-2d1d-494f-8116-787f86aa21e6.mp4", P + "f0ad452c-2254-54cb-932e-d85d0b06dca7.webp", "hf_mult_replace_object"),
  genjutsu("magenta-routine", "Magenta Routine", G + "f1469b50-adf3-44a5-b9f2-fa974feb269a.mp4", P + "d34e684b-0ed7-50fa-befb-d550e7a43881.webp", "hf_mult_motion_control"),
  genjutsu("clone-recast", "Clone Recast", G + "06964c76-f916-46de-bdeb-b71cbd534404.mp4", P + "24daa737-06d4-530d-b2ff-18f0eeb2c289.webp", "hf_mult_motion_control"),
  genjutsu("desert-duo", "Desert Duo", G + "415c0af7-f119-4caa-8a75-f5f18ba930ce.mp4", P + "08edcef0-2205-5490-a4e3-014f32e77587.webp", "hf_mult_replace_object"),
  genjutsu("handbag-slide", "Handbag Slide", G + "c7ec54ee-5d28-443b-b739-7ae9eed1c6b0.mp4", P + "f32779dd-b4be-5f1d-ac1f-71f59b92d476.webp", "hf_mult_motion_control"),
  genjutsu("golden-gown", "Golden Gown", G + "b7b23650-16b2-4f6f-bebc-9fe02d89ade9.mp4", P + "167113f5-32ca-5c5f-ae3f-7f8e7599e964.webp", "hf_mult_replace_object"),
  genjutsu("patchwork-runway", "Patchwork Runway", G + "717aa444-7588-4e7a-b36c-22811309da25.mp4", P + "80918ab3-d0cf-5c86-af99-29d53184edf0.webp", "hf_mult_motion_control"),
  genjutsu("pink-street-runway", "Pink Street Runway", G + "c72a39c1-324d-443e-af18-5e940520e63a.mp4", P + "33ab59ac-cee3-57eb-95ce-5e754de9f021.webp", "hf_mult_motion_control"),
  genjutsu("toronto-recast", "Toronto Recast", G + "f26996f6-73d4-44b0-a91c-1d0f01b20c14.mp4", P + "06aaeffd-33c0-5add-a61c-eacf299154fa.webp", "hf_mult_replace_object"),
  genjutsu("cat-performer", "Cat Performer", G + "0d5ccefc-4f1b-4d09-bc37-84a70dad123a.mp4", P + "a3177c9f-c068-54bb-96b2-abc85054ef9b.webp", "hf_mult_motion_control"),
  genjutsu("playroom-recast", "Playroom Recast", G + "bc744e57-b2a6-45fb-bf26-bd72c3d523bb.mp4", P + "56475b81-bfc4-5cf1-ace4-902c5c0797e3.webp", "hf_mult_replace_object"),
  genjutsu("streetwear-recast", "Streetwear Recast", G + "dfdb144c-de5e-47e8-b1d8-c50ca69dedca.mp4", P + "03252833-d6bb-5a61-95df-a199d9fe2a5d.webp", "hf_mult_replace_object"),
  genjutsu("urban-motion", "Urban Motion", G + "5c33ea0b-81e0-4e9e-9138-87a648d35ad9.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/01/edit/c2394654-9775-4512-af95-d60250cfaabf.webp", "hf_mult_motion_control"),
  genjutsu("multi-scene-recast", "Multi-Scene Recast", "https://d8j0ntlcm91z4.cloudfront.net/community-presets/1eab1a56-2e44-4bb6-bf9a-af78e243b4eb/generation-genjutsu-h264-600-v1.mp4", P + "4a716a67-a71a-4496-9df6-d6d337b996d1.webp", "hf_mult_motion_control"),
  genjutsu("diner-recast", "Diner Recast", "https://d8j0ntlcm91z4.cloudfront.net/community-presets/74137e06-a512-4804-a00a-d4df696662a1/generation-genjutsu-h264-600-v1.mp4", P + "cd4a1d48-8b82-41a5-9df0-532e5e32c170.webp", "hf_mult_motion_control"),
  genjutsu("character-recast", "Character Recast", G + "f47db038-5bb2-4219-9ae5-840f48747e64.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/03/edit/27ee6ea4-78ab-445f-b5c0-15083c969a95.webp", "hf_mult_motion_control"),
  genjutsu("scene-recast", "Scene Recast", G + "9c8a1d33-12e1-4fbd-a799-7cfe121f06b9.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/04/edit/29cd2db0-0173-4e02-a0a0-9f3cf98f6934.webp", "hf_mult_motion_control"),
  genjutsu("house-on-fire", "House on Fire", G + "a410e77e-126a-43a7-ac29-79290d169f81.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/06/edit/0f28d1e3-fc59-4990-a4c7-d20a8003f207.webp", "hf_mult_motion_control"),
  genjutsu("commercial-recast", "Commercial Recast", G + "0e4b5630-3231-4ba8-898d-567552d22344.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/07/edit/79ea82de-3cb9-437c-af71-a59c239873f2.webp", "hf_mult_motion_control"),
  genjutsu("infinite-zoom", "Infinite Zoom", G + "1a88da35-b73b-4822-9497-9436b331d532.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/08/edit/9c76dbd0-6ae5-4566-8c32-9c09c5a57186.webp", "hf_mult_motion_control"),
  genjutsu("ride-recast", "Ride Recast", G + "3f2e20d2-684b-4902-bd97-a7653d43b73a.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/09/edit/08e0eba9-4a81-410b-b65d-a55f55509d0a.webp", "hf_mult_motion_control"),
  genjutsu("world-shift", "World Shift", "https://d8j0ntlcm91z4.cloudfront.net/community-presets/4f0494b8-c06d-4c92-b5fb-c90a4474a06d/generation-genjutsu-h264-600-v1.mp4", "https://cdn.higgsfield.ai/user_3HBBqUL3N7zkGsMu9UdbSI5yqe4/hf_20260829_231228_7f44830d-46b4-409b-b017-29768875ed93_thumbnail.webp", "hf_mult_motion_control"),
  genjutsu("fight-recast", "Fight Recast", G + "8e919928-0027-4ba1-8ceb-e8b23dd83a44.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/11/edit/58825ba0-5778-4402-80af-b8c1bc71db2b.webp", "hf_mult_motion_control"),
  genjutsu("cats-in-motion", "Cats in Motion", G + "2f1cfbbc-13c0-42fe-ba99-0a23b68c9177.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/12/edit/8a402c2d-0963-4434-b6a7-3ea5d14d39b7.webp", "hf_mult_motion_control"),
  genjutsu("waiter-recast", "Waiter Recast", G + "28090a1f-5717-48b8-84af-01a67428e3d3.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/13/edit/2de540dc-8285-4a13-a59b-cd07f2820294.webp", "hf_mult_motion_control"),
  genjutsu("outfit-swap", "Outfit Swap", G + "c77be113-e0ce-46be-bd4f-d3b7b886102d.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/14/edit/dc6576f8-5e6e-4eba-8841-cb51ad6193f0.webp", "hf_mult_motion_control"),
  genjutsu("parkour-flow", "Parkour Flow", G + "1fe2bb91-3821-4d9e-a2c3-02640a8792d6.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/15/edit/8a112815-9349-47ee-8035-7ef6352eb4ad.webp", "hf_mult_motion_control"),
  genjutsu("fantasy-rider", "Fantasy Rider", "https://d8j0ntlcm91z4.cloudfront.net/community-presets/772b02e5-1f26-4ae7-8957-30c9fd17eb18/generation-genjutsu-h264-600-v1.mp4", P + "f3188f06-018f-436f-a7b6-c77f449e0b34.webp", "hf_mult_motion_control"),
  genjutsu("street-flow", "Street Flow", G + "dfd17324-1b04-4956-bced-7ec3bacc5c1d.mp4", "https://cdn.higgsfield.ai/genjutsu/video-explore/02/edit/9445ce67-4691-477c-ba27-f2dd7d9eafee.webp", "hf_mult_motion_control"),
  viral("floating-fall", "Floating fall", "Tombe en arriere pendant que ses affaires flottent dans les airs", "d877f71c-d2f3-44df-9317-f3ce6889bcb6.mp4", "151664fa-7f7f-43d6-80fa-4683104a3c02.webp"),
  viral("vanish", "Vanish", "Le corps disparait instantanement, les vetements tombent au sol", "d63d47dd-d00f-42c8-9c45-9bddd3df7a38.mp4", "a9944d26-47dc-463f-b4d6-446c371ae2f7.webp"),
  viral("eyes-in", "Eyes in", "La camera plonge dans l'oeil et traverse la pupille vers une autre scene", "dba03734-6e8a-4337-acb4-17ce943563d8.mp4", "5354ce11-c68c-45a0-8a97-5aab94f52833.webp"),
  viral("cutout", "Cutout", "Le decor se decoupe en couches flottantes autour du sujet", "a64711ac-93b8-46ee-a9ce-37ee5c18e148.mp4", "b5c90864-c3c5-4b14-87a0-3739250fd00b.webp"),
  viral("wild-ride", "Wild ride", "Orbite camera rapide et dynamique autour du sujet en mouvement", "8cd9e3fc-8e4f-4071-abff-8934f3381507.mp4", "99aa3365-5ae0-4616-9722-ce0dc087607d.webp"),
  viral("clones", "Clones", "Des clones identiques apparaissent et imitent le sujet", "9cedf121-64a9-4eb9-88e9-608844ff1929.mp4", "e56a428d-6795-49f2-a456-6457ce90b346.webp"),
  viral("infinite-clones", "Infinite clones", "Des clones sortent en continu d'une petite voiture", "04df3d28-67de-464a-9426-55568d4ee55c.mp4", "a54ccc43-8866-4b56-89ba-35f199ab977f.webp"),
  viral("act-natural", "Act natural", "Le sujet se fige en pleine action pendant que le monde continue", "7a261cff-8d6c-4bab-84e7-515364061f3e.mp4", "17cc1333-9822-442c-adaa-d208c59e3e01.webp"),
  viral("studio-slide", "Studio slide", "Plusieurs copies du sujet glissent dans le meme cadre a differentes echelles", "c129fb83-2014-4a37-a3f8-6c7dfeab0254.mp4", "05201733-c72f-43ed-8393-8b8cea28b8ce.webp"),
  viral("high-flip", "High flip", "La camera passe au-dessus et revele un nouveau personnage et lieu", "001156a7-cfdb-4e16-8f13-68c246ddc06c.mp4", "95cd0d73-4f3c-40d1-ac0b-c8668a99440b.webp"),
  viral("melting", "Melting", "Le sujet fond lentement en flaque brillante", "f661157c-af00-46f7-8b7c-6a7ae711ef98.mp4", "6ecca888-1780-46ae-a86d-a05b69b2fe34.webp"),
  viral("frozen-in-motion", "Frozen in motion", "Le sujet se fige en l'air pendant que la rue continue de bouger", "59c46689-f756-4843-b298-f34b9761187e.mp4", "4bd4d456-d335-42da-b6ca-d0d8b8dffcea.webp"),
  {
    id: "soul-general",
    nom: "Soul · General",
    description: "Style Soul 2.0 Higgsfield : portrait photo general, rendu naturel",
    type: "image",
    style: "realiste",
    modele: "soul_2",
    preview: "https://cdn.higgsfield.ai/soul-v2-style/f33d85f2-6521-4fa8-8e8f-894cfbdee578.webp",
    previewType: "image",
    promptChat: "Genere un portrait avec le style Soul \"General\" de Higgsfield (modele soul_2, style_id 3db34ab5-3439-4317-9e03-08dc30852e69)",
    badge: "Soul",
  },
  {
    id: "soul-warm-ambient",
    nom: "Soul · Warm ambient",
    description: "Style Soul 2.0 Higgsfield : lumiere ambiante chaude",
    type: "image",
    style: "realiste",
    modele: "soul_2",
    preview: "https://cdn.higgsfield.ai/soul-v2-style/18e79fc7-3ce8-499b-a129-2daba3165707.webp",
    previewType: "image",
    promptChat: "Genere un portrait avec le style Soul \"Warm ambient\" de Higgsfield (modele soul_2, style_id fafd3087-0d0f-4fb1-9af6-91b7d304687c)",
    badge: "Soul",
  },
  {
    id: "soul-y2k-studio",
    nom: "Soul · Y2K studio",
    description: "Style Soul 2.0 Higgsfield : studio Y2K",
    type: "image",
    style: "realiste",
    modele: "soul_2",
    preview: "https://cdn.higgsfield.ai/soul-v2-style/c1d13313-1a78-4f55-acd3-125e789d202f.webp",
    previewType: "image",
    promptChat: "Genere un portrait avec le style Soul \"Y2K studio\" de Higgsfield (modele soul_2, style_id 7ee16ff3-c0b0-4f5f-a0e1-e7fc46144230)",
    badge: "Soul",
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
