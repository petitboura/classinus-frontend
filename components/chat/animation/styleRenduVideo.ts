import type { Palette } from "@/lib/paletteIframe";

// Mise en page du lecteur d'animation quand le serveur le transforme en vidéo
// (07/10/2026, demande Bourama). Le serveur ouvre le même document que le
// lecteur (voir construireDocumentAnimation.ts) dans un navigateur sans écran,
// à la taille exacte de la vidéo : ce fichier dit à quoi ressemble une image.
//
// Les clés de FORMATS_VIDEO doivent rester celles du backend
// (classinus-backend, core/rendu_animation_constantes.py : FORMATS).
export const FORMATS_VIDEO = {
  "16:9": { largeur: 1280, hauteur: 720 },
  "9:16": { largeur: 720, hauteur: 1280 },
} as const;

export type FormatVideo = keyof typeof FORMATS_VIDEO;

// Règle de contenu voulue par Bourama : les textes dessinés DANS l'animation
// portent l'explication. Le titre de la partie (en haut) et la légende (en
// bas) ne servent qu'à suivre la progression, on fait comme si l'utilisateur
// ne les voyait pas. En 16:9, la scène occupe donc toute l'image, sans
// bandeau. En 9:16, la scène reste au milieu avec une bande en haut (titre de
// la partie) et une bande en bas (légende).
export function construireStyleRenduVideo(p: Palette, format: FormatVideo): string {
  const { largeur, hauteur } = FORMATS_VIDEO[format];
  const commun = `
html,body{width:${largeur}px;height:${hauteur}px;overflow:hidden;background:${p.fond};}
*,*::before,*::after{animation:none !important;transition:none !important;}
#an-barre,#an-chap,#an-voile,#an-squelette,#an-erreur{display:none !important;}
#an-cadre{padding:0;gap:0;}
#an-zone{border:none;border-radius:0;cursor:default;}
#an-titre-rendu{display:none;}`;
  if (format === "16:9") {
    return `${commun}
#an-legende{display:none !important;}
`;
  }
  return `${commun}
#an-titre-rendu{order:0;flex:2 1 0;display:flex;align-items:flex-end;justify-content:center;padding:0 48px 36px;text-align:center;font-size:44px;font-weight:700;line-height:1.2;color:${p.texte};}
#an-zone{order:1;flex:none;width:100%;aspect-ratio:16/9;}
body.mode-3d #an-zone{aspect-ratio:4/5;}
#an-legende{order:2;flex:3 1 0;display:block;margin:0;min-height:0;padding:36px 48px 0;text-align:center;font-size:36px;line-height:1.4;color:${p.texte};}
body.sans-chapitres #an-titre-rendu{flex:1 1 0;}
body.sans-legende #an-titre-rendu,body.sans-legende #an-legende{flex:1 1 0;}
`;
}
