"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Clock, Download, ExternalLink, ImagePlus, Loader2, Sparkles, Trash2, Upload, Video, X } from "lucide-react";
import { CaseACocher } from "@/components/CaseACocher";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";
import type { EffetHiggsfield } from "@/lib/effetsHiggsfield";
import { lancerGenjutsuHiggsfield, lancerImageHiggsfield, lancerVideoHiggsfield, uploaderFichierHiggsfield } from "@/lib/higgsfieldApi";
import {
  DUREES_VIDEO,
  FORMATS_IMAGE,
  FORMATS_VIDEO,
  MAX_IMAGES_REFERENCE,
  QUALITES_IMAGE,
  QUALITES_VIDEO,
  RESOLUTIONS_GENJUTSU,
  TAILLE_MAX_FICHIER_OCTETS,
  familleEffet,
  modeleBackend,
  optionsDepuisValeurs,
  type FichierPreview,
} from "@/lib/higgsfieldGeneration";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { useSuiviGenerationHiggsfield } from "@/lib/useSuiviGenerationHiggsfield";

const CLASSE_BLOC_OPTIONS = "m-0 flex min-w-0 flex-col gap-3 rounded-xl border border-dj-bordure bg-dj-surface p-3 transition-opacity duration-200";
const CLASSE_LIBELLE_CHAMP = "text-[11px] font-semibold text-dj-texte-muet";

function creerApercu(file: File): FichierPreview {
  return { file, url: URL.createObjectURL(file), type: file.type.startsWith("video/") ? "video" : "image" };
}

function libererApercus(apercus: FichierPreview[]) {
  for (const a of apercus) URL.revokeObjectURL(a.url);
}

