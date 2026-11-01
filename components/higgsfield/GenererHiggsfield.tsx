"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Download, ExternalLink, ImagePlus, Loader2, Sparkles, Trash2, Upload, Video, X } from "lucide-react";
import type { EffetHiggsfield } from "@/lib/effetsHiggsfield";
import {
  annulerHiggsfield,
  lancerGenjutsuHiggsfield,
  lancerImageHiggsfield,
  lancerVideoHiggsfield,
  statutHiggsfield,
  uploaderFichierHiggsfield,
  type HiggsfieldStatut,
} from "@/lib/higgsfieldApi";

// Mapping effet.modele (valeurs du catalogue CDN) -> modele backend
function modeleBackend(effet: EffetHiggsfield): string {
  if (effet.modele === "hf_mult_replace_object") return "genjutsu-object";
  if (effet.modele === "hf_mult_motion_control") return "genjutsu-motion";
  if (effet.modele === "higgsfield-viral") return "genjutsu-motion";
  if (effet.modele === "soul_2") return "grok";
  const connus = ["seedance", "kling", "grok", "genjutsu-motion", "genjutsu-object", "genjutsu-restyle", "genjutsu-light-motion", "genjutsu-light-object"];
  if (connus.includes(effet.modele)) return effet.modele;
  if (effet.type === "image") return "grok";
  if (effet.type === "video-to-video") return "genjutsu-motion";
  return "seedance";
}

function familleEffet(effet: EffetHiggsfield): "genjutsu" | "image" | "video" {
  if (effet.type === "image") return "image";
  if (effet.type === "video-to-video") return "genjutsu";
  return "video";
}

type EtatGen = "idle" | "upload" | "lancement" | "en_cours" | "terminee" | "echec" | "annulee" | "bloquee";
type FichierPreview = { file: File; url: string; type: "image" | "video" };

const DUREES_VIDEO = [4, 5, 8, 10, 15];
const FORMATS_VIDEO = ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"];
const QUALITES_VIDEO = ["480p", "720p", "1080p", "4k"];
const FORMATS_IMAGE = ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "2:3", "3:2"];
const QUALITES_IMAGE = ["1k", "2k"];
const RESOLUTIONS_GENJUTSU = ["480p", "720p", "1080p"];

