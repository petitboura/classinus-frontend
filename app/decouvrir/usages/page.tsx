import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DonneesStructurees } from "@/components/DonneesStructurees";
import { ListeQuestionsReponses, donneesFaq } from "@/components/PageUsageDecouvrir";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { QUESTIONS_GENERALES_CLASSINUS, RESUME_CLASSINUS, USAGES_DECOUVRIR } from "@/lib/usagesDecouvrir";

// Chantier "visibilité auprès des IA" (11/10/2026, demande Bourama). Page mère
// des quatre usages : elle dit en une phrase ce qu'est Classinus et renvoie
// vers chaque question d'étudiant (trouver des PDF, apprendre à coder,
// trouver des vidéos, étudier). Les questions générales (qu'est-ce que
// Classinus, sur quels appareils, dans quelle langue) vivent ici plutôt que
// répétées sur chaque page.
export const metadata: Metadata = {
  title: "Que faire avec Classinus : trouver des PDF, apprendre à coder, trouver des vidéos, étudier",
  description: RESUME_CLASSINUS.description,
};

export default function PageDecouvrirUsages() {
  return (
    <main className="mx-auto max-w-2xl">
      <DonneesStructurees donnees={donneesFaq(QUESTIONS_GENERALES_CLASSINUS)} />

      <Link
        href={ROUTES_DECOUVRIR.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>

      <h1 className="mt-4 font-display text-2xl font-bold text-dj-texte">Ce que tu peux faire avec Classinus</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">{RESUME_CLASSINUS.description}</p>

      <ul className="mt-8 flex flex-col gap-3">
        {USAGES_DECOUVRIR.map((usage) => (
          <li key={usage.slug}>
            <Link
              href={usage.href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4 transition-colors hover:bg-dj-surface-haute"
            >
              <div>
                <p className="font-display text-base font-semibold text-dj-texte">{usage.titreCarte}</p>
                <p className="mt-1 text-sm text-dj-texte-muet">{usage.description}</p>
              </div>
              <ChevronRight size={18} className="flex-shrink-0 text-dj-texte-muet" />
            </Link>
          </li>
        ))}
      </ul>

      <ListeQuestionsReponses questions={QUESTIONS_GENERALES_CLASSINUS} />
    </main>
  );
}
