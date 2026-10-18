import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { ListeQuestionsReponses, donneesFaq } from "@/components/PageUsageDecouvrir";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { QUESTIONS_GENERALES_CLASSINUS, RESUME_CLASSINUS, USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

export const metadata: Metadata = {
  title: "Que faire avec Classinus ? Documents, programmation, vidéos et révisions",
  description: RESUME_CLASSINUS.description,
};

export default function PageDecouvrirUsages() {
  return (
    <main className="mx-auto max-w-2xl">
      <DonneesStructurees donnees={donneesFaq(QUESTIONS_GENERALES_CLASSINUS)} />

      <Link href={ROUTES_DECOUVRIR.accueil} className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline">
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">Guides pratiques</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-dj-texte">Que peux-tu faire avec Classinus ?</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">
          Choisis ton objectif pour découvrir les outils adaptés. Chaque guide explique ce que Classinus peut faire, comment commencer et les points à vérifier pour utiliser les résultats avec discernement.
        </p>
      </header>

      <nav className="mt-8" aria-label="Guides pratiques Classinus">
        <ul className="flex flex-col gap-3">
          {USAGES_DECOUVRIR.map((usage) => (
            <li key={usage.slug}>
              <Link href={usage.href} className="flex items-center justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute">
                <span className="min-w-0">
                  <span className="block font-display text-base font-semibold text-dj-texte">{usage.titreCarte}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-dj-texte-muet">{usage.resumeCarte}</span>
                </span>
                <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ListeQuestionsReponses questions={QUESTIONS_GENERALES_CLASSINUS} />
    </main>
  );
}
