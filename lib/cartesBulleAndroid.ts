"use client";

// Cree le 17/10/2026, demande Bourama : lot 4 du bouton flottant natif Android
// (images et cartes d'apercu dans la bulle de reponse). Trouve les liens d'une reponse de
// Classinus et en tire une carte (titre, description, site, miniature) pour la bulle native.
//
// Le natif ne sait pas lire les pages web : c'est la page qui trouve les informations, comme
// l'apercu de lien du chat (components/chat/LinkPreview.tsx) :
//   - YouTube : l'oEmbed public (titre de la video, chaine), miniature img.youtube.com ;
//   - autre lien : GET {API_URL}/api/apercu-lien (le serveur lit les balises Open Graph).
// Un lien sans information utile (le serveur repond {}), ou qui est un fichier (PDF, image,
// audio...), n'a pas de carte : la bulle ne montre jamais de carte vide.
//
// Un lien deja resolu est garde en memoire : la meme reponse envoyee plusieurs fois ne refait
// aucun appel reseau. Chaque appel a un delai maximal : une carte lente n'attend pas la suite.

import { API_URL } from "./api";
import { idYoutube } from "../components/chat/LinkPreview";

/** Une carte envoyee au natif (voir CarteBulle dans BulleReponseFlottante.kt). */
export type CarteBulleNative = {
  url: string;
  titre: string;
  description?: string;
  site?: string;
  image?: string;
  video?: boolean;
};

const MAX_CARTES = 4;
const DELAI_APERCU_MS = 4000;

// [titre](adresse) ou [titre](adresse "description"), seulement http(s).
const MOTIF_LIEN = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g;
// Adresse YouTube ecrite telle quelle, sans lien markdown.
const MOTIF_YOUTUBE_NU = /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[a-zA-Z0-9_-]{11}[^\s)]*/g;

type LienTrouve = { url: string; titreModele: string | null; descriptionModele: string | null };

const memoire = new Map<string, CarteBulleNative | null>();

/** Liens d'une reponse, dans l'ordre, sans doublon (au plus MAX_CARTES). */
export function extraireLiens(texte: string): LienTrouve[] {
  const trouves = new Map<string, LienTrouve>();
  for (const m of texte.matchAll(MOTIF_LIEN)) {
    const url = m[2];
    if (!trouves.has(url)) trouves.set(url, { url, titreModele: m[1]?.trim() || null, descriptionModele: m[3]?.trim() || null });
  }
  for (const m of texte.matchAll(MOTIF_YOUTUBE_NU)) {
    const url = m[0];
    if (!trouves.has(url)) trouves.set(url, { url, titreModele: null, descriptionModele: null });
  }
  return Array.from(trouves.values()).slice(0, MAX_CARTES);
}

function adresseSite(href: string): string | undefined {
  try {
    const hote = new URL(href).hostname;
    return hote.startsWith("www.") ? hote.slice(4) : hote;
  } catch {
    return undefined;
  }
}

async function avecDelai(url: string): Promise<Response> {
  const controle = new AbortController();
  const minuteur = setTimeout(() => controle.abort(), DELAI_APERCU_MS);
  try {
    return await fetch(url, { signal: controle.signal });
  } finally {
    clearTimeout(minuteur);
  }
}

async function resoudreUnLien(lien: LienTrouve): Promise<CarteBulleNative | null> {
  const enMemoire = memoire.get(lien.url);
  if (enMemoire !== undefined) return enMemoire;
  let carte: CarteBulleNative | null = null;
  try {
    const idVideo = idYoutube(lien.url);
    if (idVideo) {
      const r = await avecDelai(`https://www.youtube.com/oembed?url=${encodeURIComponent(lien.url)}&format=json`);
      if (r.ok) {
        const data = await r.json();
        carte = {
          url: lien.url,
          titre: lien.titreModele || data.title || "YouTube",
          description: lien.descriptionModele || (data.author_name ? String(data.author_name) : undefined),
          site: "YouTube",
          image: `https://img.youtube.com/vi/${idVideo}/hqdefault.jpg`,
          video: true,
        };
      }
    } else {
      const r = await avecDelai(`${API_URL}/api/apercu-lien?url=${encodeURIComponent(lien.url)}`);
      if (r.ok) {
        const data = await r.json();
        // Un fichier (PDF, image, audio...) n'a pas de carte : il s'ouvre depuis l'appli.
        const utile = !data?.fichier?.extension && (data?.titre || data?.image);
        if (utile) {
          carte = {
            url: lien.url,
            titre: lien.titreModele || String(data.titre || adresseSite(lien.url) || lien.url),
            description: lien.descriptionModele || (data.description ? String(data.description) : undefined),
            site: adresseSite(lien.url),
            image: typeof data.image === "string" ? data.image : undefined,
          };
        }
      }
    }
  } catch {
    carte = null;
  }
  memoire.set(lien.url, carte);
  return carte;
}

/** Cartes des liens de la reponse (celles qui ont une information utile), dans l'ordre des liens. */
export async function resoudreCartes(texte: string): Promise<CarteBulleNative[]> {
  const liens = extraireLiens(texte);
  if (liens.length === 0) return [];
  const resultats = await Promise.all(liens.map(resoudreUnLien));
  return resultats.filter((c): c is CarteBulleNative => c !== null);
}
