"use client";

// Page bambara : phrases proactives (22/11/2026, demande de Bourama). Appels vers le backend
// (api/bambara_phrases.py), avec le jeton du compte. Le navigateur garde chaque audio : son adresse porte la
// version (voix et texte), elle change seulement quand la voix ou le texte change.

import { supabase } from "./supabase";
import { API_URL, appelerApi, construireErreurApi } from "./api";
import { obtenirLocale } from "./i18n/locale";
import { lireListePhrases, type ListePhrases, type PhraseDispo } from "./phrasesBambaraLogique";

/** Les phrases prêtes à jouer et les délais de la phrase « outil lent ». Échoue si le serveur ne répond pas. */
export async function lirePhrasesBambara(): Promise<ListePhrases> {
  return lireListePhrases(await appelerApi("/api/bambara/phrases"));
}

/** Télécharge l'audio (WAV) d'une phrase prête. */
export async function telechargerAudioPhrase(phrase: PhraseDispo, signal?: AbortSignal): Promise<ArrayBuffer> {
  const chemin = `/api/bambara/phrases/${encodeURIComponent(phrase.id)}/audio?v=${encodeURIComponent(phrase.version)}`;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const entetes = new Headers({ "Accept-Language": obtenirLocale() });
  if (session?.access_token) entetes.set("Authorization", `Bearer ${session.access_token}`);
  const reponse = await fetch(`${API_URL}${chemin}`, { headers: entetes, signal });
  if (!reponse.ok) throw await construireErreurApi(reponse, chemin);
  return reponse.arrayBuffer();
}
