import type { TypeMarketing } from "@/lib/presetsMarketingStudio";

// Ce que chaque type de preset Marketing Studio accepte en plus de l'image du produit.
// Source : flux reel de presets Higgsfield (07/11/2026). Le serveur de Classinus applique les memes regles.
export const CONTRAT_MARKETING: Record<TypeMarketing, { personne: boolean; site: boolean }> = {
  product_shots: { personne: false, site: false },
  product_shots_people: { personne: true, site: false },
  hypermotion: { personne: false, site: false },
  mixed_media: { personne: false, site: false },
  "2d_motion": { personne: false, site: false },
  saas_motion: { personne: false, site: true },
};

// Format de sortie : par defaut celui du preset. Les autres sont des valeurs courantes.
export const FORMATS_MARKETING = ["", "9:16", "1:1", "16:9"];
