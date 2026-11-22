import { API_URL, appelerApi, appelerApiFichier } from "./api";
import { ErreurApi } from "./erreurs";
import { obtenirLocale } from "./i18n/locale";
import { supabase } from "./supabase";

export type HiggsfieldStatut = {
  etat: "en_cours" | "terminee" | "echec" | "bloquee" | "annulee";
  /** Étape réelle côté Higgsfield : la demande attend son tour, ou la création est en cours. */
  etape?: "attente" | "creation";
  url: string | null;
  erreur: string | null;
  /** Une image se télécharge après un partage terminé ; une vidéo est toujours débloquée (étape 4 du serveur). */
  telechargement_debloque?: boolean;
};

export async function higgsfieldDisponible(): Promise<boolean> {
  try {
    const r = (await appelerApi("/api/higgsfield/disponible")) as { disponible: boolean };
    return !!r.disponible;
  } catch {
    return false;
  }
}

export async function lancerVideoHiggsfield(payload: Record<string, unknown>) {
  return (await appelerApi("/api/higgsfield/video", { method: "POST", body: JSON.stringify(payload) })) as { request_id: string; titre: string };
}

export async function lancerImageHiggsfield(payload: Record<string, unknown>) {
  return (await appelerApi("/api/higgsfield/image", { method: "POST", body: JSON.stringify(payload) })) as { request_id: string; titre: string };
}

export async function lancerGenjutsuHiggsfield(payload: Record<string, unknown>) {
  return (await appelerApi("/api/higgsfield/genjutsu", { method: "POST", body: JSON.stringify(payload) })) as { request_id: string; titre: string };
}

export async function lancerMarketingStudioHiggsfield(payload: Record<string, unknown>) {
  return (await appelerApi("/api/higgsfield/marketing-studio", { method: "POST", body: JSON.stringify(payload) })) as { request_id: string; titre: string };
}

// Le suivi et l'enregistrement en bibliothèque sont faits par le serveur : cet appel ne fait que lire l'état.
export async function statutHiggsfield(request_id: string): Promise<HiggsfieldStatut> {
  return (await appelerApi(`/api/higgsfield/statut/${encodeURIComponent(request_id)}`)) as HiggsfieldStatut;
}

export type GenerationHiggsfield = {
  request_id: string;
  titre: string;
  genre: "video" | "image";
  etat: HiggsfieldStatut["etat"];
  url: string | null;
  erreur: string | null;
  cree_a: string;
  termine_a: string | null;
  telechargement_debloque?: boolean;
};

export async function listerGenerationsHiggsfield(limite = 8): Promise<GenerationHiggsfield[]> {
  const r = (await appelerApi(`/api/higgsfield/generations?limite=${limite}`)) as { generations: GenerationHiggsfield[] };
  return r.generations || [];
}

export async function annulerHiggsfield(request_id: string) {
  return (await appelerApi(`/api/higgsfield/annuler/${encodeURIComponent(request_id)}`, { method: "POST" })) as { annulee: boolean };
}

export async function estimerHiggsfield(payload: Record<string, unknown>) {
  return (await appelerApi("/api/higgsfield/estimation", { method: "POST", body: JSON.stringify(payload) })) as { credits: number | null };
}

/**
 * Signale au serveur que la personne a terminé le partage de son image : le téléchargement se débloque.
 * Sans risque à répéter. Le signal vient de l'appli, il sert à pousser le partage et non à protéger un secret
 * (voir core/higgsfield_telechargement.py côté backend).
 */
export async function signalerPartageTermineHiggsfield(request_id: string): Promise<boolean> {
  const r = (await appelerApi(`/api/higgsfield/partage-termine/${encodeURIComponent(request_id)}`, { method: "POST" })) as {
    telechargement_debloque?: boolean;
  };
  return r.telechargement_debloque === true;
}

/** Nom de fichier proposé par le serveur (en-tête Content-Disposition), sinon un nom neutre. */
function nomDepuisEntete(entete: string | null, parDefaut: string): string {
  const m = entete ? /filename="?([^";]+)"?/i.exec(entete) : null;
  return m?.[1]?.trim() || parDefaut;
}

/**
 * Récupère le fichier d'une génération avec la session de la personne : le serveur refuse une image
 * qui n'est pas débloquée (TELECHARGEMENT_PARTAGE_REQUIS). Un lien direct ne peut pas porter cette session.
 */
export async function recupererFichierHiggsfield(request_id: string): Promise<{ blob: Blob; nom: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const entetes = new Headers({ "Accept-Language": obtenirLocale() });
  if (session?.access_token) entetes.set("Authorization", `Bearer ${session.access_token}`);

  const reponse = await fetch(`${API_URL}/api/higgsfield/telecharger/${encodeURIComponent(request_id)}`, { headers: entetes });
  if (!reponse.ok) {
    let detail: { code?: string; message?: string; params?: Record<string, string | number> } | undefined;
    try {
      const corps = (await reponse.json()) as { detail?: unknown };
      if (corps.detail && typeof corps.detail === "object") detail = corps.detail as typeof detail;
    } catch {
      detail = undefined;
    }
    throw new ErreurApi(reponse.status, detail?.message ?? "", detail?.code ?? "ERREUR_INCONNUE", detail?.params);
  }
  const blob = await reponse.blob();
  return { blob, nom: nomDepuisEntete(reponse.headers.get("content-disposition"), "classinus.png") };
}

export async function uploaderFichierHiggsfield(fichier: File): Promise<string> {
  const rep = (await appelerApiFichier("/api/uploads/fichier-chat", fichier)) as { url?: string };
  if (!rep.url) throw new Error("Upload échoué");
  return rep.url;
}

export async function uploaderVideoHiggsfield(fichier: File): Promise<string> {
  return uploaderFichierHiggsfield(fichier);
}
