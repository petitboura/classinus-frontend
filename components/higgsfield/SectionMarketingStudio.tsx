"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PRESETS_MARKETING, TYPES_MARKETING, type MarketingPreset } from "@/lib/presetsMarketingStudio";
import type { EffetHiggsfield, StyleEffet, TypeEffet } from "@/lib/effetsHiggsfield";
import { CarteEffet, FiltreChips } from "@/components/higgsfield/CatalogueHiggsfield";

// Section Marketing Studio : meme affichage que le catalogue d'effets (cartes,
// panneau de filtres, visionneur). Les presets sont convertis dans la forme
// d'un effet. La generation n'est pas encore disponible pour eux.

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
    type,
    style: categorie as StyleEffet,
    modele: "Marketing Studio",
    preview: p.preview,
    previewType: p.previewType,
    poster: p.poster,
    promptChat: "",
    libelleType: estVideo ? "VIDÉO" : "IMAGE",
  };
}

export function SectionMarketingStudio() {
  const [categorie, setCategorie] = useState<string>("tous");
  const [rendu, setRendu] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [toutCharger, setToutCharger] = useState(false);
  const [indexVisionneur, setIndexVisionneur] = useState<number | null>(null);
  const [avisGeneration, setAvisGeneration] = useState(false);

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

  const actif = categorie !== "tous" || rendu !== "tous" || recherche.trim() !== "";
  const nbFiltresActifs = [categorie !== "tous", rendu !== "tous", recherche.trim() !== ""].filter(Boolean).length;

  // Affichage progressif : 48 cartes d'abord, puis "Afficher plus".
  const nbAffiches = toutCharger ? effets.length : Math.min(effets.length, 48);
  const effetsAffiches = effets.slice(0, nbAffiches);

  const reinitialiser = useCallback(() => {
    setRecherche("");
    setCategorie("tous");
    setRendu("tous");
  }, []);

  const ouvrirVisionneur = useCallback((i: number) => {
    setAvisGeneration(false);
    setIndexVisionneur(i);
  }, []);

  const fermerVisionneur = useCallback(() => setIndexVisionneur(null), []);

  // La generation de ces presets n'est pas encore prise en charge.
  const generationIndisponible = useCallback(() => {
    setIndexVisionneur(null);
    setAvisGeneration(true);
  }, []);

  return (
    <div className="flex flex-col gap-4 py-4 md:py-6">
      <div className="flex flex-col gap-1 rounded-[20px] border border-dj-bordure bg-dj-surface px-4 py-3.5">
        <span className="inline-flex w-fit items-center rounded-full bg-dj-texte px-2.5 py-1 text-[10px] font-bold leading-none tracking-wide text-dj-fond">
          BIENTÔT DISPONIBLE
        </span>
        <p className="text-sm leading-relaxed text-dj-texte-muet">
          La génération arrive bientôt. En attendant, explore les presets Marketing Studio et ouvre-en un en plein écran.
        </p>
      </div>
      <p className="max-w-2xl text-sm leading-relaxed text-dj-texte-muet">
        Explore les presets Marketing Studio, filtre par rendu et par catégorie, ouvre en plein écran pour comparer.
      </p>

      <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-b-xl border border-dj-bordure px-4 py-3 shadow-lg" style={{ backgroundColor: "var(--dj-surface)" }}>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFiltresOuverts((v) => !v)}
            aria-expanded={filtresOuverts}
            aria-label="Filtres Marketing Studio"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtresOuverts || actif
                ? "border-dj-texte bg-dj-texte text-dj-fond"
                : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
            }`}
          >
            {filtresOuverts ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
            Filtres
            {nbFiltresActifs > 0 && (
              <span className="ml-0.5 rounded-full bg-dj-fond px-1.5 py-0.5 text-[10px] font-bold leading-none text-dj-texte">
                {nbFiltresActifs}
              </span>
            )}
          </button>
          <span className="shrink-0 text-xs font-semibold text-dj-texte-muet">
            {`${effets.length} preset${effets.length !== 1 ? "s" : ""} · ${PRESETS_MARKETING.length} au total`}
          </span>
        </div>

        {filtresOuverts && (
          <>
            <div className="relative flex w-full items-center">
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-dj-texte-muet" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un preset…"
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
            <FiltreChips
              options={[
                { value: "tous", label: "Tous" },
                { value: "image", label: "Image" },
                { value: "video", label: "Vidéo" },
              ]}
              valeur={rendu}
              onChange={setRendu}
            />
            <FiltreChips
              options={[{ value: "tous", label: "Tous" }, ...TYPES_MARKETING.map((t) => ({ value: t.value, label: t.label }))]}
              valeur={categorie}
              onChange={setCategorie}
            />
            {actif ? (
              <button
                type="button"
                onClick={reinitialiser}
                className="inline-flex min-h-8 items-center self-start rounded-full border border-dj-bordure bg-transparent px-3 py-1.5 text-xs font-semibold text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
              >
                Réinitialiser les filtres
              </button>
            ) : null}
          </>
        )}
      </div>

      {avisGeneration ? (
        <p className="rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3 text-sm leading-relaxed text-dj-texte-muet">
          La génération à partir des presets Marketing Studio n'est pas encore disponible. Elle arrivera bientôt.
        </p>
      ) : null}

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

      {!toutCharger && effets.length > nbAffiches ? (
        <button
          type="button"
          onClick={() => setToutCharger(true)}
          className="mx-auto inline-flex min-h-10 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface px-5 py-2 text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute active:scale-95"
        >
          Afficher plus ({effets.length - nbAffiches} restants)
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
    </div>
  );
}
