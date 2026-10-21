"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Clock3, Crop, LoaderCircle, RotateCcw, X } from "lucide-react";
import { uploaderVideoEspace } from "@/lib/api";
import type { ContexteVideoMontage, SourceVideoEspace, ZoneSelectionVideo } from "@/lib/videoMontage";

type Point = { x: number; y: number };
type SourceEnCache = SourceVideoEspace & { fichier: File; conversationId: string };

type Props = {
  open: boolean;
  fichier: File | null;
  urlMedia?: string;
  conversationId?: string | null;
  initialPrompt?: string;
  disabled?: boolean;
  onClose: () => void;
  onEnvoyer: (demande: string, contexte: ContexteVideoMontage) => void;
};

function borner(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function horodatage(secondes: number) {
  const valeur = Math.max(0, Math.floor(Number.isFinite(secondes) ? secondes : 0));
  const heures = Math.floor(valeur / 3600);
  const minutes = Math.floor((valeur % 3600) / 60);
  const secondesRestantes = valeur % 60;
  return heures > 0
    ? `${heures}:${String(minutes).padStart(2, "0")}:${String(secondesRestantes).padStart(2, "0")}`
    : `${minutes}:${String(secondesRestantes).padStart(2, "0")}`;
}

/**
 * Lecteur de montage contextuel : choix d'un intervalle temporel et/ou d'une
 * région de l'image. Il n'impose aucun outil à l'utilisateur ; Clovis reçoit
 * seulement la sélection structurée et choisit les opérations nécessaires.
 */
export function EditeurVideoContextuel({
  open,
  fichier,
  urlMedia,
  conversationId,
  initialPrompt = "",
  disabled = false,
  onClose,
  onEnvoyer,
}: Props) {
  const [source, setSource] = useState<SourceEnCache | null>(null);
  const [televersement, setTeleversement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [urlLocale, setUrlLocale] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [duree, setDuree] = useState(0);
  const [debut, setDebut] = useState(0);
  const [fin, setFin] = useState(0);
  const [intervalleActif, setIntervalleActif] = useState(false);
  const [selectionnerZone, setSelectionnerZone] = useState(false);
  const [zone, setZone] = useState<ZoneSelectionVideo | null>(null);
  const lecteurRef = useRef<HTMLVideoElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const origineRef = useRef<Point | null>(null);
  const zoneRef = useRef<ZoneSelectionVideo | null>(null);

  useEffect(() => {
    if (!fichier || urlMedia) {
      setUrlLocale(null);
      return;
    }
    const url = URL.createObjectURL(fichier);
    setUrlLocale(url);
    return () => URL.revokeObjectURL(url);
  }, [fichier, urlMedia]);

  useEffect(() => {
    if (!open || !fichier || !conversationId) return;
    if (source && source.fichier === fichier && source.conversationId === conversationId) return;
    let actif = true;
    setTeleversement(true);
    setErreur(null);
    setSource(null);
    uploaderVideoEspace(fichier, conversationId)
      .then((resultat) => {
        if (!actif) return;
        setSource({ ...resultat, fichier, conversationId });
        const dureeServeur = Math.max(0, resultat.duree_secondes || 0);
        setDuree(dureeServeur);
        setDebut(0);
        setFin(dureeServeur);
        setIntervalleActif(false);
        setZone(null);
        zoneRef.current = null;
      })
      .catch((e) => {
        if (actif) setErreur(e instanceof Error ? e.message : "Impossible de préparer cette vidéo.");
      })
      .finally(() => {
        if (actif) setTeleversement(false);
      });
    return () => {
      actif = false;
    };
  }, [open, fichier, conversationId, retry, source]);

  useEffect(() => {
    if (open) setPrompt(initialPrompt);
  }, [open, initialPrompt, fichier]);

  if (!open || !fichier) return null;

  const urlLecture = urlMedia || urlLocale;
  const selectionFaite = intervalleActif || zone !== null;
  const intervalleValide = intervalleActif && fin > debut;
  const peutEnvoyer = Boolean(
    source &&
      selectionFaite &&
      prompt.trim() &&
      !televersement &&
      !disabled &&
      (!intervalleActif || intervalleValide)
  );

  function coordonnees(clientX: number, clientY: number): Point | null {
    const surface = surfaceRef.current;
    if (!surface) return null;
    const rect = surface.getBoundingClientRect();
    return {
      x: borner((clientX - rect.left) / Math.max(rect.width, 1)),
      y: borner((clientY - rect.top) / Math.max(rect.height, 1)),
    };
  }

  function decrireZone(a: Point, b: Point): ZoneSelectionVideo {
    const gauche = Math.min(a.x, b.x);
    const haut = Math.min(a.y, b.y);
    return {
      x: borner(gauche),
      y: borner(haut),
      largeur: borner(Math.abs(b.x - a.x), 0, 1),
      hauteur: borner(Math.abs(b.y - a.y), 0, 1),
    };
  }

  function demarrerZone(e: PointerEvent<HTMLDivElement>) {
    if (!selectionnerZone) return;
    const point = coordonnees(e.clientX, e.clientY);
    if (!point) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    origineRef.current = point;
    const initiale = { x: point.x, y: point.y, largeur: 0.005, hauteur: 0.005 };
    zoneRef.current = initiale;
    setZone(initiale);
  }

  function bougerZone(e: PointerEvent<HTMLDivElement>) {
    if (!selectionnerZone || !origineRef.current) return;
    const point = coordonnees(e.clientX, e.clientY);
    if (!point) return;
    const suivante = decrireZone(origineRef.current, point);
    zoneRef.current = suivante;
    setZone(suivante);
  }

  function terminerZone(e: PointerEvent<HTMLDivElement>) {
    if (!selectionnerZone || !origineRef.current) return;
    const point = coordonnees(e.clientX, e.clientY);
    if (point) {
      const suivante = decrireZone(origineRef.current, point);
      if (suivante.largeur >= 0.01 && suivante.hauteur >= 0.01) {
        zoneRef.current = suivante;
        setZone(suivante);
      } else {
        zoneRef.current = null;
        setZone(null);
      }
    }
    origineRef.current = null;
    setSelectionnerZone(false);
  }

  function envoyer() {
    if (!peutEnvoyer || !source) return;
    const contexte: ContexteVideoMontage = {
      video_id: source.video_id,
      nom_fichier: source.nom_fichier,
      duree_secondes: source.duree_secondes,
      ...(intervalleActif ? { debut, fin } : {}),
      ...(zone ? { zone } : {}),
    };
    onEnvoyer(prompt.trim(), contexte);
    onClose();
  }

  function reinitialiserIntervalle() {
    setDebut(0);
    setFin(duree);
    setIntervalleActif(false);
  }

  const zoneAffichee = zone;
  const apercuZone = zoneAffichee && {
    left: `${zoneAffichee.x * 100}%`,
    top: `${zoneAffichee.y * 100}%`,
    width: `${zoneAffichee.largeur * 100}%`,
    height: `${zoneAffichee.hauteur * 100}%`,
  };

  return (
    <div
      className="fixed inset-0 z-[190] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="editeur-video-titre"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface shadow-2xl">
        <header className="flex items-center gap-3 border-b border-dj-bordure px-4 py-3 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dj-surface-haute text-dj-texte">
            <span className="text-lg" aria-hidden="true">▶</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="editeur-video-titre" className="text-sm font-semibold text-dj-texte">Modifier une vidéo avec Clovis</h2>
            <p className="truncate text-xs text-dj-texte-muet">{fichier.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
            aria-label="Fermer l'éditeur vidéo"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {!conversationId && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-dj-texte">
              Ouvre une conversation avant de lancer le montage vidéo.
            </div>
          )}
          {erreur && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-dj-texte">
              <p>{erreur}</p>
              <button
                type="button"
                onClick={() => setRetry((valeur) => valeur + 1)}
                className="shrink-0 rounded-lg border border-dj-bordure px-2.5 py-1.5 text-xs hover:bg-dj-surface-haute"
              >
                Réessayer
              </button>
            </div>
          )}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-dj-texte-muet">Aperçu et sélection</span>
              <button
                type="button"
                onClick={() => {
                  setSelectionnerZone((value) => !value);
                  origineRef.current = null;
                  if (!selectionnerZone) setZone(null);
                }}
                className={
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors " +
                  (selectionnerZone
                    ? "border-sky-400 bg-sky-400/15 text-dj-texte"
                    : "border-dj-bordure text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte")
                }
                disabled={!urlLecture}
              >
                <Crop size={14} />
                {selectionnerZone ? "Dessine la zone dans l’image…" : "Sélectionner une zone"}
              </button>
            </div>
            <div
              ref={surfaceRef}
              className={
                "relative flex min-h-36 items-center justify-center overflow-hidden rounded-xl bg-black " +
                (selectionnerZone ? "cursor-crosshair touch-none" : "")
              }
              onPointerDown={demarrerZone}
              onPointerMove={bougerZone}
              onPointerUp={terminerZone}
              onPointerCancel={terminerZone}
            >
              {urlLecture ? (
                <video
                  ref={lecteurRef}
                  src={urlLecture}
                  controls
                  playsInline
                  preload="metadata"
                  className="block max-h-[44dvh] w-full object-contain"
                  onLoadedMetadata={(e) => {
                    const valeur = Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0;
                    if (valeur > 0) setDuree(valeur);
                  }}
                />
              ) : (
                <div className="flex min-h-36 items-center gap-2 text-sm text-dj-texte-muet">
                  <LoaderCircle size={17} className="animate-spin" />
                  Préparation de l’aperçu…
                </div>
              )}
              {apercuZone && (
                <div
                  className="pointer-events-none absolute border-2 border-sky-400 bg-sky-400/20"
                  style={apercuZone}
                  aria-label="Zone sélectionnée"
                />
              )}
              {selectionnerZone && (
                <div className="pointer-events-none absolute inset-0 border border-dashed border-white/45 bg-transparent" />
              )}
            </div>
            {selectionnerZone && (
              <p className="mt-2 text-xs text-dj-texte-muet">
                Fais glisser sur l’image pour encadrer l’élément à modifier. La zone sera conservée quand tu relâches.
              </p>
            )}
            {zone && !selectionnerZone && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-dj-texte-muet">
                <span><Check size={13} className="mr-1 inline" /> Zone d’image sélectionnée</span>
                <button
                  type="button"
                  onClick={() => { setZone(null); zoneRef.current = null; }}
                  className="underline underline-offset-2 hover:text-dj-texte"
                >
                  Retirer la zone
                </button>
              </div>
            )}
          </div>

          <section className="rounded-xl border border-dj-bordure p-3.5 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-dj-texte">
                <Clock3 size={16} />
                Intervalle temporel
              </div>
              <button
                type="button"
                onClick={reinitialiserIntervalle}
                className="inline-flex items-center gap-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <RotateCcw size={12} /> Toute la vidéo
              </button>
            </div>
            <p className="mb-3 text-xs text-dj-texte-muet">
              {intervalleActif
                ? `De ${horodatage(debut)} à ${horodatage(fin)}`
                : `Durée de la vidéo : ${horodatage(duree)}. Déplace un curseur pour choisir le passage à modifier.`}
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-2 text-xs text-dj-texte-muet">
                  <span>Début</span><span className="tabular-nums">{horodatage(debut)}</span>
                </span>
                <input
                  aria-label="Début de la sélection"
                  type="range"
                  min={0}
                  max={Math.max(duree, 0.1)}
                  step={0.1}
                  value={debut}
                  onChange={(e) => {
                    const valeur = Math.min(Number(e.target.value), Math.max(0, fin - 0.1));
                    setDebut(valeur);
                    setIntervalleActif(true);
                  }}
                  disabled={!source || duree <= 0}
                  className="w-full accent-sky-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-2 text-xs text-dj-texte-muet">
                  <span>Fin</span><span className="tabular-nums">{horodatage(fin)}</span>
                </span>
                <input
                  aria-label="Fin de la sélection"
                  type="range"
                  min={Math.min(debut + 0.1, Math.max(duree, 0.1))}
                  max={Math.max(duree, 0.1)}
                  step={0.1}
                  value={fin}
                  onChange={(e) => {
                    const valeur = Math.max(debut + 0.1, Math.min(Number(e.target.value), duree));
                    setFin(valeur);
                    setIntervalleActif(true);
                  }}
                  disabled={!source || duree <= 0}
                  className="w-full accent-sky-500"
                />
              </label>
            </div>
          </section>

          <section>
            <label htmlFor="demande-video-clovis" className="mb-2 block text-sm font-medium text-dj-texte">
              Que veux-tu modifier ?
            </label>
            <textarea
              id="demande-video-clovis"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Ex. : enlève le bruit de fond sur ce passage, zoome sur le tableau et ajoute un titre discret…"
              className="w-full resize-y rounded-xl border border-dj-bordure bg-dj-surface px-3.5 py-3 text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet/70 focus:border-sky-500"
            />
            <p className="mt-1.5 text-xs text-dj-texte-muet">
              Clovis choisira les opérations adaptées. L’original restera intact.
            </p>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dj-bordure bg-dj-surface px-4 py-3 sm:px-5">
          <div className="text-xs text-dj-texte-muet">
            {televersement ? (
              <span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Préparation de la vidéo…</span>
            ) : source ? (
              <span className="inline-flex items-center gap-1.5"><Check size={14} /> Vidéo prête</span>
            ) : (
              <span>Sélectionne un passage ou une zone pour afficher l’action.</span>
            )}
          </div>
          {selectionFaite && (
            <button
              type="button"
              onClick={envoyer}
              disabled={!peutEnvoyer}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-dj-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              Demander à Clovis
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
