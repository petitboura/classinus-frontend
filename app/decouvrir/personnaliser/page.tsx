import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_PERSONNALISER } from "@/lib/sectionsDecouvrir";
import { QUESTIONS_DECOUVRIR_PERSONNALISER } from "@/lib/questionsDecouvrir";
import { AccordeonQuestionsDecouvrir } from "@/components/AccordeonQuestionsDecouvrir";

export const metadata: Metadata = {
  title: "Personnaliser Classinus : skills, mémoire et consignes",
  description:
    "Adapte Classinus à ta façon de travailler grâce aux skills personnelles, aux skills partagées par la communauté et à une mémoire que tu peux consulter et gérer.",
};

export default function PageDecouvrirPersonnaliser() {
  return (
    <main className="mx-auto max-w-2xl">
      <Link href={ROUTES_DECOUVRIR.accueil} className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline">
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>
      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">Réglages personnels</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-dj-texte">Personnaliser Classinus</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">
          Tu n'apprends pas forcément comme les autres. Avec les skills, tu peux donner à Classinus des consignes qui correspondent à ta manière de travailler ou reprendre celles partagées par d'autres élèves. La mémoire, elle, te permet de consulter et de gérer certaines informations retenues au fil des conversations.
        </p>
      </header>
      <nav className="mt-8" aria-label="Options de personnalisation">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir ce que tu veux personnaliser</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {SOUS_PAGES_DECOUVRIR_PERSONNALISER.map((sousPage) => (
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
      <AccordeonQuestionsDecouvrir groupes={QUESTIONS_DECOUVRIR_PERSONNALISER} />
    </main>
  );
}
