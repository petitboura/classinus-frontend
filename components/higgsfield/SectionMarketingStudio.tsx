"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { PRESETS_MARKETING, TYPES_MARKETING, type MarketingPreset } from "@/lib/presetsMarketingStudio";
import { RENDUS_EFFET, type EffetHiggsfield, type StyleEffet, type TypeEffet } from "@/lib/effetsHiggsfield";
import { CarteEffet } from "@/components/higgsfield/CatalogueHiggsfield";
import { BarreFiltresHiggsfield } from "@/components/higgsfield/BarreFiltresHiggsfield";

// Section Marketing Studio : meme affichage que le catalogue d'effets (cartes,
// panneau de filtres, visionneur). Les presets sont convertis dans la forme
// d'un effet. Le bouton Generer ouvre le panneau de generation Marketing Studio.

// Panneau de generation : charge a la demande, comme le visionneur.
const PanneauGenererMarketingStudio = dynamic(
  () => import("@/components/higgsfield/GenererMarketingStudio").then((m) => m.PanneauGenererMarketingStudio),
  { ssr: false }
);

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

// Un preset devient un effet : meme carte, meme visionneur que le catalogue.
function presetVersEffet(p: MarketingPreset): EffetHiggsfield {
  const categorie = TYPES_MARKETING.find((t) => t.value === p.type)?.label ?? p.type;
  const estVideo = p.previewType === "video";
  const type: TypeEffet = estVideo ? "image-to-video" : "image";
  return {
    id: "marketing-" + p.id,
    nom: p.nom,
    description: "",
    descriptionEn: "",
    type,
    style: categorie as StyleEffet,
    modele: "Marketing Studio",
    preview: p.preview,
    previewType: p.previewType,
    poster: p.poster,
    libelleType: estVideo ? "VIDÉO" : "IMAGE",
  };
}

const PAS_CHARGEMENT = 48;

export function SectionMarketingStudio() {
  const [categorie, setCategorie] = useState<string>("tous");
  const [rendu, setRendu] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");
  const [nbVisibles, setNbVisibles] = useState(PAS_CHARGEMENT);
  const sentinelle = useRef<HTMLDivElement>(null);
  const [indexVisionneur, setIndexVisionneur] = useState<number | null>(null);
  const [presetAGenerer, setPresetAGenerer] = useState<MarketingPreset | null>(null);

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

  // Presets qui passent la recherche seule : base des compteurs des deux rangees de puces.
  const passentRecherche = useMemo(() => {
    const q = normaliser(recherche.trim());
    return PRESETS_MARKETING.filter((p) => !q || normaliser(p.nom).includes(q));
  }, [recherche]);

  // Chaque compteur reflete l'autre filtre : Vidéo en haut change les nombres en bas, et inversement.
  const compteursRendu = useMemo(() => {
    const base = passentRecherche.filter((p) => categorie === "tous" || p.type === categorie);
    return {
      tous: base.length,
      image: base.filter((p) => p.previewType === "image").length,
      video: base.filter((p) => p.previewType === "video").length,
    };
  }, [passentRecherche, categorie]);

  const compteursCategorie = useMemo(() => {
    const base = passentRecherche.filter((p) => rendu === "tous" || p.previewType === rendu);
    const compteur: Record<string, number> = { tous: base.length };
    for (const t of TYPES_MARKETING) {
      compteur[t.value] = base.filter((p) => p.type === t.value).length;
    }
    return compteur;
  }, [passentRecherche, rendu]);

  const nbFiltresActifs = [categorie !== "tous", rendu !== "tous", recherche.trim() !== ""].filter(Boolean).length;

  // Chargement au defilement : on affiche d'abord 48 cartes, puis 48 de plus a chaque
  // fois que la fin de la liste arrive a l'ecran. Un changement de filtre repart de 48.
  const effetsAffiches = effets.slice(0, nbVisibles);

  useEffect(() => {
    setNbVisibles(PAS_CHARGEMENT);
  }, [categorie, rendu, recherche]);

  useEffect(() => {
    const el = sentinelle.current;
    if (!el || nbVisibles >= effets.length) return;
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) setNbVisibles((n) => Math.min(n + PAS_CHARGEMENT, effets.length));
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nbVisibles, effets.length]);

  const reinitialiser = useCallback(() => {
    setRecherche("");
    setCategorie("tous");
    setRendu("tous");
  }, []);

  const ouvrirVisionneur = useCallback((i: number) => {
    setIndexVisionneur(i);
  }, []);

  const fermerVisionneur = useCallback(() => setIndexVisionneur(null), []);

  // Generer depuis le visionneur : on retrouve le preset a partir de l'id de l'effet ("marketing-" + id).
  const ouvrirGenerer = useCallback((effet: EffetHiggsfield) => {
    const id = effet.id.replace(/^marketing-/, "");
    const preset = PRESETS_MARKETING.find((p) => p.id === id);
    if (!preset) return;
    setIndexVisionneur(null);
    setPresetAGenerer(preset);
  }, []);

  return (
    <div className="flex flex-col gap-4 py-4 md:py-6">
      <p className="max-w-2xl text-sm leading-relaxed text-dj-texte-muet">
        Explore les presets Marketing Studio, filtre par rendu et par catégorie, ouvre-en un en plein écran puis génère avec l'image de ton produit.
      </p>

      <BarreFiltresHiggsfield
        libelleAria="Filtres Marketing Studio"
        placeholderRecherche="Rechercher un preset…"
        recherche={recherche}
        onRecherche={setRecherche}
        rendu={{
          options: [{ value: "tous", label: "Tous" }, ...RENDUS_EFFET],
          valeur: rendu,
          onChange: setRendu,
          compteurs: compteursRendu,
        }}
        second={{
          options: [{ value: "tous", label: "Tous" }, ...TYPES_MARKETING.map((t) => ({ value: t.value, label: t.label }))],
          valeur: categorie,
          onChange: setCategorie,
          compteurs: compteursCategorie,
        }}
        nbFiltresActifs={nbFiltresActifs}
        texteCompteur={`${effets.length} preset${effets.length !== 1 ? "s" : ""} · ${PRESETS_MARKETING.length} au total`}
        onReinitialiser={reinitialiser}
      />

      {effets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-semibold text-dj-texte">Aucun preset pour ces filtres</p>
          <p className="max-w-md text-sm leading-relaxed text-dj-texte-muet">
            Essaie un autre mot-clé ou réinitialise les filtres pour revoir tout le catalogue.
          </p>
          <button
            type="button"
            onClick={reinitialiser}
            className="mt-1 inline-flex min-h-10 items-center justify-center rounded-full bg-dj-texte px-5 py-2 text-sm font-bold text-dj-fond transition-transform duration-200 active:scale-95"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {effetsAffiches.map((e, i) => (
            <CarteEffet key={e.id} effet={e} index={i} onOuvrir={ouvrirVisionneur} />
          ))}
        </div>
      )}

      {effets.length > nbVisibles ? <div ref={sentinelle} className="h-px w-full" aria-hidden="true" /> : null}

      {indexVisionneur !== null && effets[indexVisionneur] ? (
        <VisionneurHiggsfield
          effets={effets}
          indexDepart={indexVisionneur}
          onClose={fermerVisionneur}
          onGenerer={ouvrirGenerer}
        />
      ) : null}

      {presetAGenerer ? <PanneauGenererMarketingStudio preset={presetAGenerer} onClose={() => setPresetAGenerer(null)} /> : null}
    </div>
  );
}
