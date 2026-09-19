"use client";

import { useCallback, useState } from "react";
import { supabase } from "@/lib/supabase";
import { lireMonProfil } from "@/lib/api";

const PREFIXE_CLE = "dj_profil_public_propose_";

/**
 * 18/09/2026, chantier "profil contributeur bibliotheque publique",
 * étape 11 : à appeler juste après le succès d'un premier ajout au
 * catalogue public (fichier, dossier ou skill -- voir
 * ajouterABibliothequePublique / ajouterLienBibliothequePublique /
 * ajouterTexteBibliothequePublique / creerDossierCataloguePublic dans
 * lib/api.ts, et publierComportement). Propose d'activer le profil
 * public si ce n'est pas déjà fait, une seule fois par personne :
 * qu'elle accepte ou décline, elle n'est plus jamais redemandée (drapeau
 * localStorage, même principe que lib/useTheme.ts -- côté backend,
 * profil_public reste un simple booléen, pas de tri-état "jamais
 * défini" à interroger, voir migrations/2026_09_18_profil_public.sql).
 */
export function usePremierePublicationCatalogue() {
  const [popupOuverte, setPopupOuverte] = useState(false);

  const signalerPublication = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId || typeof window === "undefined") return;

      const cle = `${PREFIXE_CLE}${userId}`;
      if (localStorage.getItem(cle)) return;

      const profil = await lireMonProfil();
      if ((profil as { profil_public?: boolean }).profil_public) {
        // Déjà public : rien à proposer, mais on pose quand même le
        // drapeau pour ne jamais réévaluer ça à chaque publication.
        localStorage.setItem(cle, "1");
        return;
      }

      localStorage.setItem(cle, "1");
      setPopupOuverte(true);
    } catch {
      // Best-effort : une erreur ici ne doit jamais faire échouer ni
      // perturber la publication elle-même, qui vient de réussir.
    }
  }, []);

  return { popupOuverte, fermerPopup: () => setPopupOuverte(false), signalerPublication };
}
