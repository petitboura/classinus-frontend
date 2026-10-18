import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_BUREAU } from "@/lib/sectionsDecouvrir";
import { QUESTIONS_DECOUVRIR_BUREAU } from "@/lib/questionsDecouvrir";
import { AccordeonQuestionsDecouvrir } from "@/components/AccordeonQuestionsDecouvrir";

export const metadata: Metadata = {
  title: "Bureau Classinus : outils pour enseignants et gestion de classe",
  description:
    "Explore les outils du Bureau Classinus : partage par codes, programme pédagogique, signalements, audit hebdomadaire, éditeur de code et configuration de l'assistant.",
};

export default function PageDecouvrirBureau() {
  return (
    <main className="mx-auto max-w-2xl">
      <Link href={ROUTES_DECOUVRIR.accueil} className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline">
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>
      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">Outils de classe</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-dj-texte">Le Bureau de Classinus</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">
          Le Bureau rassemble des outils pour préparer un programme, partager des ressources ou des consignes, et suivre les signalements transmis par les élèves. Certaines fonctions sont réservées aux enseignants ; les guides précisent leur rôle et ce que chaque outil permet de faire.
        </p>
      </header>
      <nav className="mt-8" aria-label="Outils du Bureau">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir un outil</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {SOUS_PAGES_DECOUVRIR_BUREAU.map((sousPage) => (
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
      <AccordeonQuestionsDecouvrir groupes={QUESTIONS_DECOUVRIR_BUREAU} />
    </main>
  );
}
