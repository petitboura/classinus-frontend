"use client";

// Page bambara (18/11/2026, demande de Bourama) : appels au serveur pour les profils, l'historique et les
// éléments gardés (api/bambara_profils.py côté backend). Aucun texte d'erreur n'est montré : la page est faite
// pour quelqu'un qui ne lit pas, les échecs sont donc silencieux et la page reste utilisable.

import { appelerApi } from "./api";
import type { MessageAudioBambara } from "./audioMessageBambara";
import type { VisuelBambara } from "./pageBambaraVisuels";

export type ProfilBambara = { id: string; nom: string; prenom: string; genre?: "femme" | "homme" | null };
export type ConversationBambara = { id: string; texte: string | null; a_audio: boolean; cree_a: string };
export type GardeBambara = {
  id: string;
  genre: "video" | "image";
  url: string;
  titre: string;
  miniature: string | null;
  id_video: string | null;
};

// Même plafond que le serveur : au delà, le vocal n'est pas envoyé et le texte de la demande sert de premier message.
const LONGUEUR_MAX_AUDIO_BASE64 = 2_000_000;

function chaineProfil(profilId: string | null): string {
  return profilId ? `?profil_id=${encodeURIComponent(profilId)}` : "";
}

async function blobVersBase64(blob: Blob): Promise<string> {
  const octets = new Uint8Array(await blob.arrayBuffer());
  let binaire = "";
  const pas = 0x8000;
  for (let i = 0; i < octets.length; i += pas) binaire += String.fromCharCode(...octets.subarray(i, i + pas));
  return btoa(binaire);
}

function base64VersBlob(base64: string, type: string): Blob {
  const binaire = atob(base64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) octets[i] = binaire.charCodeAt(i);
  return new Blob([octets], { type });
}

export async function listerProfilsBambara(): Promise<ProfilBambara[]> {
  const reponse = await appelerApi("/api/bambara/profils");
  return Array.isArray(reponse?.profils) ? reponse.profils : [];
}

export async function creerProfilBambara(nom: string, prenom: string): Promise<ProfilBambara> {
  return appelerApi("/api/bambara/profils", { method: "POST", body: JSON.stringify({ nom, prenom }) });
}

export async function listerConversationsBambara(profilId: string | null): Promise<ConversationBambara[]> {
  const reponse = await appelerApi(`/api/bambara/conversations${chaineProfil(profilId)}`);
  return Array.isArray(reponse?.conversations) ? reponse.conversations : [];
}

/** Garde le premier message d'une conversation (le serveur ignore un second envoi pour la même conversation). */
export async function enregistrerPremierMessageBambara(params: {
  conversationId: string;
  profilId: string | null;
  texte: string;
  audio: MessageAudioBambara | null;
}): Promise<void> {
  const texte = params.texte.trim();
  let audio: { base64: string; duree_ms: number; pics: number[] } | null = null;
  if (params.audio) {
    const base64 = await blobVersBase64(params.audio.blob);
    if (base64.length <= LONGUEUR_MAX_AUDIO_BASE64) {
      audio = { base64, duree_ms: Math.round(params.audio.dureeMs), pics: params.audio.pics };
    }
  }
  if (!texte && !audio) return;
  await appelerApi(`/api/bambara/conversations/${encodeURIComponent(params.conversationId)}/premier-message`, {
    method: "PUT",
    body: JSON.stringify({ profil_id: params.profilId, texte: texte || null, audio }),
  });
}

/** Le premier vocal d'une conversation de l'historique, prêt pour la bulle audio. */
export async function lireAudioConversationBambara(conversationId: string): Promise<MessageAudioBambara> {
  const reponse = await appelerApi(`/api/bambara/conversations/${encodeURIComponent(conversationId)}/audio`);
  return {
    blob: base64VersBlob(String(reponse?.base64 ?? ""), "audio/wav"),
    dureeMs: Number(reponse?.duree_ms) || 0,
    pics: Array.isArray(reponse?.pics) ? reponse.pics.map(Number) : [],
  };
}

export type MessageConversationBambara = { id: number | string | null; role: "user" | "assistant"; content: string; meta?: Record<string, unknown> | null };

type LigneHistoriqueBambara = { id?: number | string | null; parent_id?: number | string | null; role?: string; content?: string; meta?: Record<string, unknown> | null };

/**
 * Les messages d'une conversation de l'historique, dans l'ordre (22/11/2026, demande de Bourama : on doit pouvoir
 * ouvrir une conversation de l'historique). Le serveur garde déjà tout le texte des échanges de la page : on relit le
 * fil et on suit la branche la plus récente (une même question reposée crée une version alternative).
 */
