import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { SECTIONS_DECOUVRIR } from "@/lib/sectionsDecouvrir";

// Chantier SEO/AEO de Classinus (26/09/2026, demande Bourama). Page mère
// de toute la famille /decouvrir : point d'entrée public qui liste les
// sections déjà documentées et pointe vers leur propre page. Une seule
// section pour l'instant (Bibliothèque), les prochaines rejoindront
// SECTIONS_DECOUVRIR (lib/sectionsDecouvrir.tsx) sans toucher ce fichier.
//
// Titre/description écrits pour ce chantier (rien de préexistant à
// reprendre ici, contrairement aux pages Bibliothèque) : ton factuel,
// jamais commercial, comme demandé par Bourama.
export const metadata: Metadata = {
  title: "Découvrir Classinus, la plateforme d'études avec IA",
  description:
    "Classinus est une plateforme éducative avec IA pour la classe. Découvre ses fonctionnalités, section par section.",
};

export default function PageDecouvrir() {
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-dj-texte">Découvrir Classinus</h1>
      <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">
        Classinus est un compagnon d&apos;études avec IA pour la classe. Voici ses fonctionnalités, présentées section
        par section.
      </p>

      <ul className="mt-8 flex flex-col gap-3">
        {SECTIONS_DECOUVRIR.map((section) => (
          <li key={section.slug}>
            <Link
              href={section.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute"
            >
              <div>
                <p className="font-display text-base font-semibold text-dj-texte">{section.titre}</p>
                <p className="mt-1 text-sm text-dj-texte-muet">{section.description}</p>
              </div>
              <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" />
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
