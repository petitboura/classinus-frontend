"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Play, Search, SlidersHorizontal, X } from "lucide-react";
import { PRESETS_MARKETING, TYPES_MARKETING, type MarketingPreset } from "@/lib/presetsMarketingStudio";
import type { EffetHiggsfield, StyleEffet, TypeEffet } from "@/lib/effetsHiggsfield";

// Section Marketing Studio de la grande page /higgsfield : 649 presets dans
// leur propre bloc, separe du catalogue d'effets, avec un filtre par categorie
// et une barre de recherche dediee. Un clic ouvre le meme visionneur plein
// ecran que le catalogue d'effets. La generation n'est pas encore disponible
// pour ces presets : le bouton Generer l'indique au lieu de lancer une demande.

// Meme chargement differe que le catalogue d'effets.
const VisionneurHiggsfield = dynamic(
  () => import("@/components/higgsfield/VisionneurHiggsfield").then((m) => m.VisionneurHiggsfield),
  { ssr: false }
);

function normaliser(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Le visionneur attend la meme forme que les effets du catalogue.
// Les presets n'ont ni description ni style propres : on affiche leur categorie.
function presetVersEffet(p: MarketingPreset): EffetHiggsfield {
  const categorie = TYPES_MARKETING.find((t) => t.value === p.type)?.label ?? p.type;
  const type: TypeEffet = p.previewType === "video" ? "image-to-video" : "image";
  return {
    id: "marketing-" + p.id,
    nom: p.nom,
    description: "Preset Marketing Studio · " + categorie,
    type,
    style: categorie as StyleEffet,
    modele: "Marketing Studio",
    preview: p.preview,
    previewType: p.previewType,
    poster: p.poster,
    promptChat: "",
  };
}

// memo : les cartes sont figees par preset, la grille ne redessine que les
// cartes ajoutees quand on affiche la suite.
const CarteMarketing = memo(function CarteMarketing({
  preset,
  index,
  onOuvrir,
}: {
  preset: MarketingPreset;
  index: number;
  onOuvrir: (index: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaError, setMediaError] = useState(false);
  const [proche, setProche] = useState(false);
  const [survolActif, setSurvolActif] = useState(false);

  const isVideo = preset.previewType === "video";

  useEffect(() => {
    const b = ref.current;
    if (!b) return;
    const obs = new IntersectionObserver(
      ([entry]) => setProche(entry.isIntersecting),
      { rootMargin: "300px 0px" }
    );
    obs.observe(b);
    return () => obs.disconnect();
  }, []);

  // La video n'existe en memoire que lorsque la carte est proche de l'ecran :
  // l'image fixe s'affiche tout de suite, la video se charge a l'approche, et
  // elle est liberee des qu'on s'en eloigne. 649 cartes ne doivent jamais
  // charger leurs videos d'un coup.
  useEffect(() => {
    const v = videoRef.current;
    if (v && v.currentSrc && !proche) {
      v.pause();
      v.load();
    }
  }, [proche]);

  useEffect(() => {
    if (!isVideo || mediaError || !proche) return;
    const v = videoRef.current;
    if (!v) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.25 }
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, [isVideo, mediaError, proche]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo || mediaError || !proche) return;
    v.muted = !survolActif;
    if (survolActif) v.play().catch(() => {});
  }, [survolActif, isVideo, mediaError, proche]);

  return (
    <button
      ref={ref}
      onClick={() => onOuvrir(index)}
      onMouseEnter={() => isVideo && !mediaError && setSurvolActif(true)}
      onMouseLeave={() => isVideo && !mediaError && setSurvolActif(false)}
      onFocus={() => isVideo && !mediaError && setSurvolActif(true)}
      onBlur={() => isVideo && !mediaError && setSurvolActif(false)}
      className="group relative flex aspect-[3/4] animate-dj-fade-in-rapide touch-manipulation flex-col justify-end overflow-hidden rounded-[20px] border border-dj-bordure bg-dj-surface-haute text-left shadow-sm transition-transform duration-300 ease-out md:transition-all md:duration-500 md:hover:-translate-y-1 md:hover:shadow-xl active:scale-[0.98]"
    >
      {!mediaError ? (
        isVideo ? (
          <video
            ref={videoRef}
            src={proche ? preset.preview : undefined}
            poster={preset.poster}
            muted={!survolActif}
            loop
            playsInline
            preload={proche ? "metadata" : "none"}
            onError={() => setMediaError(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preset.preview}
            alt={preset.nom}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => setMediaError(true)}
          />
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-dj-texte/10 via-dj-surface-haute to-dj-fond p-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-dj-texte text-dj-fond">
              <Play className="h-5 w-5 translate-x-px" />
            </div>
            <span className="text-xs font-semibold text-dj-texte-muet">Preview bientôt</span>
          </div>
        </div>
      )}

      <span className="pointer-events-none absolute left-2.5 top-2.5 rounded-full bg-black/75 px-2 py-1 text-[10px] font-bold leading-none tracking-wide text-white">
        MARKETING
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-12 sm:px-3.5 sm:pb-3.5">
        <div className="flex flex-col gap-1">
          <span className="truncate text-sm font-bold leading-tight text-white sm:text-[15px]">{preset.nom}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">
            {TYPES_MARKETING.find((t) => t.value === preset.type)?.label ?? preset.type}
          </span>
        </div>
      </div>
    </button>
  );
});

export function SectionMarketingStudio() {
  const [categorie, setCategorie] = useState<string>("tous");
  const [rendu, setRendu] = useState<string>("tous");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [toutCharger, setToutCharger] = useState(false);
  const [indexVisionneur, setIndexVisionneur] = useState<number | null>(null);
  const [avisGeneration, setAvisGeneration] = useState(false);

  // Affichage progressif : la grille demarre a 48 cartes et une barre
  // "Afficher plus" decharge le rendu au fil du defilement. Les 649 cartes
  // d'un coup ralentiraient le premier affichage de la page.
  const filtres = useMemo(() => {
    const q = normaliser(recherche.trim());
    return PRESETS_MARKETING.filter((p) => {
      const okCategorie = categorie === "tous" || p.type === categorie;
      const okRendu = rendu === "tous" || p.previewType === rendu;
      if (!okCategorie || !okRendu) return false;
      if (!q) return true;
      return normaliser(p.nom).includes(q);
    });
  }, [categorie, rendu, recherche]);

  const effets = useMemo(() => filtres.map(presetVersEffet), [filtres]);

  const actif = categorie !== "tous" || recherche.trim() !== "";

  const nbAffiches = toutCharger ? filtres.length : Math.min(filtres.length, 48);
  const affiches = filtres.slice(0, nbAffiches);

  const compterParRendu = useMemo(() => {
    const compteur: Record<string, number> = { image: 0, video: 0 };
    for (const p of PRESETS_MARKETING) {
      compteur[p.previewType] = (compteur[p.previewType] ?? 0) + 1;
    }
    return compteur;
  }, []);

  const compterParCategorie = useMemo(() => {
    const compteur: Record<string, number> = {};
    for (const p of PRESETS_MARKETING) {
      compteur[p.type] = (compteur[p.type] ?? 0) + 1;
    }
    return compteur;
  }, []);

  const ouvrirVisionneur = useCallback((i: number) => {
    setAvisGeneration(false);
    setIndexVisionneur(i);
  }, []);

  const fermerVisionneur = useCallback(() => setIndexVisionneur(null), []);

  // La generation de ces presets n'est pas encore prise en charge : on ferme
  // le visionneur et on l'indique clairement, sans rien lancer.
  const generationIndisponible = useCallback(() => {
    setIndexVisionneur(null);
    setAvisGeneration(true);
  }, []);

  return (
    <section className="flex flex-col gap-4 py-4 md:py-6" aria-label="Marketing Studio">
      <div className="flex flex-col gap-2 rounded-[20px] border border-dj-bordure bg-dj-surface px-4 py-3.5">
        <span className="text-base font-bold text-dj-texte">Marketing Studio</span>
        <p className="text-sm leading-relaxed text-dj-texte-muet">
          Des templates de pubs et de visuels produit prêts à l'emploi, inspirés du Marketing Studio Higgsfield.
          Ouvre un preset en plein écran pour voir le rendu. La génération arrive bientôt.
        </p>
      </div>

      <div
        className="sticky top-0 z-10 flex flex-col gap-3 rounded-b-xl border border-dj-bordure px-4 py-3 shadow-lg"
        style={{ backgroundColor: "var(--dj-surface)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFiltresOuverts((v) => !v)}
            aria-expanded={filtresOuverts}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtresOuverts || categorie !== "tous" || rendu !== "tous" || recherche.trim() !== ""
                ? "border-dj-texte bg-dj-texte text-dj-fond"
                : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
            }`}
          >
            {filtresOuverts ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
            Filtres
            {([categorie !== "tous", rendu !== "tous", recherche.trim() !== ""].filter(Boolean).length) > 0 && (
              <span className="ml-0.5 rounded-full bg-dj-fond px-1.5 py-0.5 text-[10px] font-bold leading-none text-dj-texte">
                ([categorie !== "tous", rendu !== "tous", recherche.trim() !== ""].filter(Boolean).length)
              </span>
            )}
          </button>
          <span className="text-xs font-semibold text-dj-texte-muet">
            {`${filtres.length} preset${filtres.length !== 1 ? "s" : ""} · ${PRESETS_MARKETING.length} au total`}
          </span>
        </div>

        {filtresOuverts && (
          <>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex w-full max-w-md items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-dj-texte-muet" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un preset Marketing Studio…"
              className="h-10 w-full rounded-full border border-dj-bordure bg-dj-fond py-2 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-dj-texte-muet focus:border-dj-texte"
            />
            {recherche ? (
              <button
                type="button"
                onClick={() => setRecherche("")}
                aria-label="Effacer la recherche Marketing Studio"
                className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          {[
            { value: "tous", label: "Tous" },
            { value: "image", label: "Image" },
            { value: "video", label: "Vidéo" },
          ].map((o) => (
            <button
              key={o.value}
              onClick={() => setRendu(o.value)}
              className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                rendu === o.value
                  ? "border-dj-texte bg-dj-texte text-dj-fond"
                  : "border-dj-bordure bg-transparent text-dj-texte-muet hover:border-dj-texte-muet hover:text-dj-texte"
              }`}
            >
              {o.label}
              {o.value !== "tous" && (
                <span className="ml-1.5 text-[10px] font-bold opacity-70">{compterParRendu[o.value] ?? 0}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setCategorie("tous")}
            className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
              categorie === "tous"
                ? "border-dj-texte bg-dj-texte text-dj-fond"
                : "border-dj-bordure bg-transparent text-dj-texte-muet hover:border-dj-texte-muet hover:text-dj-texte"
            }`}
          >
            Tous
          </button>
          {TYPES_MARKETING.map((t) => (
            <button
              key={t.value}
              onClick={() => setCategorie(t.value)}
              className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
                categorie === t.value
                  ? "border-dj-texte bg-dj-texte text-dj-fond"
                  : "border-dj-bordure bg-transparent text-dj-texte-muet hover:border-dj-texte-muet hover:text-dj-texte"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] font-bold opacity-70">{compterParCategorie[t.value] ?? 0}</span>
            </button>
          ))}
        </div>
          </>
        )}
      </div>

      {avisGeneration ? (
        <p className="rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3 text-sm leading-relaxed text-dj-texte-muet">
          La génération à partir des presets Marketing Studio n'est pas encore disponible. Elle arrivera bientôt.
        </p>
      ) : null}

      {affiches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-semibold text-dj-texte">Aucun preset pour ces filtres</p>
          <p className="max-w-md text-sm leading-relaxed text-dj-texte-muet">
            Essaie un autre mot-clé ou réinitialise les filtres pour revoir tout le catalogue.
          </p>
          <button
            onClick={() => {
              setRecherche("");
              setCategorie("tous");
              setRendu("tous");
            }}
            className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full bg-dj-texte px-5 py-2 text-sm font-bold text-dj-fond transition-transform duration-200 active:scale-95"
          >
            Tout afficher
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {affiches.map((p, i) => (
            <CarteMarketing key={p.id} preset={p} index={i} onOuvrir={ouvrirVisionneur} />
          ))}
        </div>
      )}

      {!toutCharger && filtres.length > nbAffiches ? (
        <button
          onClick={() => setToutCharger(true)}
          className="mx-auto inline-flex min-h-10 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface px-5 py-2 text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute active:scale-95"
        >
          Afficher plus ({filtres.length - nbAffiches} restants)
        </button>
      ) : null}

      {indexVisionneur !== null && effets[indexVisionneur] ? (
        <VisionneurHiggsfield
          effets={effets}
          indexDepart={indexVisionneur}
          onClose={fermerVisionneur}
          onGenerer={generationIndisponible}
        />
      ) : null}
    </section>
  );
}
