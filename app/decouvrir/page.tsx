import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { SECTIONS_DECOUVRIR } from "@/lib/sectionsDecouvrir";
import { QUESTIONS_DECOUVRIR_GENERAL } from "@/lib/questionsDecouvrir";
import { AccordeonQuestionsDecouvrir } from "@/components/AccordeonQuestionsDecouvrir";

export const metadata: Metadata = {
  title: "Découvrir Classinus : modèles d'IA, agents et applications connectées",
  description:
    "Découvre la plateforme qui donne accès aux grands modèles d'IA en Afrique : agents personnalisables, connecteurs MCP, recherche, création de documents et exécution de code.",
};

export default function PageDecouvrir() {
  return (
    <main className="mx-auto max-w-2xl">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">Guide des fonctionnalités</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-dj-texte">Découvrir Classinus</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">
          Classinus est le moyen d'accéder aux grands modèles d'IA en Afrique, avec des agents personnalisables, des connecteurs vers tes applications et des outils pour rechercher, créer des documents, développer et organiser tes projets. Les usages pédagogiques et les outils pour enseignants existent aussi, sans définir à eux seuls la plateforme. Explore les guides pour découvrir chaque fonction et ses conditions d'utilisation.
        </p>
      </header>

      <nav className="mt-8" aria-label="Sections de Classinus">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Explorer les fonctionnalités</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {SECTIONS_DECOUVRIR.map((section) => (
            <li key={section.slug}>
              <Link
                href={section.href}
                className="flex items-center justify-between gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute"
              >
                <span className="min-w-0">
                  <span className="block font-display text-base font-semibold text-dj-texte">{section.titre}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-dj-texte-muet">{section.description}</span>
                </span>
                <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <AccordeonQuestionsDecouvrir groupes={QUESTIONS_DECOUVRIR_GENERAL} />
    </main>
  );
}
