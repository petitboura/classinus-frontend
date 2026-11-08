"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { RENDUS_EFFET, renduEffet, type EffetHiggsfield } from "@/lib/effetsHiggsfield";
import { estGenerationDisponible } from "@/lib/higgsfieldGeneration";
import { CarteEffet } from "@/components/higgsfield/CarteEffetHiggsfield";
import { BarreFiltresHiggsfield } from "@/components/higgsfield/BarreFiltresHiggsfield";

// SECTION UNIQUE des 4 onglets Higgsfield (Catalogue, Genjutsu, Viral, Marketing Studio).
// Règle de Bourama : ces onglets ne doivent jamais différer. Tout le comportement commun vit
// ici : barre de filtres, recherche, compteurs, chargement au défilement, cartes, plein écran,
// message "aucun résultat". Chaque onglet se limite à fournir ses données et son panneau de
// génération (voir CatalogueHiggsfield.tsx et SectionMarketingStudio.tsx).

const VisionneurHiggsfield = dynamic(
  () => import("@/components/higgsfield/VisionneurHiggsfield").then((m) => m.VisionneurHiggsfield),
  { ssr: false },
);

const PAS_CHARGEMENT = 48;

export type ElementSection = {
  effet: EffetHiggsfield;
  // Valeur de la seconde rangée de filtres (style pour le catalogue, catégorie pour Marketing Studio).
  second: string;
};

type OptionFiltre = { value: string; label: string };

function normaliser(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function texteRecherche(e: EffetHiggsfield) {
  return normaliser([e.nom, e.description, e.descriptionEn, e.badge || "", e.style].join(" "));
}

export function SectionEffetsHiggsfield({
  elements,
  optionsSecond,
  nom,
  libelleAria,
  enTete,
  panneauGenerer,
  precharger,
}: {
  elements: ElementSection[];
  // Seconde rangée de filtres, avec "Tous" en premier.
  optionsSecond: OptionFiltre[];
  // "effet" ou "preset" : sert au compteur, à la recherche et au message "aucun résultat".
  nom: string;
  libelleAria: string;
  enTete?: ReactNode;
  panneauGenerer: (effet: EffetHiggsfield, fermer: () => void) => ReactNode;
  precharger?: () => void;
}) {
  const [rendu, setRendu] = useState<string>("tous");
  const [second, setSecond] = useState<string>("tous");
  const [recherche, setRecherche] = useState("");
  const [nbVisibles, setNbVisibles] = useState(PAS_CHARGEMENT);
  const sentinelle = useRef<HTMLDivElement>(null);
  const [indexVisionneur, setIndexVisionneur] = useState<number | null>(null);
  const [effetAGenerer, setEffetAGenerer] = useState<EffetHiggsfield | null>(null);

  // Chargement en arrière-plan des panneaux, sans gêner l'affichage de la page.
  useEffect(() => {
    const lancer = () => {
      void import("@/components/higgsfield/VisionneurHiggsfield");
      precharger?.();
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(lancer, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(lancer, 1500);
    return () => window.clearTimeout(t);
  }, [precharger]);

  const q = normaliser(recherche.trim());
  const passentRecherche = useMemo(
    () => elements.filter((el) => !q || texteRecherche(el.effet).includes(q)),
    [elements, q],
  );

  const filtres = useMemo(
    () =>
      passentRecherche.filter(
        (el) => (rendu === "tous" || renduEffet(el.effet) === rendu) && (second === "tous" || el.second === second),
      ),
    [passentRecherche, rendu, second],
  );
  const effets = useMemo(() => filtres.map((el) => el.effet), [filtres]);

  // Chaque compteur reflète l'autre filtre et la recherche : Vidéo en haut change les nombres en bas, et inversement.
  const compteursRendu = useMemo(() => {
    const base = passentRecherche.filter((el) => second === "tous" || el.second === second);
    return {
      tous: base.length,
      image: base.filter((el) => renduEffet(el.effet) === "image").length,
      video: base.filter((el) => renduEffet(el.effet) === "video").length,
    };
  }, [passentRecherche, second]);

  const compteursSecond = useMemo(() => {
    const base = passentRecherche.filter((el) => rendu === "tous" || renduEffet(el.effet) === rendu);
    const compteur: Record<string, number> = { tous: base.length };
    for (const o of optionsSecond) {
      if (o.value !== "tous") compteur[o.value] = base.filter((el) => el.second === o.value).length;
    }
    return compteur;
  }, [passentRecherche, rendu, optionsSecond]);

  const nbFiltresActifs = [rendu !== "tous", second !== "tous", recherche.trim() !== ""].filter(Boolean).length;

  // Chargement au défilement : 48 cartes d'abord, puis 48 de plus à chaque fois que la fin de la
  // liste arrive à l'écran. Un changement de filtre repart de 48.
  const effetsAffiches = effets.slice(0, nbVisibles);

  useEffect(() => {
    setNbVisibles(PAS_CHARGEMENT);
  }, [rendu, second, recherche]);

  useEffect(() => {
    const el = sentinelle.current;
    if (!el || nbVisibles >= effets.length) return;
    const obs = new IntersectionObserver(
      ([entree]) => {
        if (entree.isIntersecting) setNbVisibles((n) => Math.min(n + PAS_CHARGEMENT, effets.length));
      },
      { rootMargin: "400px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [nbVisibles, effets.length]);

  const reinitialiser = useCallback(() => {
    setRecherche("");
    setRendu("tous");
    setSecond("tous");
  }, []);

  const ouvrirVisionneur = useCallback((i: number) => setIndexVisionneur(i), []);
  const fermerVisionneur = useCallback(() => setIndexVisionneur(null), []);
  const fermerGenerer = useCallback(() => setEffetAGenerer(null), []);

  function ouvrirGenerer(effet: EffetHiggsfield) {
    if (!estGenerationDisponible(effet)) return;
    setIndexVisionneur(null);
    setEffetAGenerer(effet);
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:py-6">
      {enTete}

      <BarreFiltresHiggsfield
        libelleAria={libelleAria}
        placeholderRecherche={`Rechercher un ${nom}…`}
        recherche={recherche}
        onRecherche={setRecherche}
        rendu={{
          options: [{ value: "tous", label: "Tous" }, ...RENDUS_EFFET],
          valeur: rendu,
          onChange: setRendu,
          compteurs: compteursRendu,
        }}
        second={{
          options: optionsSecond,
          valeur: second,
          onChange: setSecond,
          compteurs: compteursSecond,
        }}
        nbFiltresActifs={nbFiltresActifs}
        texteCompteur={`${effets.length} ${nom}${effets.length !== 1 ? "s" : ""} · ${elements.length} au total`}
        onReinitialiser={reinitialiser}
      />

      {effets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-semibold text-dj-texte">{`Aucun ${nom} pour ces filtres`}</p>
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

      {effetAGenerer ? panneauGenerer(effetAGenerer, fermerGenerer) : null}
    </div>
  );
}
