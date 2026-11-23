// Page bambara (23/11/2026, demande de Bourama) : la réponse de Classinus n'est plus un seul bloc. Cette fonction pure
// la découpe, dans l'ordre où le modèle l'a écrite, en blocs : un paragraphe de texte (séparé du suivant par une
// ligne vide), une série d'images, une série de vidéos. C'est le modèle qui organise : il place les textes entre les
// images, des images entre les vidéos (consigne : core/prompt_voix_bambara.py, note D côté serveur). Chaque bloc de
// texte est lu à part et a son propre vocal.
//
// Pendant que la réponse arrive, seul ce qui est complet est rendu : une ligne à moitié écrite (un lien coupé) et le
// paragraphe encore ouvert attendent. Les blocs déjà rendus ne changent alors plus (même numéro, même contenu),
// sauf une série de visuels qui peut encore grandir.

import { extraireVisuelsDuTexte, type VisuelBambara } from "./pageBambaraVisuels";
import { nettoyerPourVoix } from "./voixBambaraTexte";

export type BlocTexteBambara = {
  id: string;
  genre: "texte";
  /** Rang parmi les blocs de texte (0 pour le premier) : c'est lui qui rattache le vocal à son bloc. */
  rang: number;
  /** Texte propre, tel qu'il est lu à voix haute. */
  texte: string;
};

export type BlocVisuelsBambara = {
  id: string;
  genre: "visuels";
  /** Une série ne mélange pas les genres : images ensemble, vidéos ensemble. */
  sorte: "image" | "video";
  visuels: VisuelBambara[];
};

export type BlocBambara = BlocTexteBambara | BlocVisuelsBambara;

/** Identifiant de l'élément d'un bloc de texte à l'écran (visibilité) et de sa bulle audio. */
export function idBlocTexte(idTour: string, rang: number): string {
  return `${idTour}:b${rang}`;
}

const MARQUEURS_FICHIERS = /\[(?:Image jointe|Audio joint|Vidéo jointe|Document joint|Lien réel du fichier)\s*:[^\]]*\]/g;

export function blocsDeReponse(brut: string, termine: boolean): BlocBambara[] {
  // Les repères que le serveur ajoute pour un fichier généré ([Image jointe : lien]...) ne sont ni du texte ni un choix du
  // modèle : seul ce que le modèle écrit lui-même devient un bloc.
  let source = (brut ?? "").replace(MARQUEURS_FICHIERS, " ");
  if (!termine) {
    // La dernière ligne n'est peut-être pas finie : elle attend son retour à la ligne.
    const coupe = source.lastIndexOf("\n");
    source = coupe >= 0 ? source.slice(0, coupe) : "";
  }
  const blocs: BlocBambara[] = [];
  const vus = new Set<string>();
  let paragraphe: string[] = [];
  let rangTexte = 0;

  const fermerParagraphe = () => {
    const lignes = paragraphe;
    paragraphe = [];
    const texte = nettoyerPourVoix(lignes.join("\n"));
    if (!texte) return;
    blocs.push({ id: "b" + blocs.length, genre: "texte", rang: rangTexte, texte });
    rangTexte += 1;
  };

  const ajouterVisuel = (visuel: VisuelBambara) => {
    // Le même lien ne s'affiche qu'une fois.
    if (vus.has(visuel.id)) return;
    vus.add(visuel.id);
    const dernier = blocs[blocs.length - 1];
    if (dernier && dernier.genre === "visuels" && dernier.sorte === visuel.genre) dernier.visuels.push(visuel);
    else blocs.push({ id: "b" + blocs.length, genre: "visuels", sorte: visuel.genre, visuels: [visuel] });
  };

  for (const ligne of source.split("\n")) {
    const visuels = extraireVisuelsDuTexte(ligne);
    if (visuels.length === 0) {
      if (ligne.trim() === "") fermerParagraphe();
      else paragraphe.push(ligne);
      continue;
    }
    // Une ligne avec un visuel coupe le paragraphe : le texte écrit avant le lien passe d'abord, puis le visuel.
    const reste = nettoyerPourVoix(ligne);
    if (reste) paragraphe.push(reste);
    fermerParagraphe();
    for (const visuel of visuels) ajouterVisuel(visuel);
  }
  // Le paragraphe encore ouvert n'est rendu qu'à la fin de la réponse.
  if (termine) fermerParagraphe();
  return blocs;
}
