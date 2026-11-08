"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { GenerationsRecentesHiggsfield } from "./GenerationsRecentesHiggsfield";
import { SectionEffetsHiggsfield, type ElementSection } from "@/components/higgsfield/SectionEffetsHiggsfield";
import { EFFETS_HIGGSFIELD, STYLES_EFFET } from "@/lib/effetsHiggsfield";

// Onglets Catalogue, Genjutsu et Viral. Tout le comportement vit dans SectionEffetsHiggsfield,
// partagé avec Marketing Studio : ici on ne fournit que les données et le panneau de génération.

const chargerGenerer = () => import("@/components/higgsfield/GenererHiggsfield").then((m) => m.PanneauGenererHiggsfield);
const PanneauGenererHiggsfield = dynamic(chargerGenerer, { ssr: false });

function precharger() {
  void chargerGenerer();
}

export function CatalogueHiggsfield({ famille }: { famille?: "genjutsu" | "viral" } = {}) {
  // Sur une sous-section, seule la famille demandée est affichée (l'identifiant commence par son nom).
  const elements = useMemo<ElementSection[]>(
    () =>
      (famille ? EFFETS_HIGGSFIELD.filter((e) => e.id.startsWith(famille + "-")) : EFFETS_HIGGSFIELD).map((e) => ({
        effet: e,
        second: e.style,
      })),
    [famille],
  );

  return (
    <SectionEffetsHiggsfield
      elements={elements}
      optionsSecond={STYLES_EFFET.map((st) => ({ value: st.value, label: st.label }))}
      nom="effet"
      libelleAria="Filtres Higgsfield"
      precharger={precharger}
      panneauGenerer={(effet, fermer) => <PanneauGenererHiggsfield key={effet.id} effet={effet} onClose={fermer} />}
      enTete={
        <>
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
        </>
      }
    />
  );
}