export async function lireMessagesConversationBambara(conversationId: string): Promise<MessageConversationBambara[]> {
  const lignes: LigneHistoriqueBambara[] = await appelerApi(`/api/historique/clovis/conversations/${encodeURIComponent(conversationId)}`);
  const liste = (Array.isArray(lignes) ? lignes : []).filter((l) => (l?.role === "user" || l?.role === "assistant") && typeof l.content === "string");
  const avecId = liste.filter((l) => l.id !== null && l.id !== undefined);
  let chaine: LigneHistoriqueBambara[] = liste;
  if (avecId.length === liste.length && liste.length > 0) {
    const parId = new Map(liste.map((l) => [String(l.id), l]));
    const parents = new Set(liste.map((l) => (l.parent_id === null || l.parent_id === undefined ? "" : String(l.parent_id))));
    // La feuille la plus récente : le dernier message (dans l'ordre du serveur) que personne n'a pour parent.
    let feuille: LigneHistoriqueBambara | undefined;
    for (const l of liste) if (!parents.has(String(l.id))) feuille = l;
    const suite: LigneHistoriqueBambara[] = [];
    const vus = new Set<string>();
    let courant: LigneHistoriqueBambara | undefined = feuille ?? liste[liste.length - 1];
    while (courant && !vus.has(String(courant.id))) {
      vus.add(String(courant.id));
      suite.unshift(courant);
      courant = courant.parent_id === null || courant.parent_id === undefined ? undefined : parId.get(String(courant.parent_id));
    }
    chaine = suite;
  }
  return chaine.map((l) => ({ id: l.id ?? null, role: l.role as "user" | "assistant", content: l.content as string, meta: l.meta ?? null }));
}

export type AudioMessageListeBambara = { id: string; message_id: number | string; sens: "question" | "reponse"; duree_ms: number };

/**
 * Garde le son d'un message de la conversation (22/11/2026, demande de Bourama : toutes les voix, pas seulement le
 * premier vocal). `sens` : « question » pour la voix de la personne, « reponse » pour celle de Classinus.
 * Le serveur ignore un second envoi pour le même message.
 */
export async function enregistrerAudioMessageBambara(params: {
  conversationId: string;
  messageId: number | string;
  sens: "question" | "reponse";
  audio: MessageAudioBambara;
}): Promise<void> {
  const base64 = await blobVersBase64(params.audio.blob);
  // Trop lourd pour le serveur : on ne l'envoie pas, le texte reste lisible dans l'historique.
  if (!base64 || base64.length > LONGUEUR_MAX_AUDIO_BASE64) return;
  await appelerApi(
    `/api/bambara/conversations/${encodeURIComponent(params.conversationId)}/messages/${encodeURIComponent(String(params.messageId))}/audio`,
    {
      method: "PUT",
      body: JSON.stringify({ sens: params.sens, base64, duree_ms: Math.round(params.audio.dureeMs), pics: params.audio.pics }),
    }
  );
}

/** La liste légère des sons d'une conversation (sans le son lui-même), dans l'ordre des messages. */
export async function listerAudiosConversationBambara(conversationId: string): Promise<AudioMessageListeBambara[]> {
  const reponse = await appelerApi(`/api/bambara/conversations/${encodeURIComponent(conversationId)}/audios`);
  return Array.isArray(reponse?.audios) ? reponse.audios : [];
}

/** Un son de la liste, prêt pour la bulle audio. */
export async function lireAudioMessageBambara(audioId: string): Promise<MessageAudioBambara> {
  const reponse = await appelerApi(`/api/bambara/audios/${encodeURIComponent(audioId)}`);
  return {
    blob: base64VersBlob(String(reponse?.base64 ?? ""), "audio/wav"),
    dureeMs: Number(reponse?.duree_ms) || 0,
    pics: Array.isArray(reponse?.pics) ? reponse.pics.map(Number) : [],
  };
}

export async function listerGardesBambara(profilId: string | null): Promise<GardeBambara[]> {
  const reponse = await appelerApi(`/api/bambara/gardes${chaineProfil(profilId)}`);
  return Array.isArray(reponse?.gardes) ? reponse.gardes : [];
}

export async function garderBambara(profilId: string | null, visuel: VisuelBambara): Promise<GardeBambara> {
  return appelerApi("/api/bambara/gardes", {
    method: "POST",
    body: JSON.stringify({
      profil_id: profilId,
      genre: visuel.genre,
      url: visuel.url,
      titre: visuel.titre,
      miniature: visuel.miniature ?? null,
      id_video: visuel.idVideo ?? null,
    }),
  });
}

export async function retirerGardeBambara(id: string): Promise<void> {
  await appelerApi(`/api/bambara/gardes/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Un élément gardé, remis dans la forme des visuels de la page pour réutiliser les mêmes cartes. */
export function visuelDepuisGarde(garde: GardeBambara): VisuelBambara {
  return { id: garde.id, genre: garde.genre, url: garde.url, titre: garde.titre, miniature: garde.miniature, idVideo: garde.id_video };
}
