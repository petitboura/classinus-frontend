import { appelerApi, appelerApiFichier } from "./api";

export type HiggsfieldStatut = {
  etat: "en_cours" | "terminee" | "echec" | "bloquee" | "annulee";
  /** Étape réelle côté Higgsfield : la demande attend son tour, ou la création est en cours. */
  etape?: "attente" | "creation";
  url: string | null;
  erreur: string | null;
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

export async function uploaderFichierHiggsfield(fichier: File): Promise<string> {
  const rep = (await appelerApiFichier("/api/uploads/fichier-chat", fichier)) as { url?: string };
  if (!rep.url) throw new Error("Upload échoué");
  return rep.url;
}

export async function uploaderVideoHiggsfield(fichier: File): Promise<string> {
  return uploaderFichierHiggsfield(fichier);
}
