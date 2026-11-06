"use client";

import { GenerationsRecentesHiggsfield } from "./GenerationsRecentesHiggsfield";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import dynamic from "next/dynamic";
import { EFFETS_HIGGSFIELD, STYLES_EFFET, TYPES_EFFET, type EffetHiggsfield } from "@/lib/effetsHiggsfield";
import { useDefinirActionEnTete } from "@/lib/contexteEnTete";
import { ecrireEtatFiltres, useEtatFiltresHiggsfield } from "@/lib/filtresHiggsfieldStore";

// Les deux grands panneaux ne servent qu'au clic : on les sépare du code de la page,
// puis on les charge en arrière-plan dès que le navigateur est au repos.
const chargerVisionneur = () => import("@/components/higgsfield/VisionneurHiggsfield").then((m) => m.VisionneurHiggsfield);
const chargerGenerer = () => import("@/components/higgsfield/GenererHiggsfield").then((m) => m.PanneauGenererHiggsfield);
const VisionneurHiggsfield = dynamic(chargerVisionneur, { ssr: false });
const PanneauGenererHiggsfield = dynamic(chargerGenerer, { ssr: false });

function FiltreChips({
  label,
  options,
  valeur,
  onChange,
}: {
  label?: string;
  options: { value: string; label: string }[];
  valeur: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
      {label ? <span className="shrink-0 text-xs font-semibold text-dj-texte-muet">{label}</span> : null}
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-95 ${
            valeur === o.value
              ? "border-dj-texte bg-dj-texte text-dj-fond"
              : "border-dj-bordure bg-transparent text-dj-texte-muet hover:border-dj-texte-muet hover:text-dj-texte"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function BoutonFiltresEnTete() {
  const { ouvert, actif, badge, basculer } = useEtatFiltresHiggsfield();
  return (
    <button
      type="button"
      onClick={basculer}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        ouvert || actif
          ? "border-dj-texte bg-dj-texte text-dj-fond"
          : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
      }`}
      aria-expanded={ouvert}
      aria-label="Filtres Higgsfield"
    >
      {ouvert ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
      Filtres
      {badge > 0 && (
        <span className="ml-0.5 rounded-full bg-dj-fond px-1.5 py-0.5 text-[10px] font-bold leading-none text-dj-texte">
          {badge}
        </span>
      )}
    </button>
  );
}

// memo : ouvrir ou fermer le plein écran ne redessine plus les cartes du catalogue.
const CarteEffet = memo(function CarteEffet({
  effet,
  index,
  onOuvrir,
}: {
  effet: EffetHiggsfield;
  index: number;
  onOuvrir: (index: number) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // La vidéo n'existe en mémoire que lorsque la carte est proche de l'écran : l'image fixe
  // s'affiche tout de suite, la vidéo se charge à l'approche, et elle est libérée dès que la
  // carte s'éloigne. Sans cela, toutes les vidéos déjà passées restaient chargées en mémoire
  // et le téléphone ralentissait de plus en plus.
  const [proche, setProche] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [survolActif, setSurvolActif] = useState(false);
  const isVideo = effet.previewType === "video" || effet.preview.endsWith(".mp4") || effet.preview.endsWith(".webm");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setProche(entry.isIntersecting), { rootMargin: "300px 0px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Quand la carte s'éloigne, React retire la source de la vidéo ; load() force le navigateur
  // à vraiment libérer ce qu'il avait téléchargé.
  useEffect(() => {
    if (proche) return;
    const v = videoRef.current;
    if (v && v.currentSrc) {
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

  function activerSon() {
    if (!isVideo || mediaError) return;
    setSurvolActif(true);
  }
  function couperSon() {
    if (!isVideo || mediaError) return;
    setSurvolActif(false);
  }

  return (
    <button
      ref={ref}
      onClick={() => onOuvrir(index)}
      onMouseEnter={activerSon}
      onMouseLeave={couperSon}
      onFocus={activerSon}
      onBlur={couperSon}
      className="group relative flex aspect-[3/4] animate-dj-fade-in-rapide touch-manipulation flex-col justify-end overflow-hidden rounded-[20px] border border-dj-bordure bg-dj-surface-haute text-left shadow-sm transition-transform duration-300 ease-out md:transition-all md:duration-500 md:hover:-translate-y-1 md:hover:shadow-xl active:scale-[0.98]"
    >
      {!mediaError ? (
        isVideo ? (
          <video
            ref={videoRef}
            src={proche ? effet.preview : undefined}
            poster={effet.poster}
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
            src={effet.preview}
            alt={effet.nom}
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
        {effet.type === "video-to-video" ? "VIDÉO → VIDÉO" : effet.type === "image-to-video" ? "IMAGE → VIDÉO" : effet.type === "image" ? "IMAGE" : "AVATAR"}
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-12 sm:px-3.5 sm:pb-3.5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-bold leading-tight text-white sm:text-[15px]">{effet.nom}</span>
            {effet.badge ? (
              <span className="hidden shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold leading-none text-black min-[480px]:inline-flex">
                {effet.badge}
              </span>
            ) : null}
          </div>
          <span className="line-clamp-2 text-xs leading-snug text-white/80 sm:text-[13px]">{effet.description}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{effet.style}</span>
        </div>
      </div>

      {!mediaError && (
        <span className="pointer-events-none absolute bottom-2.5 right-2.5 inline-flex min-h-8 items-center gap-1 rounded-full bg-white px-3 py-2 text-[11px] font-bold leading-none text-black shadow">
          <Sparkles className="h-3.5 w-3.5" />
          Générer
        </span>
      )}
    </button>
  );
});

function normaliser(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function CatalogueHiggsfield({ famille }: { famille?: "genjutsu" | "viral" } = {}) {
  // Sur une sous-section, seule la famille demandee est affichee (l'identifiant commence par son nom).
  const effetsDuCatalogue = useMemo(
    () => (famille ? EFFETS_HIGGSFIELD.filter((e) => e.id.startsWith(famille + "-")) : EFFETS_HIGGSFIELD),
    [famille],
  );
  const [typeFiltre, setTypeFiltre] = useState<string>("tous");
  const [styleFiltre, setStyleFiltre] = useState<string>("tous");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [recherche, setRecherche] = useState("");

  const actif = typeFiltre !== "tous" || styleFiltre !== "tous" || recherche.trim() !== "";
  const badgeFiltres = [typeFiltre, styleFiltre].filter((v) => v !== "tous").length + (recherche.trim() ? 1 : 0);

  const basculerFiltres = useCallback(() => setFiltresOuverts((v) => !v), []);

  // Le bouton Filtres de l'en-tete lit son etat dans un magasin partage, au lieu
  // d'etre recree a chaque changement : il reste donc affiche en permanence.
  useEffect(() => {
    ecrireEtatFiltres({ ouvert: filtresOuverts, actif, badge: badgeFiltres, basculer: basculerFiltres });
  }, [filtresOuverts, actif, badgeFiltres, basculerFiltres]);

  const boutonFiltresEnTete = useMemo(() => <BoutonFiltresEnTete />, []);
  useDefinirActionEnTete(boutonFiltresEnTete);

  // Chargement en arrière-plan des panneaux, sans gêner l'affichage de la page.
  useEffect(() => {
    const lancer = () => {
      void chargerVisionneur();
      void chargerGenerer();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(lancer, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(lancer, 1500);
    return () => window.clearTimeout(t);
  }, []);

  const [indexVisionneur, setIndexVisionneur] = useState<number | null>(null);
  const [effetAGenerer, setEffetAGenerer] = useState<EffetHiggsfield | null>(null);

  const filtres = useMemo(() => {
    const q = normaliser(recherche.trim());
    return effetsDuCatalogue.filter((e) => {
      const okType = typeFiltre === "tous" || e.type === typeFiltre;
      const okStyle = styleFiltre === "tous" || e.style === styleFiltre;
      if (!okType || !okStyle) return false;
      if (!q) return true;
      const hay = normaliser([e.nom, e.description, e.badge || "", e.style, e.type, e.id].join(" "));
      return hay.includes(q);
    });
  }, [typeFiltre, styleFiltre, recherche, effetsDuCatalogue]);

  const ouvrirVisionneur = useCallback((i: number) => setIndexVisionneur(i), []);

  function ouvrirGenerer(effet: EffetHiggsfield) {
    setIndexVisionneur(null);
    setEffetAGenerer(effet);
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:py-6">
      <div className="flex flex-col gap-1 rounded-[20px] border border-dj-bordure bg-dj-surface px-4 py-3.5">
        <span className="inline-flex w-fit items-center rounded-full bg-dj-texte px-2.5 py-1 text-[10px] font-bold leading-none tracking-wide text-dj-fond">
          BIENTÔT DISPONIBLE
        </span>
        <p className="text-sm leading-relaxed text-dj-texte-muet">
          La génération arrive bientôt. En attendant, explore le catalogue et ouvre un effet en plein écran pour préparer ton idée.
        </p>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-dj-texte-muet">
        Explore les effets Higgsfield, filtre par type et style, ouvre en plein écran pour comparer, puis lance la
        génération directement avec tes images et vidéos.
      </p>
      <GenerationsRecentesHiggsfield />
      {filtresOuverts && (
        // Le panneau est collé tout en haut de la zone qui défile (sous l'en-tête), sans espace,
        // avec un fond plein : rien du contenu qui défile ne passe au travers.
        <div
          className="sticky top-0 z-20 flex max-h-[70dvh] animate-dj-fade-in-rapide flex-col gap-3 overflow-y-auto overscroll-contain rounded-b-xl border border-dj-bordure px-4 py-3 shadow-lg"
          style={{ backgroundColor: "var(--dj-surface)" }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex w-full max-w-md items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-dj-texte-muet" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un effet…"
                className="h-10 w-full rounded-full border border-dj-bordure bg-dj-fond py-2 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-dj-texte-muet focus:border-dj-texte"
              />
              {recherche ? (
                <button
                  type="button"
                  onClick={() => setRecherche("")}
                  aria-label="Effacer la recherche"
                  className="absolute right-1 flex h-8 w-8 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <span className="shrink-0 text-xs font-semibold text-dj-texte-muet">
              {`${filtres.length} effet${filtres.length !== 1 ? "s" : ""} · ${effetsDuCatalogue.length} au total`}
            </span>
          </div>
          <FiltreChips options={TYPES_EFFET as any} valeur={typeFiltre} onChange={setTypeFiltre} />
          <FiltreChips options={STYLES_EFFET as any} valeur={styleFiltre} onChange={setStyleFiltre} />
          {actif ? (
            <button
              type="button"
              onClick={() => {
                setRecherche("");
                setTypeFiltre("tous");
                setStyleFiltre("tous");
              }}
              className="inline-flex min-h-8 items-center self-start rounded-full border border-dj-bordure bg-transparent px-3 py-1.5 text-xs font-semibold text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
            >
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>
      )}
      {filtres.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-semibold text-dj-texte">Aucun effet pour ces filtres</p>
          <p className="max-w-md text-sm leading-relaxed text-dj-texte-muet">
            Essaie un autre mot-clé ou réinitialise les filtres pour revoir tout le catalogue.
          </p>
          <button
            onClick={() => {
              setRecherche("");
              setTypeFiltre("tous");
              setStyleFiltre("tous");
            }}
            className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full bg-dj-texte px-5 py-2 text-sm font-bold text-dj-fond transition-transform duration-200 active:scale-95"
          >
            Tout afficher
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {filtres.map((e, i) => (
            <CarteEffet key={e.id} effet={e} index={i} onOuvrir={ouvrirVisionneur} />
          ))}
        </div>
      )}

      {indexVisionneur !== null && filtres[indexVisionneur] ? (
        <VisionneurHiggsfield
          effets={filtres}
          indexDepart={indexVisionneur}
          onClose={() => setIndexVisionneur(null)}
          onGenerer={ouvrirGenerer}
        />
      ) : null}

      {effetAGenerer ? (
        <PanneauGenererHiggsfield effet={effetAGenerer} onClose={() => setEffetAGenerer(null)} />
      ) : null}
    </div>
  );
}
