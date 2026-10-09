// Écriture des caractères que la frappe touche par touche ne sait pas envoyer.
//
// Au delà du jeu latin de base (code supérieur à 255), la bibliothèque de frappe envoie un
// raccourci clavier à la place du caractère : le tiret long devient Ctrl+T, par exemple.
// Ces caractères sont donc collés : placés un instant dans le presse-papiers, puis Ctrl+V.
// Ce que l'étudiant avait copié (texte ou image) est remis en place à la fin.

import type { ResultatCombinaison } from "./gardeClavier.mjs";

type ImagePresse = { isEmpty(): boolean };

export type PressePapiers = {
  readText(): string;
  readImage(): ImagePresse;
  writeText(texte: string): void;
  writeImage(image: ImagePresse): void;
  clear(): void;
};

export type Collage = {
  // Garde en mémoire le contenu actuel du presse-papiers (une seule fois par frappe).
  preparer(): void;
  coller(texte: string): Promise<{ ok: true } | { ok: false; erreur: string }>;
  // Remet le contenu d'origine. Sans effet si rien n'a été préparé.
  restaurer(): void;
};

// Temps laissé à l'application pour lire le presse-papiers après Ctrl+V : remettre l'ancien
// contenu trop tôt ferait coller l'ancien contenu à la place.
const PAUSE_APRES_COLLAGE_MS = 120;

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function creerCollage(options: {
  presse: PressePapiers;
  garde: { combinaison(touches: number[]): Promise<ResultatCombinaison> };
  ctrl: number;
  v: number;
}): Collage {
  const { presse, garde, ctrl, v } = options;
  let sauvegarde: { texte: string; image: ImagePresse | null } | null = null;

  return {
    preparer() {
      if (sauvegarde) return;
      const image = presse.readImage();
      sauvegarde = { texte: presse.readText(), image: image.isEmpty() ? null : image };
    },
    async coller(texte) {
      presse.writeText(texte);
      const resultat = await garde.combinaison([ctrl, v]);
      if (!resultat.ok) return { ok: false, erreur: resultat.erreur };
      await attendre(PAUSE_APRES_COLLAGE_MS);
      return { ok: true };
    },
    restaurer() {
      if (!sauvegarde) return;
      const { texte, image } = sauvegarde;
      sauvegarde = null;
      if (texte) presse.writeText(texte);
      else if (image) presse.writeImage(image);
      else presse.clear();
    },
  };
}
