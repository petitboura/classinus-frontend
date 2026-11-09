"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, Clock, ImagePlus, Loader2, Sparkles, Trash2, X } from "lucide-react";
import { ActionsResultatHiggsfield } from "@/components/higgsfield/ActionsResultatHiggsfield";
import { CreditsImagesHiggsfield } from "@/components/higgsfield/CreditsImagesHiggsfield";
import { PlusDeCreditsHiggsfield } from "@/components/higgsfield/PlusDeCreditsHiggsfield";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";
import { lancerMarketingStudioHiggsfield, uploaderFichierHiggsfield } from "@/lib/higgsfieldApi";
import { TAILLE_MAX_FICHIER_OCTETS } from "@/lib/higgsfieldGeneration";
import { CONTRAT_MARKETING, FORMATS_MARKETING } from "@/lib/marketingStudioGeneration";
import { TYPES_MARKETING, type MarketingPreset } from "@/lib/presetsMarketingStudio";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { useMonParrainage } from "@/lib/useMonParrainage";
import { useSuiviGenerationHiggsfield } from "@/lib/useSuiviGenerationHiggsfield";

type ImageChoisie = { file: File; url: string };

function ChampImage({
  libelle,
  aide,
  image,
  desactive,
  onChoisir,
  onRetirer,
}: {
  libelle: string;
  aide: string;
  image: ImageChoisie | null;
  desactive: boolean;
  onChoisir: (f: File) => void;
  onRetirer: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-dj-texte">{libelle}</span>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChoisir(f);
          e.target.value = "";
        }}
      />
      {image ? (
        <div className="flex animate-dj-fade-in-rapide items-center gap-2 rounded-lg border border-dj-bordure bg-dj-fond p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.url} alt="" className="h-12 w-12 rounded object-cover" />
          <span className="flex-1 truncate text-xs font-semibold text-dj-texte">{image.file.name}</span>
          {!desactive && (
            <button
              type="button"
              onClick={onRetirer}
              aria-label="Retirer l'image"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-dj-surface-haute"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={desactive}
          className="flex h-14 items-center justify-center gap-2 rounded-xl border border-dashed border-dj-bordure bg-dj-surface text-xs font-semibold text-dj-texte-muet transition-colors hover:border-dj-texte hover:text-dj-texte disabled:opacity-60"
        >
          <ImagePlus className="h-4 w-4" /> Choisir une image
        </button>
      )}
      <span className="text-[11px] text-dj-texte-muet">{aide}</span>
    </div>
  );
}

