"use client";

import { GenerationsRecentesHiggsfield } from "./GenerationsRecentesHiggsfield";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import { BarreFiltresHiggsfield } from "@/components/higgsfield/BarreFiltresHiggsfield";
import dynamic from "next/dynamic";
import { EFFETS_HIGGSFIELD, RENDUS_EFFET, STYLES_EFFET, renduEffet, type EffetHiggsfield } from "@/lib/effetsHiggsfield";

// Les deux grands panneaux ne servent qu'au clic : on les sépare du code de la page,
// puis on les charge en arrière-plan dès que le navigateur est au repos.
const chargerVisionneur = () => import("@/components/higgsfield/VisionneurHiggsfield").then((m) => m.VisionneurHiggsfield);
const chargerGenerer = () => import("@/components/higgsfield/GenererHiggsfield").then((m) => m.PanneauGenererHiggsfield);
const VisionneurHiggsfield = dynamic(chargerVisionneur, { ssr: false });
const PanneauGenererHiggsfield = dynamic(chargerGenerer, { ssr: false });

// memo : ouvrir ou fermer le plein écran ne redessine plus les cartes du catalogue.
export const CarteEffet = memo(function CarteEffet({
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
  // Les images de carte utilisent la miniature redimensionnee quand elle existe (bien plus legere
  // que l'original, qui reste reserve au plein ecran). Si elle echoue, on retombe sur l'original.
  const [miniatureEchec, setMiniatureEchec] = useState(false);
  const [survolActif, setSurvolActif] = useState(false);
  const srcImage = effet.poster && !miniatureEchec ? effet.poster : effet.preview;
  const isVideo = effet.previewType === "video" || effet.preview.endsWith(".mp4") || effet.preview.endsWith(".webm");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setProche(entry.isIntersecting), { rootMargin: "700px 0px" });
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
            src={srcImage}
            alt={effet.nom}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            onError={() => {
              if (srcImage !== effet.preview) setMiniatureEchec(true);
              else setMediaError(true);
            }}
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
        {effet.libelleType ?? (renduEffet(effet) === "video" ? "VIDÉO" : "IMAGE")}
      </span>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-12 sm:px-3.5 sm:pb-3.5">
        <div className="flex flex-col gap-1">
          <span className="truncate text-sm font-bold leading-tight text-white sm:text-[15px]">{effet.nom}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{effet.style}</span>
        </div>
      </div>

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
  const [renduFiltre, setRenduFiltre] = useState<string>("tous");
  const [styleFiltre, setStyleFiltre] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");

  const badgeFiltres = [renduFiltre, styleFiltre].filter((v) => v !== "tous").length + (recherche.trim() ? 1 : 0);

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
      const okRendu = renduFiltre === "tous" || renduEffet(e) === renduFiltre;
      const okStyle = styleFiltre === "tous" || e.style === styleFiltre;
      if (!okRendu || !okStyle) return false;
      if (!q) return true;
      const hay = normaliser([e.nom, e.description, e.descriptionEn, e.badge || "", e.style, e.id].join(" "));
      return hay.includes(q);
    });
  }, [renduFiltre, styleFiltre, recherche, effetsDuCatalogue]);

  // Compteurs des puces : chacun reflete l'autre filtre et la recherche (meme logique que Marketing Studio).
  const passentRecherche = useMemo(() => {
    const q = normaliser(recherche.trim());
    return effetsDuCatalogue.filter((e) => {
      if (!q) return true;
      return normaliser([e.nom, e.description, e.descriptionEn, e.badge || "", e.style, e.id].join(" ")).includes(q);
    });
  }, [recherche, effetsDuCatalogue]);

  const compteursRendu = useMemo(() => {
    const base = passentRecherche.filter((e) => styleFiltre === "tous" || e.style === styleFiltre);
    return {
      tous: base.length,
      image: base.filter((e) => renduEffet(e) === "image").length,
      video: base.filter((e) => renduEffet(e) === "video").length,
    };
  }, [passentRecherche, styleFiltre]);

  const compteursStyle = useMemo(() => {
    const base = passentRecherche.filter((e) => renduFiltre === "tous" || renduEffet(e) === renduFiltre);
    const compteur: Record<string, number> = { tous: base.length };
    for (const st of STYLES_EFFET) {
      if (st.value !== "tous") compteur[st.value] = base.filter((e) => e.style === st.value).length;
    }
    return compteur;
  }, [passentRecherche, renduFiltre]);

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
      <BarreFiltresHiggsfield
        libelleAria="Filtres Higgsfield"
        placeholderRecherche="Rechercher un effet…"
        recherche={recherche}
        onRecherche={setRecherche}
        rendu={{
          options: [{ value: "tous", label: "Tous" }, ...RENDUS_EFFET],
          valeur: renduFiltre,
          onChange: setRenduFiltre,
          compteurs: compteursRendu,
        }}
        second={{
          options: STYLES_EFFET.map((st) => ({ value: st.value, label: st.label })),
          valeur: styleFiltre,
          onChange: setStyleFiltre,
          compteurs: compteursStyle,
        }}
        nbFiltresActifs={badgeFiltres}
        texteCompteur={`${filtres.length} effet${filtres.length !== 1 ? "s" : ""} · ${effetsDuCatalogue.length} au total`}
        onReinitialiser={() => {
          setRecherche("");
          setRenduFiltre("tous");
          setStyleFiltre("tous");
        }}
      />

      {filtres.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-semibold text-dj-texte">Aucun effet pour ces filtres</p>
          <p className="max-w-md text-sm leading-relaxed text-dj-texte-muet">
            Essaie un autre mot-clé ou réinitialise les filtres pour revoir tout le catalogue.
          </p>
          <button
            onClick={() => {
              setRecherche("");
              setRenduFiltre("tous");
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
        <PanneauGenererHiggsfield key={effetAGenerer.id} effet={effetAGenerer} onClose={() => setEffetAGenerer(null)} />
      ) : null}
    </div>
  );
}
