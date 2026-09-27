import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_CONCENTRATION } from "@/lib/sectionsDecouvrir";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// texte validés par Bourama.
export const metadata: Metadata = {
  title: "Concentration Classinus : reste concentré pendant tes révisions",
  description:
    "Découvre comment Classinus t'aide à rester concentré : coupe les distractions pendant tes sessions de travail, et suis le temps passé sur chaque application.",
};

export default function PageDecouvrirConcentration() {
  return (
    <main className="mx-auto max-w-2xl">
      <Link
        href={ROUTES_DECOUVRIR.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-dj-texte">
        Concentration Classinus : reste concentré pendant tes révisions
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">
        Classinus peut t&apos;aider à rester concentré pendant que tu travailles. Voici les deux façons de
        t&apos;y aider.
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {SOUS_PAGES_DECOUVRIR_CONCENTRATION.map((sousPage) => (
          <li key={sousPage.slug}>
            <Link
              href={sousPage.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute"
            >
              <div>
                <p className="font-display text-base font-semibold text-dj-texte">{sousPage.titre}</p>
                <p className="mt-1 text-sm text-dj-texte-muet">{sousPage.description}</p>
              </div>
              <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
