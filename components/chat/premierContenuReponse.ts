import type { ContenuLecteur } from "@/lib/lecteurLateral";
import { estOrigineDeConfiance } from "@/lib/originesFiables";
import { typeMedia } from "./LecteurMedia";
import { contenuLecteurNote, estNoteTexteBibliotheque } from "./NoteTexteChip";
import { contenuLecteurCode, estFichierCodeAffichable } from "./FichierCode";
import { EXTENSIONS_FICHIER, EXTENSIONS_IMAGE, extensionFichier } from "./FichierChip";
import { contenuLecteurFichier } from "./contenuLecteurFichier";

// Premier fichier ouvrable d'une réponse, dans l'ordre où il est écrit. Sert à
// l'ouverture automatique du lecteur à la fin de la réponse (useOuvertureAutoReponse.ts).
//
// Il reprend les règles des cartes du chat (composantsMarkdownRiches.tsx) dans le
// même ordre : audio et vidéo, note de bibliothèque, code, puis fichier ou image.
// Chaque contenu est construit par la même fonction que celle de la carte, pour
// que l'ouverture automatique et le clic sur la carte donnent le même résultat.
//
// Seuls les fichiers de notre propre stockage s'ouvrent tout seuls. Un fichier
// hébergé ailleurs demande un relais du serveur (et parfois une connexion) : on ne
// déclenche pas cela sans que la personne l'ait demandé, il reste une carte à cliquer.
// Les images d'illustration trouvées sur le web (hors de notre stockage) ne sont pas
// non plus ouvertes d'elles-mêmes, seulement les images générées ou enregistrées ici.
const MOTIF_LIEN_OU_IMAGE = /(!?)\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

function retirerCode(markdown: string): string {
  return markdown
    .replace(/(```|~~~)[\s\S]*?(\1|$)/g, "\n\n")
    .replace(/`[^`\n]*`/g, " ");
}

function nettoyerTexte(texte: string): string {
  return texte.replace(/[*_`]/g, "").trim();
}

function contenuPourLien(href: string, texte: string): ContenuLecteur | null {
  const nom = nettoyerTexte(texte) || href;

  const media = typeMedia(href, nom);
  if (media) return { genre: "media", id: `media:${href}`, titre: nom, url: href, media };
  if (estNoteTexteBibliotheque(href)) return contenuLecteurNote(href, nom);
  if (estFichierCodeAffichable(href)) return contenuLecteurCode(href, nom);

  const infos = extensionFichier(href, nom);
  if (!infos) return null;
  if (EXTENSIONS_IMAGE.has(infos)) {
    return { genre: "images", id: `images:${href}:1`, liste: [{ src: href, alt: nom }], index: 0 };
  }
  const { icone, libelle } = EXTENSIONS_FICHIER[infos];
  return contenuLecteurFichier({ href, url: href, nom, infos, sousTitre: libelle, icone });
}

export function premierContenuReponse(markdown: string): ContenuLecteur | null {
  for (const paragraphe of retirerCode(markdown).split(/\n\s*\n/)) {
    const elements = [...paragraphe.matchAll(MOTIF_LIEN_OU_IMAGE)].map((m) => ({
      image: m[1] === "!",
      texte: m[2],
      href: m[3],
    }));
    if (elements.length === 0) continue;

    // Une rangée d'images (même paragraphe, rien d'autre que des images) s'ouvre
    // avec ses voisines, comme au clic sur l'une d'elles (ImageMessage.tsx).
    const rangee =
      elements.length > 1 &&
      elements.every((e) => e.image && estOrigineDeConfiance(e.href)) &&
      paragraphe.replace(MOTIF_LIEN_OU_IMAGE, "").trim() === "";
    if (rangee) {
      return {
        genre: "images",
        id: `images:${elements.map((e) => e.href).join("|")}`,
        liste: elements.map((e) => ({ src: e.href, alt: e.texte || undefined })),
        index: 0,
      };
    }

    for (const element of elements) {
      if (!/^https?:\/\//i.test(element.href) || !estOrigineDeConfiance(element.href)) continue;
      if (element.image) {
        return {
          genre: "images",
          id: `images:${element.href}`,
          liste: [{ src: element.href, alt: element.texte || undefined }],
          index: 0,
        };
      }
      const contenu = contenuPourLien(element.href, element.texte);
      if (contenu) return contenu;
    }
  }
  return null;
}