function tailleEnMo(octets: number): string {
  return `${(octets / 1024 / 1024).toFixed(2)} Mo`;
}

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
  const [precisionOuverte, setPrecisionOuverte] = useState(false);

  const [fichiersVideo, setFichiersVideo] = useState<FichierPreview[]>([]);
  const [fichiersImage, setFichiersImage] = useState<FichierPreview[]>([]);
  const inputVideoRef = useRef<HTMLInputElement>(null);
  const inputImageRef = useRef<HTMLInputElement>(null);

  const suivi = useSuiviGenerationHiggsfield();
  const { etat, requestId, resultatUrl, erreur, progression, delaiDepasse } = suivi;

  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onClose);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") demarrerFermeture(onClose);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, demarrerFermeture]);

  // Les aperçus créent des URL en mémoire : elles sont libérées à la fermeture du panneau.
  const apercusRef = useRef<FichierPreview[]>([]);
  useEffect(() => {
    apercusRef.current = [...fichiersVideo, ...fichiersImage];
  }, [fichiersVideo, fichiersImage]);
  useEffect(() => () => libererApercus(apercusRef.current), []);

  function ajouterFichiers(nouveaux: FileList | null, cible: "video" | "image") {
    if (!nouveaux || nouveaux.length === 0) return;
    const apercus = Array.from(nouveaux).map(creerApercu);
    if (cible === "video") {
      libererApercus(fichiersVideo);
      libererApercus(apercus.slice(1));
      setFichiersVideo(apercus.slice(0, 1));
      return;
    }
    const total = [...fichiersImage, ...apercus];
    libererApercus(total.slice(MAX_IMAGES_REFERENCE));
    setFichiersImage(total.slice(0, MAX_IMAGES_REFERENCE));
  }

  function retirerVideo(idx: number) {
    libererApercus(fichiersVideo.filter((_, i) => i === idx));
    setFichiersVideo((p) => p.filter((_, i) => i !== idx));
  }
  function retirerImage(idx: number) {
    libererApercus(fichiersImage.filter((_, i) => i === idx));
    setFichiersImage((p) => p.filter((_, i) => i !== idx));
  }

  const enCours = etat === "upload" || etat === "lancement" || etat === "en_cours";

  const peutLancer =
    titre.trim().length >= 1 &&
    titre.trim().length <= 120 &&
    !enCours &&
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

  async function uploaderUnFichier(file: File) {
    if (file.size > TAILLE_MAX_FICHIER_OCTETS) throw new Error(`"${file.name}" dépasse 15 Mo.`);
    return uploaderFichierHiggsfield(file);
  }

  async function handleGenerer() {
    suivi.effacerMessages();
    if (messageErreurLance || !peutLancer) {
      suivi.definirErreur(messageErreurLance || "Vérifie les champs.");
      return;
    }

    try {
      suivi.definirEtape("upload", 8);

      let videoUrl = "";
      let imageUrls: string[] = [];

      if (famille === "genjutsu") {
        videoUrl = await uploaderUnFichier(fichiersVideo[0].file);
        suivi.definirEtape("upload", 30);
        imageUrls = await Promise.all(fichiersImage.map((fi) => uploaderUnFichier(fi.file)));
        suivi.definirEtape("upload", 55);
      } else if (famille === "video") {
        if (fichiersImage.length > 0) {
          imageUrls = await Promise.all(fichiersImage.slice(0, 1).map((fi) => uploaderUnFichier(fi.file)));
        }
        suivi.definirEtape("upload", 45);
      } else if (fichiersImage.length > 0) {
        imageUrls = await Promise.all(fichiersImage.map((fi) => uploaderUnFichier(fi.file)));
        suivi.definirEtape("upload", 45);
      }

      suivi.definirEtape("lancement", 60);

      let res: { request_id: string; titre: string };
      if (famille === "genjutsu") {
        if (modeleDefaut === "genjutsu-restyle" && !presetId.trim()) throw new Error("Ce modèle demande l'identifiant du preset.");
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

      suivi.demarrerSuivi(res.request_id, titre.trim());
    } catch (e: unknown) {
      suivi.echouer(e);
    }
  }

  const afficherErreur = !!erreur && !enCours;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Générer avec Higgsfield"
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 pb-[var(--dj-barre-onglets-web,0px)] backdrop-blur-sm md:items-center md:p-6 md:pb-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
    >
      <div className="absolute inset-0" onClick={fermer} aria-hidden />
      <div
        className={`relative flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[20px] border border-dj-bordure bg-dj-fond shadow-2xl md:rounded-[20px] ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
      >
        <div className="flex items-center justify-between border-b border-dj-bordure px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-dj-texte text-dj-fond">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold leading-none text-dj-texte">
                <span>Générer</span> <span className="font-semibold text-dj-texte-muet">{effet.nom}</span>
              </span>
              <span className="truncate text-xs text-dj-texte-muet">
                {effet.badge || effet.style} · {famille} · {modeleDefaut}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={fermer}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dj-bordure text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
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

          {famille === "genjutsu" ? (
            // Pour Genjutsu, la transformation vient de la vidéo et des images de l'utilisateur, pas d'un texte :
            // le champ reste disponible mais replié, pour ne pas laisser croire qu'il faut écrire quelque chose.
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setPrecisionOuverte((o) => !o)}
                aria-expanded={precisionOuverte}
                disabled={enCours}
                className="flex w-fit items-center gap-1.5 text-xs font-semibold text-dj-texte transition-colors hover:text-dj-texte-muet disabled:opacity-60"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${precisionOuverte ? "rotate-180" : ""}`} />
                <span>
                  Ajouter une précision <span className="font-normal text-dj-texte-muet">(optionnel)</span>
                </span>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${precisionOuverte ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden" aria-hidden={!precisionOuverte}>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    tabIndex={precisionOuverte ? 0 : -1}
                    placeholder={effet.description || "Décris ce que tu veux…"}
                    disabled={enCours}
                    className="w-full resize-none rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
                  />
                </div>
              </div>
            </div>
          ) : (
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
          )}

          {famille === "genjutsu" && (
            <fieldset disabled={enCours} className={`${CLASSE_BLOC_OPTIONS} ${enCours ? "opacity-60" : ""}`}>
              <span className="text-xs font-semibold text-dj-texte">Options Genjutsu</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Résolution</span>
                  <SelectPersonnalise options={optionsDepuisValeurs(RESOLUTIONS_GENJUTSU)} valeur={resolutionGenjutsu} onChange={setResolutionGenjutsu} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Modèle</span>
                  <span className="flex min-h-[38px] items-center rounded-lg border border-dj-bordure bg-dj-fond px-2 text-xs font-medium text-dj-texte-muet">{modeleDefaut}</span>
                </div>
              </div>
              {modeleDefaut === "genjutsu-restyle" && (
                <label className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Preset ID (requis pour restyle)</span>
                  <input
                    value={presetId}
                    onChange={(e) => setPresetId(e.target.value)}
                    placeholder="Identifiant du preset"
                    className="h-9 w-full rounded-lg border border-dj-bordure bg-dj-fond px-2 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
                  />
                </label>
              )}
            </fieldset>
          )}

          {famille === "video" && (
            <fieldset disabled={enCours} className={`${CLASSE_BLOC_OPTIONS} ${enCours ? "opacity-60" : ""}`}>
              <span className="text-xs font-semibold text-dj-texte">Options vidéo</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Durée</span>
                  <SelectPersonnalise options={optionsDepuisValeurs(DUREES_VIDEO, "s")} valeur={String(duree)} onChange={(v) => setDuree(Number(v))} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Format</span>
                  <SelectPersonnalise options={optionsDepuisValeurs(FORMATS_VIDEO)} valeur={formatVideo} onChange={setFormatVideo} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Qualité</span>
                  <SelectPersonnalise options={optionsDepuisValeurs(QUALITES_VIDEO)} valeur={qualiteVideo} onChange={setQualiteVideo} />
                </div>
                <label className="flex cursor-pointer items-center gap-2 pt-5">
                  <CaseACocher checked={son} onChange={setSon} />
                  <span className="text-xs font-semibold text-dj-texte">Son</span>
                </label>
              </div>
            </fieldset>
          )}

          {famille === "image" && (
            <fieldset disabled={enCours} className={`${CLASSE_BLOC_OPTIONS} ${enCours ? "opacity-60" : ""}`}>
              <span className="text-xs font-semibold text-dj-texte">Options image</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Format</span>
                  <SelectPersonnalise options={optionsDepuisValeurs(FORMATS_IMAGE)} valeur={formatImage} onChange={setFormatImage} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className={CLASSE_LIBELLE_CHAMP}>Qualité</span>
                  <SelectPersonnalise options={optionsDepuisValeurs(QUALITES_IMAGE)} valeur={qualiteImage} onChange={setQualiteImage} />
                </div>
              </div>
            </fieldset>
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
                <input
                  ref={inputVideoRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    ajouterFichiers(e.target.files, "video");
                    e.target.value = "";
                  }}
                />
                {fichiersVideo.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => inputVideoRef.current?.click()}
                    disabled={enCours}
                    className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-fond p-4 text-dj-texte-muet transition-colors hover:border-dj-texte-muet hover:text-dj-texte disabled:opacity-60"
                  >
                    <Upload className="h-5 w-5" />
                    <span className="text-xs font-semibold">Cliquer pour ajouter une vidéo</span>
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    {fichiersVideo.map((fi, i) => (
                      <div key={fi.url} className="flex animate-dj-fade-in-rapide items-center gap-2 rounded-lg border border-dj-bordure bg-dj-fond p-2">
                        <video src={fi.url} muted playsInline className="h-12 w-20 rounded object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-dj-texte">{fi.file.name}</p>
                          <p className="text-[11px] text-dj-texte-muet">{tailleEnMo(fi.file.size)}</p>
                        </div>
                        {!enCours && (
                          <button
                            type="button"
                            onClick={() => retirerVideo(i)}
                            aria-label="Retirer la vidéo"
                            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-dj-surface-haute"
                          >
                            <Trash2 className="h-4 w-4 text-dj-texte-muet" />
                          </button>
                        )}
                      </div>
                    ))}
                    {!enCours && (
                      <button type="button" onClick={() => inputVideoRef.current?.click()} className="self-start text-xs font-semibold text-dj-texte underline">
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
                <input
                  ref={inputImageRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    ajouterFichiers(e.target.files, "image");
                    e.target.value = "";
                  }}
                />
                <div className="grid grid-cols-4 gap-2">
                  {fichiersImage.map((fi, i) => (
                    <div key={fi.url} className="group relative aspect-square animate-dj-fade-in-rapide overflow-hidden rounded-lg border border-dj-bordure bg-dj-fond">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fi.url} alt="" className="h-full w-full object-cover" />
                      {!enCours && (
                        <button
                          type="button"
                          onClick={() => retirerImage(i)}
                          aria-label="Retirer l'image"
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  {fichiersImage.length < MAX_IMAGES_REFERENCE && !enCours && (
                    <button
                      type="button"
                      onClick={() => inputImageRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-dj-bordure bg-dj-fond text-dj-texte-muet transition-colors hover:border-dj-texte-muet"
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px] font-semibold">Ajouter</span>
                    </button>
                  )}
                </div>
                {fichiersImage.length === 0 && <p className="text-xs text-amber-600">Au moins 1 image requise (ton visage ou ton personnage).</p>}
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
              <input
                ref={inputImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  ajouterFichiers(e.target.files, "image");
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                {fichiersImage.map((fi, i) => (
                  <div key={fi.url} className="relative h-16 w-16 animate-dj-fade-in-rapide overflow-hidden rounded-lg border border-dj-bordure">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fi.url} alt="" className="h-full w-full object-cover" />
                    {!enCours && (
                      <button
                        type="button"
                        onClick={() => retirerImage(i)}
                        aria-label="Retirer l'image"
                        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {fichiersImage.length < MAX_IMAGES_REFERENCE && !enCours && (
                  <button
                    type="button"
                    onClick={() => inputImageRef.current?.click()}
                    className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-dj-bordure bg-dj-fond text-dj-texte-muet transition-colors hover:border-dj-texte-muet"
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
              <input
                ref={inputImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  ajouterFichiers(e.target.files, "image");
                  e.target.value = "";
                }}
              />
              {fichiersImage.length === 0 ? (
                <button
                  type="button"
                  onClick={() => inputImageRef.current?.click()}
                  disabled={enCours}
                  className="flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-dj-bordure bg-dj-fond p-3 text-dj-texte-muet transition-colors hover:border-dj-texte-muet disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-xs font-semibold">Ajouter une image</span>
                </button>
              ) : (
                <div className="flex animate-dj-fade-in-rapide items-center gap-2 rounded-lg border border-dj-bordure bg-dj-fond p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fichiersImage[0].url} alt="" className="h-12 w-20 rounded object-cover" />
                  <span className="flex-1 truncate text-xs font-semibold text-dj-texte">{fichiersImage[0].file.name}</span>
                  {!enCours && (
                    <button
                      type="button"
                      onClick={() => retirerImage(0)}
                      aria-label="Retirer l'image"
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-dj-surface-haute"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {enCours && (
            <div className="flex animate-dj-fade-in-rapide flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
                {delaiDepasse ? <Clock className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                {delaiDepasse
                  ? "La génération prend plus de temps que prévu."
                  : etat === "upload"
                    ? "Envoi des fichiers…"
                    : etat === "lancement"
                      ? "Lancement Higgsfield…"
                      : `Génération en cours… ${Math.round(progression)}%`}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-dj-bordure">
                <div className="h-full rounded-full bg-dj-texte transition-all duration-700" style={{ width: `${progression}%` }} />
              </div>
              {requestId && <p className="truncate text-[11px] text-dj-texte-muet">ID: {requestId}</p>}
              <div className="flex flex-wrap gap-2">
                {delaiDepasse && (
                  <button
                    type="button"
                    onClick={suivi.reprendreSuivi}
                    className="rounded-full bg-dj-texte px-3 py-1.5 text-xs font-semibold text-dj-fond transition-colors hover:bg-dj-texte/90"
                  >
                    Vérifier à nouveau
                  </button>
                )}
                {etat === "en_cours" && (
                  <button
                    type="button"
                    onClick={suivi.annuler}
                    className="rounded-full border border-dj-bordure bg-dj-fond px-3 py-1.5 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          )}

          {afficherErreur && (
            <div className="flex animate-dj-fade-in-rapide gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="leading-snug">{erreur}</span>
            </div>
          )}

          {etat === "terminee" && resultatUrl && (
            <div className="flex animate-dj-fade-in-rapide flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" /> Génération terminée !
              </div>
              {resultatUrl.includes(".mp4") ? (
                <video src={resultatUrl} controls playsInline className="w-full rounded-xl bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultatUrl} alt="Résultat" className="w-full rounded-xl" />
              )}
              <div className="flex flex-wrap gap-2">
                <a href={resultatUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-800">
                  <ExternalLink className="h-3.5 w-3.5" /> Ouvrir
                </a>
                <a href={resultatUrl} download className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-800 transition-colors hover:bg-emerald-100">
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </a>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  <Clock className="h-3 w-3" /> Enregistré dans ta bibliothèque
                </span>
              </div>
              <button type="button" onClick={suivi.reinitialiser} className="self-start text-xs font-semibold text-emerald-700 underline">
                Générer à nouveau
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-dj-bordure p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={fermer}
            className="flex flex-1 items-center justify-center rounded-full border border-dj-bordure bg-transparent px-4 py-3 text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface"
          >
            Fermer
          </button>
          {etat === "terminee" && resultatUrl ? (
            <button type="button" onClick={fermer} className="flex flex-1 items-center justify-center rounded-full bg-dj-texte px-4 py-3 text-sm font-bold text-dj-fond">
              Terminer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerer}
              disabled={!peutLancer}
              title={!peutLancer && !enCours ? messageErreurLance || "Vérifie les champs" : undefined}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold transition-colors ${
                !peutLancer ? "cursor-not-allowed bg-dj-texte/40 text-dj-fond" : "bg-dj-texte text-dj-fond hover:bg-dj-texte/90 active:scale-[0.98]"
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
