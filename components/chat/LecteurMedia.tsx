"use client";

import { telecharger as telechargerFichier } from "@/lib/telecharger";
import { extensionDepuisTexte } from "@/lib/extensionDepuisTexte";
import { IconeTelechargement, MessageEchecTelechargement, classeEtatTelechargement } from "@/components/EtatTelechargement";
import { useEtatTelechargement } from "@/lib/etatTelechargements";

const EXTENSIONS_AUDIO = ["mp3", "wav", "ogg", "m4a"];
const EXTENSIONS_VIDEO = ["mp4", "webm", "mov"];

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
  // 12/09/2026, Bourama : vrai téléchargement système sur Android (au
  // lieu du fetch+blob web ici depuis toujours) -- voir lib/telecharger.ts.
  function telecharger() {
    const nom = href.split("/").pop()?.split("?")[0] || (type === "audio" ? "audio" : "video");
    void telechargerFichier(href, nom);
  }
  const etat = useEtatTelechargement(href);

  return (
    <span className="my-2 block animate-dj-fade-in overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface p-2">
      <span className="flex items-center gap-2">
        {type === "audio" ? (
          <audio controls src={href} style={{ colorScheme: "dark" }} className="w-full" />
        ) : (
          <video controls src={href} style={{ colorScheme: "dark" }} className="max-h-80 w-full rounded-lg" />
        )}
        <button
          onClick={telecharger}
          aria-label="Télécharger"
          className={`flex shrink-0 items-center gap-1 rounded-lg p-1.5 text-dj-texte-muet transition-colors hover:text-dj-texte ${classeEtatTelechargement(etat)}`}
        >
          <IconeTelechargement href={href} size={16} />
          {etat?.statut === "encours" && etat.pourcentage !== null && (
            <span className="text-[11px] tabular-nums">{etat.pourcentage} %</span>
          )}
        </button>
      </span>
      <MessageEchecTelechargement href={href} className="px-2 pb-1 pt-1" />
    </span>
  );
}
