"use client";

import { useState } from "react";
import { Film, Music } from "lucide-react";
import { telecharger as telechargerFichier } from "@/lib/telecharger";
import { extensionDepuisTexte } from "@/lib/extensionDepuisTexte";
import { estOrigineDeConfiance } from "@/lib/originesFiables";
import { useLienRelaisExterne } from "@/lib/useLienRelaisExterne";
import { IconeTelechargement, MessageEchecTelechargement, classeEtatTelechargement } from "@/components/EtatTelechargement";
import { useEtatTelechargement } from "@/lib/etatTelechargements";
import { Skeleton } from "../Skeleton";

// 11/10/2026, demande Bourama : flac et aac côté audio, mkv, ogv et 3gp côté
// vidéo. Les navigateurs ne les lisent pas tous : si la lecture échoue, le
// lecteur est remplacé par une carte de téléchargement (voir onError plus bas).
// avi, flv, asf, mpeg, aiff et mid ne sont jamais lisibles dans un navigateur :
// ils ne sont pas ici, ils arrivent en carte téléchargement (FichierChip.tsx).
const EXTENSIONS_AUDIO = ["mp3", "wav", "ogg", "m4a", "flac", "aac"];
const EXTENSIONS_VIDEO = ["mp4", "webm", "mov", "mkv", "ogv", "3gp"];

export function typeMedia(href: string, texteLien?: string): "audio" | "video" | null {
  const ext = href.split("?")[0].split(".").pop()?.toLowerCase();
  for (const candidat of [ext, extensionDepuisTexte(href, texteLien)]) {
    if (!candidat) continue;
    if (EXTENSIONS_AUDIO.includes(candidat)) return "audio";
    if (EXTENSIONS_VIDEO.includes(candidat)) return "video";
  }
  return null;
}

// Lecteur natif HTML5 (pas de dépendance externe) pour les liens markdown
// qui pointent vers un fichier audio/vidéo -- le composant `a` custom de
// BulleMessage.tsx bascule ici quand `typeMedia()` reconnaît l'extension.
//
// Note .mov (2026-07-23) : Chrome/Firefox ne lisent pas nativement le
// codec le plus courant des .mov (QuickTime/H.264 dans un conteneur MOV
// mal supporté hors Safari) -- le <video> peut donc rester silencieux
// même avec un lien qui fonctionne. Pas de vrai correctif possible côté
// lecteur HTML5 pur (demanderait une conversion serveur) ; le bouton
// télécharger ci-dessous reste la solution de repli fiable dans ce cas.
export function LecteurMedia({ href, type }: { href: string; type: "audio" | "video" }) {
  // 11/10/2026, demande Bourama : un fichier d'un site externe passe par le
  // relais (voir useLienRelaisExterne), comme les autres fichiers du chat. Le
  // site d'origine ne peut plus bloquer la lecture, le déplacement dans la
  // vidéo marche, et le vrai type du fichier est vérifié sur son contenu. Ni
  // les adresses locales (blob:) ni nos propres fichiers ne passent par là.
  // Sans connexion ou si le relais échoue, le lien d'origine est lu comme
  // avant (le hook renvoie alors l'adresse d'origine).
  const externe = /^https?:\/\//i.test(href) && !estOrigineDeConfiance(href);
  const relais = useLienRelaisExterne(href, externe);
  const [utiliserOrigine, setUtiliserOrigine] = useState(false);
  const [illisible, setIllisible] = useState(false);
  const source = utiliserOrigine ? href : relais.href;
  const nom = href.split("/").pop()?.split("?")[0] || (type === "audio" ? "audio" : "video");
  // Le suivi du téléchargement (pourcentage, échec, voir lib/etatTelechargements.ts)
  // se fait par l'adresse passée à telecharger() : ici `source`, pas `href`.
  // Appelé avant les retours anticipés plus bas (règle des Hooks).
  const etat = useEtatTelechargement(source);

  // 12/09/2026, Bourama : vrai téléchargement système sur Android (au
  // lieu du fetch+blob web ici depuis toujours) -- voir lib/telecharger.ts.
  function telecharger() {
    void telechargerFichier(source, nom);
  }

  // Lecture impossible : si le relais était utilisé, on retente une fois avec
  // l'adresse d'origine, sinon carte de téléchargement.
  function surErreur() {
    if (!utiliserOrigine && source !== href) setUtiliserOrigine(true);
    else setIllisible(true);
  }

  if (relais.enAttente) {
    return (
      <Skeleton
        as="span"
        className={`my-2 block w-full max-w-xl rounded-xl ${type === "audio" ? "h-14" : "h-48"}`}
      />
    );
  }

  if (illisible) {
    const Icone = type === "audio" ? Music : Film;
    return (
      <>
        <button
          type="button"
          onClick={telecharger}
          className={`my-2 flex w-fit max-w-full animate-dj-fade-in items-center gap-3 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-left transition-colors hover:border-dj-bordure-forte ${classeEtatTelechargement(etat)}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-dj-surface-haute text-dj-texte">
            <Icone size={16} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-dj-texte">{nom}</span>
            <span className="block text-[11px] text-dj-texte-muet">Lecture impossible ici, appuyer pour télécharger</span>
          </span>
          <IconeTelechargement href={source} size={14} className="ml-1 shrink-0 text-dj-texte-muet" />
        </button>
        <MessageEchecTelechargement href={source} className="-mt-1 mb-2" />
      </>
    );
  }

  return (
    <span className="my-2 block animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface p-2">
      <span className="flex items-center gap-2">
        {type === "audio" ? (
          <audio controls src={source} onError={surErreur} style={{ colorScheme: "dark" }} className="w-full" />
        ) : (
          <video controls src={source} onError={surErreur} style={{ colorScheme: "dark" }} className="max-h-80 w-full rounded-lg" />
        )}
        <button
          onClick={telecharger}
          aria-label="Télécharger"
          className={`flex shrink-0 items-center gap-1 rounded-lg p-1.5 text-dj-texte-muet transition-colors hover:text-dj-texte ${classeEtatTelechargement(etat)}`}
        >
          <IconeTelechargement href={source} size={16} />
          {etat?.statut === "encours" && etat.pourcentage !== null && (
            <span className="text-[11px] tabular-nums">{etat.pourcentage} %</span>
          )}
        </button>
      </span>
      <MessageEchecTelechargement href={source} className="px-2 pb-1 pt-1" />
    </span>
  );
}
