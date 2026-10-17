"use client";

import { useEffect, useState } from "react";
import { lireMonProfil } from "@/lib/api";

// Photo et nom affichés pour le profil de la personne connectée. Partagé entre
// la barre latérale du chat (AppSidebar.tsx) et l'en-tête du menu Plus du
// téléphone, pour qu'ils montrent toujours la même chose. Rien n'est chargé
// pour un visiteur sans compte.
export function useMonProfilAffiche(connecte: boolean) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nomAffiche, setNomAffiche] = useState<string | null>(null);

  useEffect(() => {
    if (!connecte) {
      setAvatarUrl(null);
      setNomAffiche(null);
      return;
    }
    let annule = false;
    lireMonProfil()
      .then((p: { avatar_url: string | null; nom_affiche: string }) => {
        if (annule) return;
        setAvatarUrl(p.avatar_url || null);
        setNomAffiche(p.nom_affiche || null);
      })
      .catch(() => {
        // Au pire, l'initiale de repli ("Mon compte") suffit.
      });
    return () => {
      annule = true;
    };
  }, [connecte]);

  return { avatarUrl, nomAffiche };
}
