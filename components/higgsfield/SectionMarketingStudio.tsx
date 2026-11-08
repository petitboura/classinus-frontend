"use client";

import dynamic from "next/dynamic";
import { PRESETS_MARKETING, TYPES_MARKETING, type MarketingPreset } from "@/lib/presetsMarketingStudio";
import type { EffetHiggsfield, StyleEffet, TypeEffet } from "@/lib/effetsHiggsfield";
import { SectionEffetsHiggsfield, type ElementSection } from "@/components/higgsfield/SectionEffetsHiggsfield";

// Onglet Marketing Studio. Même section que le catalogue (SectionEffetsHiggsfield) : les presets
// sont convertis dans la forme d'un effet, et le bouton Générer ouvre le panneau Marketing Studio.

const PanneauGenererMarketingStudio = dynamic(
  () => import("@/components/higgsfield/GenererMarketingStudio").then((m) => m.PanneauGenererMarketingStudio),
  { ssr: false },
);

// Un preset devient un effet : même carte, même visionneur que le catalogue.
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

const ELEMENTS: ElementSection[] = PRESETS_MARKETING.map((p) => ({ effet: presetVersEffet(p), second: p.type }));
const OPTIONS_CATEGORIE = [{ value: "tous", label: "Tous" }, ...TYPES_MARKETING.map((t) => ({ value: t.value, label: t.label }))];

export function SectionMarketingStudio() {
  return (
    <SectionEffetsHiggsfield
      elements={ELEMENTS}
      optionsSecond={OPTIONS_CATEGORIE}
      nom="preset"
      libelleAria="Filtres Marketing Studio"
      enTete={
        <p className="max-w-2xl text-sm leading-relaxed text-dj-texte-muet">
          Explore les presets Marketing Studio, filtre par rendu et par catégorie, ouvre-en un en plein écran puis génère avec l'image de ton produit.
        </p>
      }
      panneauGenerer={(effet, fermer) => {
        // On retrouve le preset à partir de l'id de l'effet ("marketing-" + id).
        const id = effet.id.replace(/^marketing-/, "");
        const preset = PRESETS_MARKETING.find((p) => p.id === id);
        return preset ? <PanneauGenererMarketingStudio preset={preset} onClose={fermer} /> : null;
      }}
    />
  );
}
