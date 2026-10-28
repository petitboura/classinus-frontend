"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Clock3, Crop, LoaderCircle, RotateCcw, X } from "lucide-react";
import { uploaderVideoEspace } from "@/lib/api";
import { useLocale } from "@/lib/i18n/useLocale";
import { textesEditeurVideo } from "@/lib/textesEditeurVideo";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
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
  const t = textesEditeurVideo(useLocale());
  // Fermeture en douceur : le composant reste monté le temps de l'animation de
  // sortie, puis onClose (qui le démonte réellement côté parent) est appelé.
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
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
  const [cadreAffiche, setCadreAffiche] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
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
        if (actif) setErreur(e instanceof Error ? e.message : textesEditeurVideo().erreurPreparation);
      })
      .finally(() => {
        if (actif) setTeleversement(false);
      });
    return () => {
      actif = false;
    };
  }, [open, fichier, conversationId, retry, source]);

  const urlLecture = urlMedia || urlLocale;

  useEffect(() => {
    if (!open) {
      setCadreAffiche(null);
      return;
    }
    const mettreAJourCadre = () => {
      const surface = surfaceRef.current;
      const video = lecteurRef.current;
      if (!surface || !video || video.videoWidth <= 0 || video.videoHeight <= 0) {
        setCadreAffiche(null);
        return;
      }
      const surfaceRect = surface.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();
      const ratio = video.videoWidth / video.videoHeight;
      // object-fit: contain peut laisser des bandes noires dans la boîte HTML
      // (notamment quand max-height contraint une vidéo 16:9). La sélection doit
      // rester alignée sur les pixels vidéo réellement visibles, pas ces bandes.
      const largeur = Math.min(videoRect.width, videoRect.height * ratio);
      const hauteur = Math.min(videoRect.height, videoRect.width / ratio);
      const gauche = videoRect.left + (videoRect.width - largeur) / 2;
      const haut = videoRect.top + (videoRect.height - hauteur) / 2;
      setCadreAffiche({
        left: ((gauche - surfaceRect.left) / Math.max(surfaceRect.width, 1)) * 100,
        top: ((haut - surfaceRect.top) / Math.max(surfaceRect.height, 1)) * 100,
        width: (largeur / Math.max(surfaceRect.width, 1)) * 100,
        height: (hauteur / Math.max(surfaceRect.height, 1)) * 100,
      });
    };
    const surface = surfaceRef.current;
    const video = lecteurRef.current;
    const observateur = typeof ResizeObserver !== "undefined" ? new ResizeObserver(mettreAJourCadre) : null;
    if (surface) observateur?.observe(surface);
    if (video) observateur?.observe(video);
    window.addEventListener("resize", mettreAJourCadre);
    requestAnimationFrame(mettreAJourCadre);
    return () => {
      observateur?.disconnect();
      window.removeEventListener("resize", mettreAJourCadre);
    };
  }, [open, urlLecture]);

  useEffect(() => {
    if (open) setPrompt(initialPrompt);
  }, [open, initialPrompt, fichier]);

  if (!open || !fichier) return null;

  const selectionFaite = intervalleActif || (zone !== null && origineRef.current === null);
  const intervalleValide = intervalleActif && fin > debut;
  const peutEnvoyer = Boolean(
    source &&
      selectionFaite &&
      prompt.trim() &&
      !televersement &&
      !disabled &&
      !enSortie &&
      (!intervalleActif || intervalleValide)
  );

  function cadreVideoClient(): { left: number; top: number; width: number; height: number } | null {
    const video = lecteurRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0) return null;
    const rect = video.getBoundingClientRect();
    const ratio = video.videoWidth / video.videoHeight;
    const width = Math.min(rect.width, rect.height * ratio);
    const height = Math.min(rect.height, rect.width / ratio);
    return {
      left: rect.left + (rect.width - width) / 2,
      top: rect.top + (rect.height - height) / 2,
      width,
      height,
    };
  }

  function dansCadreVideo(clientX: number, clientY: number): boolean {
    const cadre = cadreVideoClient();
    return Boolean(
      cadre &&
      clientX >= cadre.left &&
      clientX <= cadre.left + cadre.width &&
      clientY >= cadre.top &&
      clientY <= cadre.top + cadre.height
    );
  }

  function coordonnees(clientX: number, clientY: number): Point | null {
    const cadre = cadreVideoClient();
    if (!cadre) return null;
    return {
      x: borner((clientX - cadre.left) / Math.max(cadre.width, 1)),
      y: borner((clientY - cadre.top) / Math.max(cadre.height, 1)),
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
    if (!dansCadreVideo(e.clientX, e.clientY)) return;
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
    fermer();
  }

  function fermer() {
    demarrerFermeture(onClose);
  }

  function reinitialiserIntervalle() {
    setDebut(0);
    setFin(duree);
    setIntervalleActif(false);
  }

  const apercuZone = zone && cadreAffiche ? {
    left: `${cadreAffiche.left + zone.x * cadreAffiche.width}%`,
    top: `${cadreAffiche.top + zone.y * cadreAffiche.height}%`,
    width: `${zone.largeur * cadreAffiche.width}%`,
    height: `${zone.hauteur * cadreAffiche.height}%`,
  } : null;
  const styleCadreAffiche = cadreAffiche ? {
    left: `${cadreAffiche.left}%`,
    top: `${cadreAffiche.top}%`,
    width: `${cadreAffiche.width}%`,
    height: `${cadreAffiche.height}%`,
  } : undefined;

  return (
    <div
      className={
        "fixed inset-0 z-[190] flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6 " +
        (enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide")
      }
      role="dialog"
      aria-modal="true"
      aria-labelledby="editeur-video-titre"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) fermer();
      }}
    >
      <div
        className={
          "flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface shadow-2xl " +
          (enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal")
        }
      >
        <header className="flex items-center gap-3 border-b border-dj-bordure px-4 py-3 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dj-surface-haute text-dj-texte">
            <span className="text-lg" aria-hidden="true">▶</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="editeur-video-titre" className="text-sm font-semibold text-dj-texte">{t.entete}</h2>
            <p className="truncate text-xs text-dj-texte-muet">{fichier.name}</p>
          </div>
          <button
            type="button"
            onClick={fermer}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
            aria-label={t.ariaFermer}
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {!conversationId && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-dj-texte">
              {t.conversationRequise}
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
                {t.reessayer}
              </button>
            </div>
          )}

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-dj-texte-muet">{t.apercuEtSelection}</span>
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
                {selectionnerZone ? t.dessinerZone : t.selectionnerZone}
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
                  controls={!selectionnerZone}
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
                  {t.preparationApercu}
                </div>
              )}
              {apercuZone && (
                <div
                  className="pointer-events-none absolute border-2 border-sky-400 bg-sky-400/20"
                  style={apercuZone}
                  aria-label={t.ariaZoneSelectionnee}
                />
              )}
              {selectionnerZone && styleCadreAffiche && (
                <div
                  className="pointer-events-none absolute border border-dashed border-white/45 bg-transparent"
                  style={styleCadreAffiche}
                />
              )}
            </div>
            {selectionnerZone && (
              <p className="mt-2 text-xs text-dj-texte-muet">
                {t.aideZone}
              </p>
            )}
            {zone && !selectionnerZone && (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-dj-texte-muet">
                <span><Check size={13} className="mr-1 inline" /> {t.zoneSelectionnee}</span>
                <button
                  type="button"
                  onClick={() => { setZone(null); zoneRef.current = null; }}
                  className="underline underline-offset-2 hover:text-dj-texte"
                >
                  {t.retirerZone}
                </button>
              </div>
            )}
          </div>

          <section className="rounded-xl border border-dj-bordure p-3.5 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium text-dj-texte">
                <Clock3 size={16} />
                {t.intervalle}
              </div>
              <button
                type="button"
                onClick={reinitialiserIntervalle}
                className="inline-flex items-center gap-1.5 text-xs text-dj-texte-muet hover:text-dj-texte"
              >
                <RotateCcw size={12} /> {t.toutelaVideo}
              </button>
            </div>
            <p className="mb-3 text-xs text-dj-texte-muet">
              {intervalleActif
                ? t.intervalleChoisi(horodatage(debut), horodatage(fin))
                : t.dureeEtConsigne(horodatage(duree))}
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-2 text-xs text-dj-texte-muet">
                  <span>{t.debut}</span><span className="tabular-nums">{horodatage(debut)}</span>
                </span>
                <input
                  aria-label={t.ariaDebut}
                  type="range"
                  min={0}
                  max={Math.max(duree, 0.1)}
                  step={0.1}
                  value={debut}
                  onChange={(e) => {
                    const valeur = Math.min(Number(e.target.value), Math.max(0, fin - 0.1));
                    setDebut(valeur);
                    setIntervalleActif(true);
                    if (lecteurRef.current) lecteurRef.current.currentTime = valeur;
                  }}
                  disabled={!source || duree <= 0}
                  className="w-full accent-sky-500"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center justify-between gap-2 text-xs text-dj-texte-muet">
                  <span>{t.fin}</span><span className="tabular-nums">{horodatage(fin)}</span>
                </span>
                <input
                  aria-label={t.ariaFin}
                  type="range"
                  min={Math.min(debut + 0.1, Math.max(duree, 0.1))}
                  max={Math.max(duree, 0.1)}
                  step={0.1}
                  value={fin}
                  onChange={(e) => {
                    const valeur = Math.max(debut + 0.1, Math.min(Number(e.target.value), duree));
                    setFin(valeur);
                    setIntervalleActif(true);
                    if (lecteurRef.current) lecteurRef.current.currentTime = valeur;
                  }}
                  disabled={!source || duree <= 0}
                  className="w-full accent-sky-500"
                />
              </label>
            </div>
          </section>

          <section>
            <label htmlFor="demande-video-clovis" className="mb-2 block text-sm font-medium text-dj-texte">
              {t.questionModification}
            </label>
            <textarea
              id="demande-video-clovis"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder={t.exemple}
              className="w-full resize-y rounded-xl border border-dj-bordure bg-dj-surface px-3.5 py-3 text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet/70 focus:border-sky-500"
            />
            <p className="mt-1.5 text-xs text-dj-texte-muet">
              {t.aideOperations}
            </p>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-dj-bordure bg-dj-surface px-4 py-3 sm:px-5">
          <div className="text-xs text-dj-texte-muet">
            {televersement ? (
              <span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> {t.preparationVideo}</span>
            ) : source ? (
              <span className="inline-flex items-center gap-1.5"><Check size={14} /> {t.videoPrete}</span>
            ) : (
              <span>{t.invitationSelection}</span>
            )}
          </div>
          {selectionFaite && (
            <button
              type="button"
              onClick={envoyer}
              disabled={!peutEnvoyer}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-dj-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t.demander}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