export function PanneauGenererMarketingStudio({ preset, onClose }: { preset: MarketingPreset; onClose: () => void }) {
  const contrat = CONTRAT_MARKETING[preset.type];
  const categorie = TYPES_MARKETING.find((t) => t.value === preset.type)?.label ?? preset.type;

  const [titre, setTitre] = useState(() => preset.nom.slice(0, 80));
  const [produit, setProduit] = useState<ImageChoisie | null>(null);
  const [personne, setPersonne] = useState<ImageChoisie | null>(null);
  const [site, setSite] = useState("");
  const [prompt, setPrompt] = useState("");
  const [precisionOuverte, setPrecisionOuverte] = useState(false);
  const [format, setFormat] = useState("");
  const estImage = preset.previewType === "image";

  const suivi = useSuiviGenerationHiggsfield();
  const { etat, resultatUrl, erreur, progression, delaiDepasse } = suivi;
  // Une image coûte un crédit (retiré au lancement, rendu si la génération échoue) : le solde se relit à chaque étape.
  const { resume: resumeCredits, rafraichir: rafraichirCredits } = useMonParrainage();
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onClose);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") demarrerFermeture(onClose);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, demarrerFermeture]);

  // Les apercus sont des URL en memoire : liberees a la fermeture du panneau.
  const apercusRef = useRef<string[]>([]);
  useEffect(() => {
    apercusRef.current = [produit?.url, personne?.url].filter((u): u is string => !!u);
  }, [produit, personne]);
  useEffect(() => () => apercusRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function choisir(f: File, cible: "produit" | "personne") {
    const nouvelle = { file: f, url: URL.createObjectURL(f) };
    if (cible === "produit") {
      if (produit) URL.revokeObjectURL(produit.url);
      setProduit(nouvelle);
    } else {
      if (personne) URL.revokeObjectURL(personne.url);
      setPersonne(nouvelle);
    }
  }
  function retirer(cible: "produit" | "personne") {
    if (cible === "produit" && produit) {
      URL.revokeObjectURL(produit.url);
      setProduit(null);
    }
    if (cible === "personne" && personne) {
      URL.revokeObjectURL(personne.url);
      setPersonne(null);
    }
  }

  const enCours = etat === "upload" || etat === "lancement" || etat === "en_cours";

  useEffect(() => {
    if (estImage && (etat === "terminee" || etat === "echec" || etat === "bloquee" || etat === "annulee")) rafraichirCredits();
  }, [estImage, etat, rafraichirCredits]);

  // Plus de crédits : solde à zéro, ou refus du serveur. Le bloc « invite tes amis » remplace alors le message d'erreur.
  const creditsEpuises = estImage && !enCours && (suivi.codeErreur === "CREDITS_IMAGES_EPUISES" || (!!resumeCredits && resumeCredits.solde <= 0));
  const siteValide = site.trim().toLowerCase().startsWith("https://");
  const aUneSource = !!produit || (contrat.site && siteValide);

  const messageErreurLance = !titre.trim()
    ? "Donne un titre."
    : !aUneSource
      ? contrat.site
        ? "Ajoute l'image de ton produit ou l'adresse de ton site (https://)."
        : "Ajoute l'image de ton produit."
      : contrat.site && site.trim() && !siteValide
        ? "L'adresse du site doit commencer par https://."
        : null;
  const peutLancer = !enCours && !messageErreurLance;

  async function envoyer(img: ImageChoisie) {
    if (img.file.size > TAILLE_MAX_FICHIER_OCTETS) throw new Error(`"${img.file.name}" dépasse 15 Mo.`);
    return uploaderFichierHiggsfield(img.file);
  }

  async function handleGenerer() {
    suivi.effacerMessages();
    if (!peutLancer) {
      suivi.definirErreur(messageErreurLance || "Vérifie les champs.");
      return;
    }
    try {
      suivi.definirEtape("upload", 8);
      const urlProduit = produit ? await envoyer(produit) : "";
      suivi.definirEtape("upload", 30);
      const urlPersonne = personne ? await envoyer(personne) : "";
      suivi.definirEtape("lancement", 55);
      const res = await lancerMarketingStudioHiggsfield({
        preset_id: preset.id,
        preset_type: preset.type,
        preset_nom: preset.nom,
        titre: titre.trim(),
        ...(urlProduit ? { image_produit_url: urlProduit } : {}),
        ...(urlPersonne ? { image_avatar_url: urlPersonne } : {}),
        ...(contrat.site && siteValide ? { url_marque: site.trim() } : {}),
        ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
        // Une image garde le format de son apercu : Higgsfield ne propose pas de choix de format pour les images.
        ...(format && !estImage ? { format_image: format } : {}),
      });
      suivi.demarrerSuivi(res.request_id, titre.trim());
      if (estImage) rafraichirCredits();
    } catch (e: unknown) {
      suivi.echouer(e);
      if (estImage) rafraichirCredits();
    }
  }

  const afficherErreur = !!erreur && !enCours && suivi.codeErreur !== "CREDITS_IMAGES_EPUISES";
  const estVideo = !!resultatUrl && /\.(mp4|webm|mov)(\?|$)/i.test(resultatUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Générer avec Marketing Studio"
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
                <span>Générer</span> <span className="font-semibold text-dj-texte-muet">{preset.nom}</span>
              </span>
              <span className="truncate text-xs text-dj-texte-muet">Marketing Studio · {categorie}</span>
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
              maxLength={120}
              disabled={enCours}
              className="h-10 w-full rounded-xl border border-dj-bordure bg-dj-surface px-3 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
            />
          </label>

          <p className="text-[12px] leading-relaxed text-dj-texte-muet">
            Le preset décide du style. Ton résultat dépend surtout de l'image de ton produit.
          </p>

          {estImage && <CreditsImagesHiggsfield />}

          <ChampImage
            libelle={contrat.site ? "Image de ton produit (ou adresse de ton site)" : "Image de ton produit"}
            aide="PNG, JPG ou WebP, 15 Mo maximum. Une image nette, produit bien visible."
            image={produit}
            desactive={enCours}
            onChoisir={(f) => choisir(f, "produit")}
            onRetirer={() => retirer("produit")}
          />

          {contrat.personne && (
            <ChampImage
              libelle="Photo de la personne (optionnel)"
              aide="Si tu n'en ajoutes pas, Higgsfield choisit la personne."
              image={personne}
              desactive={enCours}
              onChoisir={(f) => choisir(f, "personne")}
              onRetirer={() => retirer("personne")}
            />
          )}

          {contrat.site && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-dj-texte">Adresse de ton site (optionnel si tu ajoutes une image)</span>
              <input
                value={site}
                onChange={(e) => setSite(e.target.value.slice(0, 500))}
                placeholder="https://monsite.com"
                inputMode="url"
                disabled={enCours}
                className="h-10 w-full rounded-xl border border-dj-bordure bg-dj-surface px-3 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
              />
            </label>
          )}

          {!estImage && (
          <div className={`flex flex-col gap-1.5 ${enCours ? "pointer-events-none opacity-60" : ""}`}>
            <span className="text-xs font-semibold text-dj-texte">Format</span>
            <SelectPersonnalise
              valeur={format}
              onChange={setFormat}
              options={FORMATS_MARKETING.map((f) => ({ id: f, label: f || "Celui du preset" }))}
            />
          </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setPrecisionOuverte((v) => !v)}
              aria-expanded={precisionOuverte}
              className="flex w-fit items-center gap-1.5 text-xs font-semibold text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              Ajouter une précision (optionnel)
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${precisionOuverte ? "rotate-180" : ""}`} />
            </button>
            {precisionOuverte && (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 5000))}
                rows={3}
                disabled={enCours}
                placeholder="Ex : ambiance chaude, fond clair…"
                className="w-full animate-dj-fade-in-rapide resize-none rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2 text-sm outline-none placeholder:text-dj-texte-muet focus:border-dj-texte disabled:opacity-60"
              />
            )}
          </div>

          {enCours && (
            <div className="flex animate-dj-fade-in-rapide flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
                {delaiDepasse ? <Clock className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                {delaiDepasse
                  ? "La génération prend plus de temps que prévu."
                  : etat === "upload"
                    ? "Envoi de tes images…"
                    : etat === "lancement"
                      ? "Lancement de la génération…"
                      : `Génération en cours… ${Math.round(progression)}%`}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-dj-bordure">
                <div className="h-full rounded-full bg-dj-texte transition-all duration-700" style={{ width: `${progression}%` }} />
              </div>
              <p className="text-[11px] leading-relaxed text-dj-texte-muet">
                Tu peux fermer cette fenêtre : on te prévient quand c'est prêt et le résultat arrive dans ta bibliothèque.
              </p>
              {delaiDepasse && (
                <button
                  type="button"
                  onClick={suivi.reprendreSuivi}
                  className="w-fit rounded-full bg-dj-texte px-3 py-1.5 text-xs font-semibold text-dj-fond transition-colors hover:bg-dj-texte/90"
                >
                  Vérifier à nouveau
                </button>
              )}
            </div>
          )}

          {creditsEpuises && <PlusDeCreditsHiggsfield />}

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
              {estVideo ? (
                <video src={resultatUrl} controls playsInline className="w-full rounded-xl bg-black" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={resultatUrl} alt="Résultat" className="w-full rounded-xl" />
              )}
              <ActionsResultatHiggsfield
                genre={estVideo ? "video" : "image"}
                requestId={suivi.requestId}
                url={resultatUrl}
                titre={titre.trim()}
                debloque={suivi.telechargementDebloque}
                onDebloque={suivi.marquerDebloque}
                aCote={
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    <Clock className="h-3 w-3" /> Enregistré dans ta bibliothèque
                  </span>
                }
              />
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
