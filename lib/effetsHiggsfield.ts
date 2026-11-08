// Catalogue Higgsfield affiche dans la grande page /higgsfield.
// Source : MCP Higgsfield connecte (get_presets genjutsu / viral / soul), recupere le 31/10/2026.
// Aucune URL inventee : preview et poster sont les preview_url / thumbnail_url renvoyes par Higgsfield.
import type { Locale } from "@/lib/i18n/locale";

export type TypeEffet = "image" | "image-to-video" | "video-to-video" | "avatar";
export type StyleEffet = "realiste" | "anime" | "cinematique" | "viral";
export type EffetHiggsfield = {
  id: string;
  nom: string;
  description: string;
  // Version anglaise obligatoire : tout texte visible existe dans les deux langues.
  descriptionEn: string;
  type: TypeEffet;
  style: StyleEffet;
  modele: string;
  preview: string;
  previewType?: "image" | "video";
  poster?: string;
  // Identifiant du style Higgsfield (Soul seulement). Il part vraiment au modele.
  styleId?: string;
  // Texte propose au depart dans le champ de description. Ce qui reste dans le champ est ce qui part.
  promptInitial?: string;
  promptInitialEn?: string;
  badge?: string;
  libelleType?: string;
};

const G = "https://cdn.higgsfield.ai/genjutsu/preview/genjutsu-h264-600-v1/";
const P = "https://cdn.higgsfield.ai/higgsfield_multiplier_video_explore_variant/";
const V = "https://cdn.higgsfield.ai/viral_hub/";

function genjutsu(id: string, nom: string, preview: string, poster: string | undefined, modele: string): EffetHiggsfield {
  return {
    id: "genjutsu-" + id,
    nom: "Genjutsu · " + nom,
    description: modele === "hf_mult_replace_object" ? "Change un élément de ta vidéo (personnage, tenue, objet ou lieu) et garde tout le reste." : "Garde les gestes, la caméra et le rythme de ta vidéo, et refait la scène à partir de tes images.",
    descriptionEn: modele === "hf_mult_replace_object" ? "Changes one element of your video (character, outfit, object or place) and keeps everything else." : "Keeps the gestures, the camera and the rhythm of your video, and rebuilds the scene from your images.",
    type: "video-to-video",
    style: "viral",
    modele,
    preview,
    previewType: "video",
    poster,
    badge: "Genjutsu",
  };
}

function viral(id: string, nom: string, description: string, descriptionEn: string, preview: string, poster: string): EffetHiggsfield {
  return {
    id: "viral-" + id,
    nom,
    description,
    descriptionEn,
    type: "video-to-video",
    style: "viral",
    modele: "higgsfield-viral",
    preview: V + preview,
    previewType: "video",
    poster: V + poster,
    promptInitial: description,
    promptInitialEn: descriptionEn,
    badge: "Viral",
  };
}

const SOUL = "https://cdn.higgsfield.ai/soul-v2-style/";

