import type { OptionMenu } from "@/components/SelectPersonnalise";
import type { EffetHiggsfield } from "@/lib/effetsHiggsfield";

export type FamilleHiggsfield = "genjutsu" | "image" | "video";
export type EtatGeneration = "idle" | "upload" | "lancement" | "en_cours" | "terminee" | "echec" | "annulee" | "bloquee";
export type FichierPreview = { file: File; url: string; type: "image" | "video" };

export const TAILLE_MAX_FICHIER_OCTETS = 15 * 1024 * 1024;
export const MAX_IMAGES_REFERENCE = 8;

export const DUREES_VIDEO = [4, 5, 8, 10, 15];
export const FORMATS_VIDEO = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
export const QUALITES_VIDEO = ["480p", "720p", "1080p", "4k"];
export const FORMATS_IMAGE = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"];
export const QUALITES_IMAGE = ["1k", "2k"];
export const RESOLUTIONS_GENJUTSU = ["480p", "720p", "1080p"];

/** Valeurs simples d'une liste, au format attendu par SelectPersonnalise. */
export function optionsDepuisValeurs(valeurs: readonly (string | number)[], suffixe = ""): OptionMenu[] {
  return valeurs.map((v) => ({ id: String(v), label: `${v}${suffixe}` }));
}

/** Modèle backend à utiliser pour un effet du catalogue (valeurs du catalogue CDN). */
export function modeleBackend(effet: EffetHiggsfield): string {
  if (effet.modele === "hf_mult_replace_object") return "genjutsu-object";
  if (effet.modele === "hf_mult_motion_control") return "genjutsu-motion";
  if (effet.modele === "higgsfield-viral") return "genjutsu-motion";
  if (effet.modele === "soul_2") return "grok";
  const connus = ["seedance", "kling", "grok", "genjutsu-motion", "genjutsu-object", "genjutsu-restyle", "genjutsu-light-motion", "genjutsu-light-object"];
  if (connus.includes(effet.modele)) return effet.modele;
  if (effet.type === "image") return "grok";
  if (effet.type === "video-to-video") return "genjutsu-motion";
  return "seedance";
}

export function familleEffet(effet: EffetHiggsfield): FamilleHiggsfield {
  if (effet.type === "image") return "image";
  if (effet.type === "video-to-video") return "genjutsu";
  return "video";
}
