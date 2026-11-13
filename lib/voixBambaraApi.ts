"use client";

// Appels du mode vocal bambara vers le relais du backend (api/voix_bambara.py). Le navigateur ne
// connaît ni l'adresse de Soloni ni celle de la voix Gemini : tout passe par le serveur de
// Classinus, avec le jeton du compte.

import { supabase } from "./supabase";
import { API_URL, appelerApi, appelerApiFichier, construireErreurApi } from "./api";
import { obtenirLocale } from "./i18n/locale";

export type EtatVoixBambara = { disponible: boolean; texte_max: number };

const ETAT_PAR_DEFAUT: EtatVoixBambara = { disponible: false, texte_max: 600 };
// L'état change rarement (réglage du serveur) : une minute de mémoire suffit pour ne pas
// retarder chaque ouverture du mode vocal.
const DUREE_MEMOIRE_MS = 60_000;
let memoire: { valeur: EtatVoixBambara; lu_a: number } | null = null;

/** Dit si le bambara peut être proposé. Toute erreur compte pour « non disponible » (sans être retenue). */
export async function lireEtatVoixBambara(): Promise<EtatVoixBambara> {
  if (memoire && Date.now() - memoire.lu_a < DUREE_MEMOIRE_MS) return memoire.valeur;
  try {
    const brut = (await appelerApi("/api/voix-bambara/etat")) as Partial<EtatVoixBambara> | null;
    const valeur: EtatVoixBambara = {
      disponible: brut?.disponible === true,
      texte_max: typeof brut?.texte_max === "number" && brut.texte_max > 0 ? brut.texte_max : ETAT_PAR_DEFAUT.texte_max,
    };
    memoire = { valeur, lu_a: Date.now() };
    return valeur;
  } catch {
    return ETAT_PAR_DEFAUT;
  }
}

function extensionPour(mime: string): string {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  return "webm";
}

/** Envoie un enregistrement à Soloni (qui transcrit seulement) et renvoie le texte, vide si rien n'a été compris. */
export async function transcrireVoixBambara(audio: Blob, mime: string): Promise<string> {
  const fichier = new File([audio], `voix.${extensionPour(mime)}`, { type: mime || audio.type });
  const resultat = (await appelerApiFichier("/api/voix-bambara/transcrire", fichier)) as { texte?: unknown };
  return typeof resultat?.texte === "string" ? resultat.texte.trim() : "";
}

/** Fait lire un morceau de texte par la voix Gemini et renvoie le fichier audio (WAV). */
export async function synthetiserVoixBambara(texte: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const chemin = "/api/voix-bambara/synthese";
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const entetes = new Headers({ "Content-Type": "application/json", "Accept-Language": obtenirLocale() });
  if (session?.access_token) entetes.set("Authorization", `Bearer ${session.access_token}`);
  const reponse = await fetch(`${API_URL}${chemin}`, {
    method: "POST",
    headers: entetes,
    body: JSON.stringify({ texte }),
    signal,
  });
  if (!reponse.ok) throw await construireErreurApi(reponse, chemin);
  return reponse.arrayBuffer();
}