function soul(id: string, nom: string, apercu: string, styleId: string, description: string, descriptionEn: string): EffetHiggsfield {
  return {
    id: "soul-" + id,
    nom: "Soul · " + nom,
    description: "Style Soul 2.0 : " + description,
    descriptionEn: "Soul 2.0 style: " + descriptionEn,
    type: "image",
    style: "realiste",
    modele: "soul_2",
    preview: SOUL + apercu + ".webp",
    previewType: "image",
    styleId,
    badge: "Soul",
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
  viral("floating-fall", "Floating fall", "Tombe en arrière pendant que ses affaires flottent dans les airs", "Falls backward while their belongings float in the air", "d877f71c-d2f3-44df-9317-f3ce6889bcb6.mp4", "151664fa-7f7f-43d6-80fa-4683104a3c02.webp"),
  viral("vanish", "Vanish", "Le corps disparaît instantanément, les vêtements tombent au sol", "The body vanishes instantly, the clothes drop to the ground", "d63d47dd-d00f-42c8-9c45-9bddd3df7a38.mp4", "a9944d26-47dc-463f-b4d6-446c371ae2f7.webp"),
  viral("eyes-in", "Eyes in", "La caméra plonge dans l'œil et traverse la pupille vers une autre scène", "The camera dives into the eye and passes through the pupil into another scene", "dba03734-6e8a-4337-acb4-17ce943563d8.mp4", "5354ce11-c68c-45a0-8a97-5aab94f52833.webp"),
  viral("cutout", "Cutout", "Le décor se découpe en couches flottantes autour du sujet", "The set cuts into floating layers around the subject", "a64711ac-93b8-46ee-a9ce-37ee5c18e148.mp4", "b5c90864-c3c5-4b14-87a0-3739250fd00b.webp"),
  viral("wild-ride", "Wild ride", "Orbite caméra rapide et dynamique autour du sujet en mouvement", "Fast, dynamic camera orbit around the moving subject", "8cd9e3fc-8e4f-4071-abff-8934f3381507.mp4", "99aa3365-5ae0-4616-9722-ce0dc087607d.webp"),
  viral("clones", "Clones", "Des clones identiques apparaissent et imitent le sujet", "Identical clones appear and mimic the subject", "9cedf121-64a9-4eb9-88e9-608844ff1929.mp4", "e56a428d-6795-49f2-a456-6457ce90b346.webp"),
  viral("infinite-clones", "Infinite clones", "Des clones sortent en continu d'une petite voiture", "Clones keep coming out of a small car", "04df3d28-67de-464a-9426-55568d4ee55c.mp4", "a54ccc43-8866-4b56-89ba-35f199ab977f.webp"),
  viral("act-natural", "Act natural", "Le sujet se fige en pleine action pendant que le monde continue", "The subject freezes mid action while the world keeps moving", "7a261cff-8d6c-4bab-84e7-515364061f3e.mp4", "17cc1333-9822-442c-adaa-d208c59e3e01.webp"),
  viral("studio-slide", "Studio slide", "Plusieurs copies du sujet glissent dans le même cadre à différentes échelles", "Several copies of the subject slide through the same frame at different scales", "c129fb83-2014-4a37-a3f8-6c7dfeab0254.mp4", "05201733-c72f-43ed-8393-8b8cea28b8ce.webp"),
  viral("high-flip", "High flip", "La caméra passe au-dessus et révèle un nouveau personnage et lieu", "The camera flies over and reveals a new character and place", "001156a7-cfdb-4e16-8f13-68c246ddc06c.mp4", "95cd0d73-4f3c-40d1-ac0b-c8668a99440b.webp"),
  viral("melting", "Melting", "Le sujet fond lentement en flaque brillante", "The subject slowly melts into a shiny puddle", "f661157c-af00-46f7-8b7c-6a7ae711ef98.mp4", "6ecca888-1780-46ae-a86d-a05b69b2fe34.webp"),
  viral("frozen-in-motion", "Frozen in motion", "Le sujet se fige en l'air pendant que la rue continue de bouger", "The subject freezes in mid air while the street keeps moving", "59c46689-f756-4843-b298-f34b9761187e.mp4", "4bd4d456-d335-42da-b6ca-d0d8b8dffcea.webp"),
  {
    id: "soul-general",
    nom: "Soul · General",
    description: "Style Soul 2.0 : portrait photo général, rendu naturel",
    descriptionEn: "Soul 2.0 style: general photo portrait, natural look",
    type: "image",
    style: "realiste",
    modele: "soul_2",
    preview: "https://cdn.higgsfield.ai/soul-v2-style/f33d85f2-6521-4fa8-8e8f-894cfbdee578.webp",
    previewType: "image",
    styleId: "3db34ab5-3439-4317-9e03-08dc30852e69",
    badge: "Soul",
  },
  {
    id: "soul-warm-ambient",
    nom: "Soul · Warm ambient",
    description: "Style Soul 2.0 : lumière ambiante chaude",
    descriptionEn: "Soul 2.0 style: warm ambient light",
    type: "image",
    style: "realiste",
    modele: "soul_2",
    preview: "https://cdn.higgsfield.ai/soul-v2-style/18e79fc7-3ce8-499b-a129-2daba3165707.webp",
    previewType: "image",
    styleId: "fafd3087-0d0f-4fb1-9af6-91b7d304687c",
    badge: "Soul",
  },
  {
    id: "soul-y2k-studio",
    nom: "Soul · Y2K studio",
    description: "Style Soul 2.0 : studio Y2K",
    descriptionEn: "Soul 2.0 style: Y2K studio",
    type: "image",
    style: "realiste",
    modele: "soul_2",
    preview: "https://cdn.higgsfield.ai/soul-v2-style/c1d13313-1a78-4f55-acd3-125e789d202f.webp",
    previewType: "image",
    styleId: "7ee16ff3-c0b0-4f5f-a0e1-e7fc46144230",
    badge: "Soul",
  },
  soul("swag-era", "Swag era", "35702530-c33b-4259-84c8-170c7d043882", "6dffca48-f9fe-43f2-8589-da58a172fa3e", "ambiance streetwear, allure assurée", "streetwear mood, confident attitude"),
  soul("theatrical-light", "Theatrical light", "2a79c49e-29cd-46b3-b60e-d6eed72b40ec", "7876c2a5-aa83-4530-ad09-2b368bbb5e95", "lumière de scène, contrastes dramatiques", "stage lighting, dramatic contrast"),
  soul("y2k-street", "Y2K street", "1235a986-ef50-4920-9ca1-0a9e2dee1768", "d7e58c26-b74e-4a72-8c78-d061d600c9a5", "rue et mode des années 2000", "2000s street and fashion look"),
  soul("flash-editorial", "Flash editorial", "9f132343-278b-4fd1-b614-c11e07472cf5", "5e87c5bd-86b6-491a-94ab-046891d1e35e", "portrait de magazine au flash direct", "magazine portrait with direct flash"),
  soul("old-smartphone", "Old smartphone", "b7f45834-8736-4858-bba8-30029048e1e5", "a7cb654b-eba7-4e9b-af41-8eaa482bf7c9", "photo prise avec un vieux téléphone", "photo taken with an old smartphone"),
  soul("street-photography", "Street photography", "bf3defc5-e184-4a21-bf1f-cae4a66ace97", "95151de0-e0e5-4e04-bd45-c58c8a4ac023", "photographie de rue prise sur le vif", "candid street photography"),
  soul("retro-bw", "Retro BW", "efe5394f-d88b-4587-8417-d22f462af786", "069f5a5f-8c4b-4591-a3dd-bde488672228", "noir et blanc rétro", "retro black and white"),
  soul("asian-nostalgia", "Asian nostalgia", "ddda68b0-a93b-43c0-a26f-bf0b3e683469", "99716f25-c133-438a-829a-ec53258980b4", "ambiance nostalgique d'un souvenir asiatique", "nostalgic Asian memory mood"),
  soul("surreal-solarization", "Surreal solarization", "776961b9-336d-4234-b569-bdd57021ffcf", "26bb19d1-25cc-4455-9a80-522eb136a4de", "effet de solarisation surréaliste", "surreal solarization effect"),
  soul("subtle-flash", "Subtle flash", "2134d88a-8e98-4f4a-9477-19a59343bd2d", "e62e75c2-b1bb-433d-9192-f1196faed74e", "flash léger et discret", "soft, discreet flash"),
  soul("digital-camera", "Digital camera", "4663f0a8-7e42-405d-ab2d-2f0fdceb5246", "74abc530-cec8-4c13-88a6-2b3f78bfd0ff", "rendu d'appareil photo numérique compact", "compact digital camera look"),
  soul("siren", "Siren", "feec6fd0-995d-4491-adfe-12dc3a1abec1", "cfd92ced-4801-42c4-b8ca-e096a405ff1a", "portrait envoûtant, esprit sirène", "enchanting portrait, siren spirit"),
  soul("mystique-city", "Mystique city", "06fd4ff1-b3e0-4ad6-ad00-bb91d2268ca5", "d6371f60-a70c-4a43-9393-6e3d8206590c", "ville nocturne et mystérieuse", "mysterious night city"),
  soul("candy-pop", "Candy pop", "bd012736-2b24-40fd-84b8-d73b0d2ebee4", "cd55643f-812c-461d-9837-baa9a88dff2e", "couleurs bonbon, ambiance pop", "candy colors, pop mood"),
  soul("double-exposure", "Double exposure", "e4057886-2c14-4a51-998d-26fa24a9941c", "7a42d44e-0dab-4dd1-be49-c83fec827251", "double exposition, deux images superposées", "double exposure, two overlaid images"),
  soul("2000s-band", "2000s band", "254355c4-d976-46b0-b066-baa1cc6dc8a1", "330789e8-cb50-410c-a31f-b1ba10188176", "photo de groupe des années 2000", "2000s band photo"),
  soul("frutiger-aero", "Frutiger aero", "ea15a9bb-ef1d-49ce-8d49-fd311f6ea270", "599d96ce-be5b-4071-9ee0-5b3494f6c757", "esthétique Frutiger Aero, lumineuse et aquatique", "Frutiger Aero look, bright and aquatic"),
  soul("drain", "Drain", "4c796bd9-ee7e-476f-b588-083b3df529e1", "8261de31-258b-4a58-997c-b65bbd6d367f", "ambiance sombre et désaturée, style Drain", "dark, desaturated Drain style"),
  soul("extraterrestrial", "Extraterrestrial", "6938b497-ce2f-4d80-9760-00be2a2a3277", "82e55816-3b41-4f01-8500-d36f235e08e6", "look extraterrestre", "extraterrestrial look"),
  soul("editorial-street-style", "Editorial street style", "84b09184-9077-4f93-b4aa-1340f3641631", "3d5584b2-4d15-48d2-8a09-c1073259f4c6", "mode de rue façon éditorial", "editorial street fashion"),
  soul("nature-light", "Nature light", "f795f856-42c9-4f09-991f-ff3f5d1b7db4", "dbe816eb-c651-4361-aee3-9386f8372121", "lumière naturelle en extérieur", "natural outdoor light"),
  soul("new-indie", "New Indie", "200949a2-c394-468c-adbb-5a88a5b3105b", "184401c9-65d8-4d4b-b2e1-fd6a87a5b60c", "esthétique indie moderne", "modern indie aesthetic"),
  soul("underwater", "Underwater", "3b6c09ce-e318-4cf3-82ca-770b4e1f753d", "04022c41-6164-47d9-b33f-cf241f0b5e15", "portrait sous l'eau", "underwater portrait"),
  soul("80s-horror", "80s horror", "06e57621-847a-4a51-a10c-a607548a27e8", "313f3e05-0d79-4d2f-a56a-d9d289321fd8", "ambiance film d'horreur des années 80", "1980s horror movie mood"),
  soul("disposable-camera", "Disposable camera", "00e8d173-cf5e-45c4-8896-23af3d8d37ce", "7ef8747e-c925-4851-b9e9-6400ddb19df9", "rendu d'appareil jetable", "disposable camera look"),
  soul("neutral-pastel-film", "Neutral pastel film", "e70fc9f9-648e-4016-a411-7564fa47bab5", "adbca234-bfff-4c19-835f-f8647655d295", "pellicule aux tons pastel neutres", "film look with neutral pastel tones"),
  soul("warm-vivid-film", "Warm vivid film", "576fb6f0-e000-4da9-ba05-a4cc5f5e2462", "dbaabc25-7fee-438c-bd65-ae4d1775d4ab", "pellicule chaude aux couleurs vives", "warm film with vivid colors"),
  soul("bw-film", "BW film", "30b6d8ca-1a73-429d-9a16-b19905d69756", "3ece570b-a9a3-4b86-8c20-8eaa7c58cc4f", "pellicule noir et blanc", "black and white film"),
  soul("warm-contrast-film", "Warm contrast film", "fd7b86d1-e90f-4198-a429-c764bd9b1996", "2c109e42-bf29-47a2-ae16-aa6cbbba8b8a", "pellicule chaude et contrastée", "warm, high contrast film"),
  soul("muted-cool-film", "Muted cool film", "c50c0350-dffe-49fc-acc4-e6fcfa5a6140", "a15510bf-2439-4964-a2cc-0e35d1b5e70f", "pellicule froide aux couleurs atténuées", "cool film with muted colors"),
];

// Le rendu (image ou video) est le seul type sur lequel on peut compter :
// il se lit sur l'apercu. Les anciens types (image vers video, avatar) ne sont plus affiches.
export const RENDUS_EFFET: { value: "image" | "video"; label: string }[] = [
  { value: "image", label: "Image" },
  { value: "video", label: "Vidéo" },
];

export function renduEffet(e: EffetHiggsfield): "image" | "video" {
  if (e.previewType) return e.previewType;
  return /\.(mp4|webm)(\?|$)/i.test(e.preview) ? "video" : "image";
}
export const STYLES_EFFET: { value: StyleEffet | "tous"; label: string }[] = [
  { value: "tous", label: "Tous les styles" },
  { value: "realiste", label: "Realiste" },
  { value: "anime", label: "Anime" },
  { value: "cinematique", label: "Cinematique" },
  { value: "viral", label: "Viral" },
];

// Texte affiche et texte propose au depart, dans la langue choisie par la personne.
export function descriptionEffet(e: EffetHiggsfield, locale: Locale): string {
  return locale === "en" ? e.descriptionEn : e.description;
}

export function promptInitialEffet(e: EffetHiggsfield, locale: Locale): string {
  return (locale === "en" ? e.promptInitialEn : e.promptInitial) ?? "";
}
