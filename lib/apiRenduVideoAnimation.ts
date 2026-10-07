import { supabase } from "./supabase";
import { API_URL, appelerApi } from "./api";
import { ErreurApi } from "./erreurs";
import type { FormatVideo } from "@/components/chat/animation/styleRenduVideo";

// Appels du rendu vidéo des animations (07/10/2026, demande Bourama), côté
// serveur : voir api/rendu_animation.py dans classinus-backend. Dans un
// fichier à part : lib/api.ts est déjà très long.

export type TravailRenduVideo = {
  id: string;
  statut: "attente" | "en_cours" | "pret" | "echec" | "annule";
  progression: number;
  format: FormatVideo;
  code_erreur?: string;
  message_erreur?: string;
  taille_octets?: number;
};

const CHEMIN = "/api/rendu-video-animation";

export function demanderRenduVideo(documentHtml: string, format: FormatVideo): Promise<TravailRenduVideo> {
  return appelerApi(CHEMIN, { method: "POST", body: JSON.stringify({ document_html: documentHtml, format }) });
}

export function lireRenduVideo(id: string): Promise<TravailRenduVideo> {
  return appelerApi(`${CHEMIN}/${id}`);
}

// Annule un rendu en cours, ou supprime la vidéo déjà prête du serveur.
export async function annulerRenduVideo(id: string): Promise<void> {
  await appelerApi(`${CHEMIN}/${id}`, { method: "DELETE" });
}

// Le fichier est un MP4 et non du JSON : appelerApi ne convient pas.
export async function telechargerVideoRendue(id: string): Promise<Blob> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const reponse = await fetch(`${API_URL}${CHEMIN}/${id}/video`, {
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  if (!reponse.ok) {
    let detail: { code?: string; message?: string } | undefined;
    try {
      detail = (await reponse.json())?.detail;
    } catch {
      detail = undefined;
    }
    throw new ErreurApi(
      reponse.status,
      detail?.message ?? `Une erreur est survenue (${reponse.status}), réessaie dans un instant.`,
      detail?.code ?? "ERREUR_INCONNUE",
    );
  }
  return reponse.blob();
}
