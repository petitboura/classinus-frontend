"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { lireLienEntrant } from "@/lib/liensEntrants";
import { ROUTE_REINITIALISATION } from "@/lib/reinitialisationMotDePasse";

// Ouvre dans l'appli installée (Android, PC) les liens de Classinus reçus du
// système. Voir lib/liensEntrants.ts pour les liens acceptés. N'affiche rien,
// et ne fait rien dans un navigateur.
//
// Cas particulier : le lien de l'email "mot de passe oublié" porte une session
// de récupération dans sa partie après le #. Sur le site, Supabase la lit tout
// seul dans l'adresse de la page ; dans l'appli, l'adresse de la page est
// interne, donc on la lit ici et on ouvre la session à la main. Seulement pour
// la page de réinitialisation : sur toute autre page, une session portée par un
// lien serait ignorée (sinon un lien piégé pourrait connecter l'appli à un
// autre compte).

// Un même lien peut arriver deux fois à l'ouverture de l'appli (écouteur et
// lien de lancement) : on ignore le doublon proche.
const DELAI_DOUBLON_MS = 2000;

// getLaunchUrl() renvoie toujours le lien qui a lancé l'appli, même après un
// rechargement de la page (mise à jour OTA par exemple) : on retient celui déjà
// traité pour ne pas y retourner à chaque rechargement.
const CLE_LIEN_DE_LANCEMENT_TRAITE = "classinus-lien-lancement-traite";

function lienDeLancementDejaTraite(url: string): boolean {
  try {
    return sessionStorage.getItem(CLE_LIEN_DE_LANCEMENT_TRAITE) === url;
  } catch {
    return false;
  }
}

// Marqué seulement une fois la navigation lancée : un rechargement qui couperait
// l'ouverture (mise à jour OTA au démarrage) laisse ainsi le lien à refaire.
function retenirLienDeLancement(url: string) {
  try {
    sessionStorage.setItem(CLE_LIEN_DE_LANCEMENT_TRAITE, url);
  } catch {
    // Stockage indisponible : au pire le lien est refait après un rechargement.
  }
}

export function EcouteurLiensEntrants() {
  const router = useRouter();

  useEffect(() => {
    let actif = true;
    const ecouteurs: { remove: () => Promise<void> }[] = [];
    let dernier = { url: "", instant: 0 };

    async function traiter(url: string) {
      const maintenant = Date.now();
      if (url === dernier.url && maintenant - dernier.instant < DELAI_DOUBLON_MS) return;
      dernier = { url, instant: maintenant };

      const lien = lireLienEntrant(url);
      if (!lien) return;

      const [chemin] = lien.chemin.split("?");
      if (chemin === ROUTE_REINITIALISATION) {
        const params = new URLSearchParams(lien.hash.replace(/^#/, ""));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        if (accessToken && refreshToken) {
          try {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          } catch {
            // Session refusée : la page de réinitialisation affichera "lien invalide".
          }
          if (actif) router.push(lien.chemin);
          return;
        }
        // Pas de jeton : soit une erreur de Supabase (lien expiré, à garder dans
        // l'adresse pour que la page l'affiche), soit rien du tout.
        if (actif) router.push(`${lien.chemin}${lien.hash}`);
        return;
      }

      if (actif) router.push(lien.chemin);
    }

    async function ecouter() {
      const { Capacitor } = await import("@capacitor/core");
      if (!Capacitor.isNativePlatform()) return;
      const { App } = await import("@capacitor/app");

      const ecouteur = await App.addListener("appUrlOpen", ({ url }) => {
        void traiter(url);
      });
      if (!actif) {
        void ecouteur.remove();
        return;
      }
      ecouteurs.push(ecouteur);

      const lancement = await App.getLaunchUrl();
      if (lancement?.url && !lienDeLancementDejaTraite(lancement.url)) {
        await traiter(lancement.url);
        retenirLienDeLancement(lancement.url);
      }
    }

    ecouter().catch(() => {
      // Pas de pont natif disponible : l'appli reste utilisable, sans ouverture par lien.
    });

    return () => {
      actif = false;
      ecouteurs.forEach((e) => void e.remove().catch(() => {}));
    };
  }, [router]);

  return null;
}
