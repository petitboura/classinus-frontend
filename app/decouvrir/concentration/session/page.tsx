import type { Metadata } from "next";
import { MiseEnPageDecouvrirConcentration } from "@/components/EnTeteDecouvrirConcentration";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Contrôle de session Classinus : coupe les distractions",
  description:
    "Coupe les sonneries et notifications, et active Ne pas déranger pendant toute la durée de ta session de travail.",
};

export default function PageDecouvrirConcentrationSession() {
  return (
    <MiseEnPageDecouvrirConcentration>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Contrôle de session</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Coupe les sonneries et notifications, et active Ne pas déranger le temps de ta session de travail.
        L&apos;activation se fait dans les réglages système du téléphone (Accessibilité), en dehors de Classinus.
      </p>
    </MiseEnPageDecouvrirConcentration>
  );
}
