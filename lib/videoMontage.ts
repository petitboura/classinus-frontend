/** Données de sélection transmises à /api/chat pour une demande de montage. */
export type ZoneSelectionVideo = {
  /** Coordonnées normalisées par rapport à l'image, dans [0, 1]. */
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
};

export type ContexteVideoMontage = {
  video_id: string;
  nom_fichier: string;
  duree_secondes: number;
  debut?: number;
  fin?: number;
  zone?: ZoneSelectionVideo;
};

export type SourceVideoEspace = {
  video_id: string;
  nom_fichier: string;
  taille_octets: number;
  type_mime: string;
  source_path: string;
  duree_secondes: number;
};
