import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_CONCENTRATION } from "@/lib/sectionsDecouvrir";
import { QUESTIONS_DECOUVRIR_CONCENTRATION } from "@/lib/questionsDecouvrir";
import { AccordeonQuestionsDecouvrir } from "@/components/AccordeonQuestionsDecouvrir";

export const metadata: Metadata = {
  title: "Concentration Classinus : sessions de travail et temps d'écran",
  description:
    "Découvre les outils de concentration de Classinus : activation de Ne pas déranger pendant une session et suivi du temps passé sur les applications Android.",
};

export default function PageDecouvrirConcentration() {
  return (
    <main className="mx-auto max-w-2xl">
      <Link href={ROUTES_DECOUVRIR.accueil} className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline">
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>
      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">Organisation du travail</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-dj-texte">Concentration et temps d'écran</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">
          Quand tu commences une séance de travail, les notifications peuvent interrompre ton attention. Classinus propose deux outils complémentaires : un contrôle de session qui active le mode Ne pas déranger pendant une durée choisie, et un suivi du temps passé dans les applications sur Android. Le premier limite les interruptions ; le second t'aide à observer tes habitudes.
        </p>
      </header>
      <nav className="mt-8" aria-label="Outils de concentration">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir un outil</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {SOUS_PAGES_DECOUVRIR_CONCENTRATION.map((sousPage) => (
            <li key={sousPage.slug}>
              <Link href={sousPage.href} className="flex items-center justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute">
                <span className="min-w-0">
                  <span className="block font-display text-base font-semibold text-dj-texte">{sousPage.titre}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-dj-texte-muet">{sousPage.description}</span>
                </span>
                <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <AccordeonQuestionsDecouvrir groupes={QUESTIONS_DECOUVRIR_CONCENTRATION} />
    </main>
  );
}
