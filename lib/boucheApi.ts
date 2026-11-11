import { API_URL, appelerApi, construireErreurApi } from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import { supabase } from "@/lib/supabase";

// Appels de la page de test des voix bambara (api/bouche.py côté backend).
// Réservé aux administrateurs : le backend renvoie PAS_LE_DROIT_ADMIN sinon.

export type LicenceVoix = "non_commercial" | "a_verifier";

export type VoixBouche = {
  id: string;
  nom: string;
  depot: string;
  locuteurs: number;
  licence: LicenceVoix;
  experimental: boolean;
};

export type ListeVoixBouche = {
  voix: VoixBouche[];
  texte_max: number;
};

export async function listerVoixBouche(): Promise<ListeVoixBouche> {
  const donnees = await appelerApi("/api/bouche/voix");
  if (!donnees || !Array.isArray(donnees.voix) || typeof donnees.texte_max !== "number") {
    throw new ErreurApi(502, "Réponse inattendue.", "BOUCHE_INDISPONIBLE");
  }
  return donnees as ListeVoixBouche;
}

/** Renvoie le fichier audio (WAV) de la phrase lue par la voix choisie. */
export async function synthetiserBouche(voix: string, texte: string, locuteur: number): Promise<Blob> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const entetes = new Headers({
    "Content-Type": "application/json",
    "Accept-Language": obtenirLocale(),
  });
  if (session?.access_token) {
    entetes.set("Authorization", `Bearer ${session.access_token}`);
  }

  const chemin = "/api/bouche/synthese";
  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify({ voix, texte, locuteur }),
  });

  if (!reponse.ok) {
    throw await construireErreurApi(reponse, chemin);
  }
  const audio = await reponse.blob();
  if (!audio.size) {
    throw new ErreurApi(502, "Réponse vide.", "BOUCHE_SYNTHESE_ECHEC");
  }
  return audio;
}
