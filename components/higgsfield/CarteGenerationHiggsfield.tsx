"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";

export type EtapeCarteGeneration = "envoi" | "attente" | "creation";

type Props = {
  /** Format voulu ("9:16", "16:9"...). Vide ou "auto" : on mesure le fichier de l'utilisateur. */
  format: string;
  /** Fichier de l'utilisateur (image ou vidéo de départ), affiché derrière le verre dépoli. */
  source: { url: string; type: "image" | "video" } | null;
  /** Image fixe de l'effet choisi, qui bouge doucement par-dessus. */
  apercuEffet: string | null;
  etape: EtapeCarteGeneration;
  /** Moment (Date.now()) où la personne a touché Générer. */
  debutMs: number;
  delaiDepasse: boolean;
  /** Résultat final : déclenche la révélation. */
  resultatUrl: string | null;
  onRevele: () => void;
};

const HAUTEUR_MAX_CSS = "min(52dvh, 520px)";
const SECONDES_AVANT_MESSAGE_RASSURANT = 30;
const SECOURS_REVELATION_MS = 4000;

/** "9:16" -> 9/16. Renvoie null si le format n'est pas un rapport lisible. */
function rapportDepuisFormat(format: string): number | null {
  const m = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(format.trim());
  if (!m) return null;
  const l = Number(m[1]);
  const h = Number(m[2]);
  return l > 0 && h > 0 ? l / h : null;
}

/** 72 -> "1 min 12", 8 -> "8 s". Même écriture en français et en anglais. */
export function formaterDuree(secondes: number): string {
  if (secondes < 60) return `${secondes} s`;
  return `${Math.floor(secondes / 60)} min ${String(secondes % 60).padStart(2, "0")}`;
}

function estVideo(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

/**
 * Carte de génération Higgsfield : une carte vide à la forme exacte de la future vidéo ou image,
 * qui se construit sous les yeux de la personne puis révèle le vrai résultat.
 * Higgsfield n'envoie ni aperçu partiel ni pourcentage : l'effet est une animation construite
 * autour des fichiers de la personne, et seules les étapes affichées sont réelles.
 */
export function CarteGenerationHiggsfield({ format, source, apercuEffet, etape, debutMs, delaiDepasse, resultatUrl, onRevele }: Props) {
  const [rapportMesure, setRapportMesure] = useState<number | null>(null);
  const [secondes, setSecondes] = useState(() => Math.max(0, Math.floor((Date.now() - debutMs) / 1000)));
  const [resultatPret, setResultatPret] = useState(false);
  const [dissipe, setDissipe] = useState(false);

  // Compteur de temps réel, calculé depuis l'heure de départ : jamais décalé si l'onglet dort.
  useEffect(() => {
    if (resultatUrl) return;
    const id = setInterval(() => setSecondes(Math.max(0, Math.floor((Date.now() - debutMs) / 1000))), 1000);
    return () => clearInterval(id);
  }, [debutMs, resultatUrl]);

  // Le résultat n'est révélé que lorsqu'il est réellement chargé. Filet de sécurité si le chargement tarde.
  useEffect(() => {
    if (!resultatUrl) return;
    const id = setTimeout(() => setResultatPret(true), SECOURS_REVELATION_MS);
    return () => clearTimeout(id);
  }, [resultatUrl]);

  const rapport = useMemo(() => rapportDepuisFormat(format) ?? rapportMesure ?? 9 / 16, [format, rapportMesure]);
  const largeurCss = `min(100%, calc(${HAUTEUR_MAX_CSS} * ${rapport.toFixed(4)}))`;
  const texteEtape = etape === "envoi" ? "Envoi de tes fichiers" : etape === "attente" ? "En attente de son tour" : "Création en cours";
  const rassurer = !resultatUrl && secondes >= SECONDES_AVANT_MESSAGE_RASSURANT;
  const revelation = !!resultatUrl && resultatPret;

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col items-center gap-3">
      <div
        className="relative mx-auto overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface shadow-lg transition-[width] duration-500"
        style={{ width: largeurCss, aspectRatio: String(rapport) }}
        aria-busy={!resultatUrl}
      >
        {/* Résultat final, caché sous le verre jusqu'à la révélation */}
        {resultatUrl &&
          (estVideo(resultatUrl) ? (
            <video
              src={resultatUrl}
              controls
              autoPlay
              muted
              loop
              playsInline
              onLoadedData={() => setResultatPret(true)}
              onError={() => setResultatPret(true)}
              className="absolute inset-0 h-full w-full bg-black object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resultatUrl}
              alt=""
              onLoad={() => setResultatPret(true)}
              onError={() => setResultatPret(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ))}

        {/* Verre dépoli : disparaît d'un coup à la révélation */}
        {!dissipe && (
          <div
            className={`pointer-events-none absolute inset-0 ${revelation ? "hf-dissipe" : ""}`}
            onAnimationEnd={
              revelation
                ? (e) => {
                    // Les animations des calques enfants font aussi remonter leur fin : on ne réagit qu'à celle du verre.
                    if (e.target !== e.currentTarget) return;
                    setDissipe(true);
                    onRevele();
                  }
                : undefined
            }
          >
            {source ? (
              source.type === "video" ? (
                <video
                  src={source.url}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(e) => {
                    const v = e.currentTarget;
                    if (v.videoWidth && v.videoHeight) setRapportMesure(v.videoWidth / v.videoHeight);
                  }}
                  className="hf-flou absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={source.url}
                  alt=""
                  onLoad={(e) => {
                    const i = e.currentTarget;
                    if (i.naturalWidth && i.naturalHeight) setRapportMesure(i.naturalWidth / i.naturalHeight);
                  }}
                  className="hf-flou absolute inset-0 h-full w-full object-cover"
                />
              )
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-dj-surface-haute to-dj-surface" />
            )}

            {apercuEffet && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={apercuEffet} alt="" className="hf-derive absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-soft-light" />
            )}

            <div className="absolute inset-0 bg-dj-fond/25 backdrop-blur-sm" />
            <div className="hf-reflet absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent" />
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 text-center" role="status" aria-live="polite">
        {!resultatUrl && (
          <>
            <p className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
              <span className="hf-point inline-block h-2 w-2 rounded-full bg-dj-texte" aria-hidden />
              <span key={etape} className="animate-dj-fade-in-rapide">{delaiDepasse ? "La génération prend plus de temps que prévu." : texteEtape}</span>
            </p>
            <p className="flex items-center gap-1.5 text-xs tabular-nums text-dj-texte-muet">
              <Clock className="h-3 w-3" aria-hidden />
              {formaterDuree(secondes)}
            </p>
            {rassurer && <p className="animate-dj-fade-in-rapide text-xs text-dj-texte-muet">Tu peux fermer, on te prévient</p>}
          </>
        )}
      </div>
    </div>
  );
}