export function PanneauGenererHiggsfield({ effet, onClose }: { effet: EffetHiggsfield; onClose: () => void }) {
  const famille = familleEffet(effet);
  const modeleDefaut = modeleBackend(effet);

  const [titre, setTitre] = useState(() => effet.nom.replace(/^Genjutsu ·\s*/, "").slice(0, 80));
  const [prompt, setPrompt] = useState("");
  const [duree, setDuree] = useState(5);
  const [formatVideo, setFormatVideo] = useState("16:9");
  const [qualiteVideo, setQualiteVideo] = useState("720p");
  const [son, setSon] = useState(true);
  const [formatImage, setFormatImage] = useState("auto");
  const [qualiteImage, setQualiteImage] = useState("1k");
  const [resolutionGenjutsu, setResolutionGenjutsu] = useState("720p");
  const [presetId, setPresetId] = useState("");

  const [fichiersVideo, setFichiersVideo] = useState<FichierPreview[]>([]);
  const [fichiersImage, setFichiersImage] = useState<FichierPreview[]>([]);
  const inputVideoRef = useRef<HTMLInputElement>(null);
  const inputImageRef = useRef<HTMLInputElement>(null);

  const [etat, setEtat] = useState<EtatGen>("idle");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [resultatUrl, setResultatUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [progression, setProgression] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef(0);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
  }, []);

  function ajouterFichiers(nouveaux: FileList | null, cible: "video" | "image") {
    if (!nouveaux) return;
    const arr = Array.from(nouveaux);
    const previews: FichierPreview[] = arr.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : "image",
    }));
    if (cible === "video") setFichiersVideo(() => previews.slice(0, 1));
    else setFichiersImage((prev) => [...prev, ...previews].slice(0, 8));
  }

  function retirerVideo(idx: number) {
    setFichiersVideo((p) => p.filter((_, i) => i !== idx));
  }
  function retirerImage(idx: number) {
    setFichiersImage((p) => p.filter((_, i) => i !== idx));
  }

  const peutLancer =
    titre.trim().length >= 1 &&
    titre.trim().length <= 120 &&
    etat !== "upload" &&
    etat !== "lancement" &&
    etat !== "en_cours" &&
    (famille === "image" ? prompt.trim().length >= 1 : true) &&
    (famille === "genjutsu" ? fichiersVideo.length === 1 && fichiersImage.length >= 1 : true);

  const messageErreurLance = !titre.trim()
    ? "Donne un titre."
    : famille === "image" && !prompt.trim()
      ? "Ajoute une description pour l'image."
      : famille === "genjutsu" && fichiersVideo.length !== 1
        ? "Ajoute 1 vidéo source (mp4/webm)."
        : famille === "genjutsu" && fichiersImage.length < 1
          ? "Ajoute au moins 1 image de référence."
          : null;

  const uploaderUnFichier = useCallback(async (file: File) => {
    if (file.size > 15 * 1024 * 1024) throw new Error(`"${file.name}" dépasse 15 Mo.`);
    return uploaderFichierHiggsfield(file);
  }, []);

  async function handleGenerer() {
    setErreur(null);
    setResultatUrl(null);
    const check = messageErreurLance;
    if (check || !peutLancer) {
      setErreur(check || "Vérifie les champs.");
      return;
    }

    try {
      setEtat("upload");
      setProgression(8);
      tickRef.current = 0;

      let videoUrl = "";
      let imageUrls: string[] = [];

      if (famille === "genjutsu") {
        videoUrl = await uploaderUnFichier(fichiersVideo[0].file);
        setProgression(30);
        imageUrls = await Promise.all(fichiersImage.map((fi) => uploaderUnFichier(fi.file)));
        setProgression(55);
      } else if (famille === "video") {
        if (fichiersImage.length > 0) {
          const urls = await Promise.all(fichiersImage.slice(0, 1).map((fi) => uploaderUnFichier(fi.file)));
          imageUrls = urls;
        }
        setProgression(45);
      } else if (famille === "image" && fichiersImage.length > 0) {
        imageUrls = await Promise.all(fichiersImage.map((fi) => uploaderUnFichier(fi.file)));
        setProgression(45);
      }

      setEtat("lancement");
      setProgression(60);

      let res: { request_id: string; titre: string };
      if (famille === "genjutsu") {
        if (modeleDefaut === "genjutsu-restyle" && !presetId.trim()) throw new Error("Ce modèle demande un preset_id.");
        res = await lancerGenjutsuHiggsfield({
          video_url: videoUrl,
          titre: titre.trim(),
          modele: modeleDefaut,
          prompt: prompt.trim() || undefined,
          images_reference: imageUrls,
          resolution: resolutionGenjutsu,
          ...(presetId.trim() ? { preset_id: presetId.trim() } : {}),
        });
      } else if (famille === "image") {
        res = await lancerImageHiggsfield({
          prompt: prompt.trim(),
          titre: titre.trim(),
          modele: modeleDefaut,
          format_image: formatImage,
          qualite: qualiteImage,
          ...(imageUrls.length ? { images_reference: imageUrls } : {}),
        });
      } else {
        res = await lancerVideoHiggsfield({
          prompt: prompt.trim(),
          titre: titre.trim(),
          modele: modeleDefaut === "grok" ? "seedance" : modeleDefaut,
          duree_secondes: duree,
          format_video: formatVideo,
          qualite: qualiteVideo,
          son,
          ...(imageUrls[0] ? { image_url: imageUrls[0] } : {}),
          ...(imageUrls.length > 1 ? { images_reference: imageUrls } : {}),
        });
      }

      setRequestId(res.request_id);
      setEtat("en_cours");
      setProgression(68);

      if (pollingRef.current) clearInterval(pollingRef.current);
      tickRef.current = 0;
      pollingRef.current = setInterval(async () => {
        tickRef.current += 1;
        setProgression((pp) => Math.min(93, pp + Math.max(1, 6 - tickRef.current * 0.4)));
        try {
          const s: HiggsfieldStatut = await statutHiggsfield(res.request_id, titre.trim());
          if (s.etat === "terminee" && s.url) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setResultatUrl(s.url);
            setEtat("terminee");
            setProgression(100);
          } else if (s.etat === "echec") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setEtat("echec");
            setErreur(s.erreur || "La génération a échoué. Réessaie.");
          } else if (s.etat === "bloquee") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setEtat("bloquee");
            setErreur(s.erreur || "Contenu bloqué par le filtre Higgsfield.");
          } else if (s.etat === "annulee") {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setEtat("annulee");
            setErreur("Génération annulée.");
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e ?? "");
          if (msg.includes("503") || msg.includes("HIGGSFIELD_NON_CONFIGURE") || msg.includes("NON_CONFIGURE")) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setEtat("echec");
            setErreur("Higgsfield n'est pas configuré (clé manquante). Contacte l'admin.");
          }
        }
        if (tickRef.current > 96) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setErreur("Toujours en cours côté Higgsfield — garde l'identifiant et vérifie ta bibliothèque.");
        }
      }, 5000);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e ?? "Erreur inconnue");
      setErreur(msg);
      setEtat("echec");
      setProgression(0);
    }
  }

  async function handleAnnuler() {
    if (!requestId) return;
    try {
      await annulerHiggsfield(requestId);
    } catch {
      /* best effort */
    }
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setEtat("annulee");
    setErreur("Génération annulée.");
  }

  function resetApresSucces() {
    setEtat("idle");
    setResultatUrl(null);
    setRequestId(null);
    setErreur(null);
    setProgression(0);
  }

  const enCours = etat === "upload" || etat === "lancement" || etat === "en_cours";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center md:p-6">
      <div className="absolute inset-0" onClick={onClose} aria-hidden />
      <div className="relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border border-dj-bordure bg-dj-fond shadow-2xl md:rounded-[20px]">
        <div className="flex items-center justify-between border-b border-dj-bordure px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dj-texte text-dj-fond">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold leading-none text-dj-texte">Générer — {effet.nom}</span>
              <span className="truncate text-xs text-dj-texte-muet">
                {effet.badge || effet.style} · {famille} · {modeleDefaut}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dj-bordure text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain p-4 pb-6">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-dj-texte">
              Titre <span className="font-normal text-dj-texte-muet">(requis, max 120)</span>
            </span>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value.slice(0, 120))}
              placeholder="Mon effet Higgsfield"
              maxLength={120}
              disabled={enCours}
              className="h-10 w-full rounded-xl border border-dj-bordure bg-dj-surface px-3 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
            />
            <span className="text-[11px] text-dj-texte-muet">{titre.length}/120</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-dj-texte">
              Description / prompt{" "}
              {famille === "image" ? <span className="text-red-500">*</span> : <span className="font-normal text-dj-texte-muet">(optionnel)</span>}
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder={effet.description || "Décris ce que tu veux…"}
              disabled={enCours}
              className="w-full resize-none rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
            />
          </label>

          {famille === "genjutsu" && (
            <div className="flex flex-col gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-3">
              <span className="text-xs font-semibold text-dj-texte">Options Genjutsu</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Résolution</span>
                  <select
                    value={resolutionGenjutsu}
                    onChange={(e) => setResolutionGenjutsu(e.target.value)}
                    disabled={enCours}
                    className="h-9 rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none focus:border-dj-texte disabled:opacity-60"
                  >
                    {RESOLUTIONS_GENJUTSU.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Modèle</span>
                  <span className="flex h-9 items-center rounded-lg border border-dj-bordure bg-dj-fond px-2 text-xs font-medium text-dj-texte-muet">{modeleDefaut}</span>
                </label>
              </div>
              {modeleDefaut === "genjutsu-restyle" && (
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Preset ID (requis pour restyle)</span>
                  <input
                    value={presetId}
                    onChange={(e) => setPresetId(e.target.value)}
                    placeholder="UUID du preset"
                    disabled={enCours}
                    className="h-9 w-full rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
                  />
                </label>
              )}
            </div>
          )}

          {famille === "video" && (
            <div className="flex flex-col gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-3">
              <span className="text-xs font-semibold text-dj-texte">Options vidéo</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Durée</span>
                  <select
                    value={duree}
                    onChange={(e) => setDuree(Number(e.target.value))}
                    disabled={enCours}
                    className="h-9 rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none focus:border-dj-texte disabled:opacity-60"
                  >
                    {DUREES_VIDEO.map((d) => (
                      <option key={d} value={d}>
                        {d}s
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Format</span>
                  <select
                    value={formatVideo}
                    onChange={(e) => setFormatVideo(e.target.value)}
                    disabled={enCours}
                    className="h-9 rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none focus:border-dj-texte disabled:opacity-60"
                  >
                    {FORMATS_VIDEO.map((ff) => (
                      <option key={ff} value={ff}>
                        {ff}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Qualité</span>
                  <select
                    value={qualiteVideo}
                    onChange={(e) => setQualiteVideo(e.target.value)}
                    disabled={enCours}
                    className="h-9 rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none focus:border-dj-texte disabled:opacity-60"
                  >
                    {QUALITES_VIDEO.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-5">
                  <input type="checkbox" checked={son} onChange={(e) => setSon(e.target.checked)} disabled={enCours} className="h-4 w-4 rounded border-dj-bordure" />
                  <span className="text-xs font-semibold text-dj-texte">Son</span>
                </label>
              </div>
            </div>
          )}

          {famille === "image" && (
            <div className="flex flex-col gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-3">
              <span className="text-xs font-semibold text-dj-texte">Options image</span>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Format</span>
                  <select
                    value={formatImage}
                    onChange={(e) => setFormatImage(e.target.value)}
                    disabled={enCours}
                    className="h-9 rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none focus:border-dj-texte disabled:opacity-60"
                  >
                    {FORMATS_IMAGE.map((ff) => (
                      <option key={ff} value={ff}>
                        {ff}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-dj-texte-muet">Qualité</span>
                  <select
                    value={qualiteImage}
                    onChange={(e) => setQualiteImage(e.target.value)}
                    disabled={enCours}
                    className="h-9 rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none focus:border-dj-texte disabled:opacity-60"
                  >
                    {QUALITES_IMAGE.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}

          {famille === "genjutsu" && (
            <>
              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-dj-texte">
                    <Video className="h-3.5 w-3.5" /> Vidéo source *
                  </span>
                  <span className="text-[11px] text-dj-texte-muet">mp4 / webm · ≤15 Mo</span>
                </div>
                <input ref={inputVideoRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => ajouterFichiers(e.target.files, "video")} />
                {fichiersVideo.length === 0 ? (
                  <button
                    onClick={() => inputVideoRef.current?.click()}
                    disabled={enCours}
                    className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-fond p-4 text-dj-texte-muet hover:border-dj-texte-muet hover:text-dj-texte disabled:opacity-60"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-xs font-semibold">Cliquer pour ajouter une vidéo</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    {fichiersVideo.map((fi2, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-dj-bordure bg-dj-fond p-2">
                        <video src={fi2.url} muted playsInline className="h-12 w-20 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-dj-texte">{fi2.file.name}</p>
                          <p className="text-[11px] text-dj-texte-muet">{(fi2.file.size / 1024 / 1024).toFixed(2)} Mo</p>
                        </div>
                        {!enCours && (
                          <button onClick={() => retirerVideo(i)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-dj-surface-haute">
                            <Trash2 className="h-4 w-4 text-dj-texte-muet" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!enCours && (
                      <button onClick={() => inputVideoRef.current?.click()} className="text-xs font-semibold text-dj-texte underline">
                        Remplacer
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-surface p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-dj-texte">
                    <ImagePlus className="h-3.5 w-3.5" /> Images de référence * (1 à 8)
                  </span>
                  <span className="text-[11px] text-dj-texte-muet">jpg / png / webp</span>
                </div>
                <input ref={inputImageRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(e) => ajouterFichiers(e.target.files, "image")} />
                <div className="grid grid-cols-4 gap-2">
                  {fichiersImage.map((fi2, i) => (
                    <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-dj-bordure bg-dj-fond">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fi2.url} alt="" className="h-full w-full object-cover" />
                      {!enCours && (
                        <button onClick={() => retirerImage(i)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {fichiersImage.length < 8 && !enCours && (
                    <button
                      onClick={() => inputImageRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-dj-bordure bg-dj-fond text-dj-texte-muet hover:border-dj-texte-muet"
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Ajouter</span>
                    </button>
                  )}
                </div>
                {fichiersImage.length === 0 && <p className="text-xs text-amber-600">Au moins 1 image requise (ton visage / personnage).</p>}
              </div>
            </>
          )}

          {famille === "image" && (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-surface p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-dj-texte">
                  <ImagePlus className="h-3.5 w-3.5" /> Images de référence (optionnel, max 8)
                </span>
              </div>
              <input ref={inputImageRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => ajouterFichiers(e.target.files, "image")} />
              <div className="flex flex-wrap gap-2">
                {fichiersImage.map((fi2, i) => (
                  <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg border border-dj-bordure">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fi2.url} alt="" className="h-full w-full object-cover" />
                    {!enCours && (
                      <button onClick={() => retirerImage(i)} className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white">
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {!enCours && (
                  <button
                    onClick={() => inputImageRef.current?.click()}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-dj-bordure bg-dj-fond text-dj-texte-muet hover:border-dj-texte-muet"
                  >
                    <ImagePlus className="h-4 w-4" />
                    <span className="text-[10px] font-semibold">Ajouter</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {famille === "video" && (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-surface p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-dj-texte">
                  <ImagePlus className="h-3.5 w-3.5" /> Image de départ (optionnel)
                </span>
                <span className="text-[11px] text-dj-texte-muet">jpg / png / webp</span>
              </div>
              <input ref={inputImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => ajouterFichiers(e.target.files, "image")} />
              {fichiersImage.length === 0 ? (
                <button
                  onClick={() => inputImageRef.current?.click()}
                  disabled={enCours}
                  className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-dj-bordure bg-dj-fond p-3 text-dj-texte-muet hover:border-dj-texte-muet disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs font-semibold">Ajouter une image</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dj-bordure bg-dj-fond p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fichiersImage[0].url} alt="" className="h-12 w-20 rounded object-cover" />
                  <span className="flex-1 truncate text-xs font-semibold text-dj-texte">{fichiersImage[0].file.name}</span>
                  {!enCours && (
                    <button onClick={() => retirerImage(0)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-dj-surface-haute">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {enCours && (
            <div className="flex flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
                <Loader2 className="h-4 w-4 animate-spin" />
                {etat === "upload"
                  ? "Envoi des fichiers…"
                  : etat === "lancement"
                    ? "Lancement Higgsfield…"
                    : `Génération en cours… ${Math.round(progression)}%`}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-dj-bordure">
                <div className="h-full rounded-full bg-dj-texte transition-all duration-700" style={{ width: `${progression}%` }} />
              </div>
              {requestId && <p className="truncate text-[11px] text-dj-texte-muet">ID: {requestId}</p>}
              <button onClick={handleAnnuler} className="self-start rounded-full border border-dj-bordure bg-dj-fond px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface-haute">
                Annuler
              </button>
            </div>
          )}

          {erreur && etat !== "en_cours" && etat !== "upload" && etat !== "lancement" && (
            <div className={`flex gap-2 rounded-xl border p-3 text-sm ${etat === "terminee" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
              {etat === "terminee" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
              <span className="leading-snug">{erreur}</span>
            </div>
          )}

          {etat === "terminee" && resultatUrl && (
            <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Génération terminée !
              </div>
              {resultatUrl.endsWith(".mp4") || resultatUrl.includes(".mp4") ? (
                <video src={resultatUrl} controls playsInline className="w-full rounded-xl bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultatUrl} alt="Résultat" className="w-full rounded-xl" />
              )}
              <div className="flex flex-wrap gap-2">
                <a href={resultatUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">
                  <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
                </a>
                <a href={resultatUrl} download className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100">
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </a>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <Clock className="h-3 w-3" /> Sauvé en bibliothèque
                </span>
              </div>
              <button onClick={resetApresSucces} className="self-start text-xs font-semibold text-emerald-700 underline">
                Générer à nouveau
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-dj-bordure p-4">
          <button onClick={onClose} className="flex flex-1 items-center justify-center rounded-full border border-dj-bordure bg-transparent px-4 py-3 text-sm font-semibold text-dj-texte hover:bg-dj-surface">
            Fermer
          </button>
          {etat === "terminee" && resultatUrl ? (
            <button onClick={onClose} className="flex flex-1 items-center justify-center rounded-full bg-dj-texte px-4 py-3 text-sm font-bold text-dj-fond">
              Terminer
            </button>
          ) : (
            <button
              onClick={handleGenerer}
              disabled={!peutLancer || enCours}
              title={!peutLancer ? messageErreurLance || "Vérifie les champs" : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-colors ${
                !peutLancer || enCours ? "cursor-not-allowed bg-dj-texte/40 text-dj-fond" : "bg-dj-texte text-dj-fond hover:bg-dj-texte/90 active:scale-[0.98]"
              }`}
            >
              {enCours ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {etat === "upload" ? "Envoi…" : etat === "lancement" ? "Lancement…" : etat === "en_cours" ? "En cours…" : "Générer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
