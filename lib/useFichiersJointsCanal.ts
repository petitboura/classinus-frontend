"use client";

// Créé le 03/10/2026 (demande Bourama : bouton « + » du canal en direct). État des
// pièces jointes en attente d'envoi dans la zone d'écriture du canal, avec leur
// aperçu : mêmes règles que la barre de saisie du chat (vignette locale pour les
// images, vidéos et audios, icône et nom pour le reste), libérées au retrait et à
// l'envoi. Les archives zip ne sont pas prises en charge ici : leur dézipage démarre
// côté chat dès la sélection et part dans un champ de requête que le canal n'a pas.

import { useCallback, useEffect, useRef, useState } from "react";
import type { GenrePiece, PieceApercu } from "@/components/chat/LigneApercuPieces";
import { typeDeFichier } from "@/lib/preparerPiecesJointes";

type FichierJoint = { id: string; fichier: File; apercu: string | null; urlMedia?: string };

function genreDeFichier(f: File): GenrePiece {
  const type = typeDeFichier(f);
  return type === "image" || type === "video" || type === "audio" || type === "zip" ? type : "document";
}

function libererApercus(f: FichierJoint) {
  if (f.apercu) URL.revokeObjectURL(f.apercu);
  if (f.urlMedia) URL.revokeObjectURL(f.urlMedia);
}

export function useFichiersJointsCanal() {
  const [fichiers, setFichiers] = useState<FichierJoint[]>([]);
  // Dernier état connu, lu au démontage pour libérer les URL locales restantes.
  const dernierEtatRef = useRef<FichierJoint[]>([]);
  dernierEtatRef.current = fichiers;
  useEffect(() => () => dernierEtatRef.current.forEach(libererApercus), []);

  // Retourne le nombre d'archives refusées, pour que l'appelant puisse l'expliquer.
  const ajouter = useCallback((nouveaux: File[]): number => {
    const acceptes = nouveaux.filter((f) => typeDeFichier(f) !== "zip");
    if (acceptes.length) {
      setFichiers((prec) => [
        ...prec,
        ...acceptes.map((f) => ({
          id: crypto.randomUUID(),
          fichier: f,
          apercu: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
          urlMedia: f.type.startsWith("video/") || f.type.startsWith("audio/") ? URL.createObjectURL(f) : undefined,
        })),
      ]);
    }
    return nouveaux.length - acceptes.length;
  }, []);

  const retirer = useCallback((id: string) => {
    setFichiers((prec) => {
      const cible = prec.find((f) => f.id === id);
      if (cible) libererApercus(cible);
      return prec.filter((f) => f.id !== id);
    });
  }, []);

  const vider = useCallback(() => {
    setFichiers((prec) => {
      prec.forEach(libererApercus);
      return [];
    });
  }, []);

  const pieces: PieceApercu[] = fichiers.map(({ id, fichier, apercu, urlMedia }) => ({
    id,
    nom: fichier.name,
    genre: genreDeFichier(fichier),
    url: apercu ?? urlMedia ?? null,
  }));

  return { fichiers: fichiers.map((f) => f.fichier), pieces, ajouter, retirer, vider };
}
