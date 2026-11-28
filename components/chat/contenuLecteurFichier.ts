import type { LucideIcon } from "lucide-react";
import type { ContenuLecteur } from "@/lib/lecteurLateral";
import { TYPES_MIME_OFFICE, estTypeTexteLisible, estFichierMarkdown } from "../VisionneuseBibliotheque";

// Type MIME approximatif déduit de l'extension d'URL : ce fichier n'a jamais le
// vrai type_mime renvoyé par le backend (contrairement à DetailOuverturePosition,
// alimenté par core/bibliotheque_rag.py), donc on le reconstruit ici pour
// réutiliser les mêmes helpers (estTypeTexteLisible, estFichierMarkdown,
// TYPES_MIME_OFFICE) que la bibliothèque. PDF et images gérés à part, zip et glb
// absents volontairement (aucun aperçu possible pour ces deux-là).
export const TYPE_MIME_PAR_EXTENSION: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  json: "application/json",
  xml: "application/xml",
  tex: "text/x-tex",
  md: "text/markdown",
};

// La règle "ce fichier s'ouvre dans le lecteur à côté du chat" vit ici, une seule
// fois : la carte d'un fichier (FichierChip.tsx) et l'ouverture automatique en fin
// de réponse (premierContenuReponse.ts) s'en servent toutes les deux, pour qu'elles
// ne divergent jamais. Renvoie null quand le type n'a pas d'aperçu dans le lecteur
// (archives, modèles 3D, formats sans lecteur...).
export function contenuLecteurFichier({
  href,
  url,
  nom,
  infos,
  sousTitre,
  icone,
  idBibliothequePublique,
  surCopie,
}: {
  /** Adresse écrite dans le message : elle fait l'identifiant, donc le "Ouvert à droite". */
  href: string;
  /** Adresse réellement lue par le lecteur (relais pour un site externe, sinon href). */
  url: string;
  nom: string;
  /** Extension reconnue (pdf, docx, epub...). */
  infos: string;
  sousTitre: string;
  icone: LucideIcon;
  idBibliothequePublique?: string | null;
  surCopie?: () => Promise<void>;
}): ContenuLecteur | null {
  const typeMime = infos === "pdf" ? "application/pdf" : TYPE_MIME_PAR_EXTENSION[infos];
  const ouvrable =
    infos === "pdf" ||
    infos === "epub" ||
    infos === "mobi" ||
    (!!typeMime && (estFichierMarkdown(nom, typeMime) || TYPES_MIME_OFFICE.has(typeMime) || estTypeTexteLisible(typeMime)));
  if (!ouvrable) return null;
  return {
    genre: "fichier",
    id: `fichier:${href}`,
    titre: nom,
    url,
    extension: infos,
    typeMime: typeMime ?? null,
    sousTitre,
    icone,
    telechargeable: true,
    idBibliothequePublique,
    surCopie,
  };
}
