import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE } from "@/lib/sectionsDecouvrir";
import { QUESTIONS_DECOUVRIR_BIBLIOTHEQUE } from "@/lib/questionsDecouvrir";
import { AccordeonQuestionsDecouvrir } from "@/components/AccordeonQuestionsDecouvrir";

export const metadata: Metadata = {
  title: "Bibliothèque Classinus : documents personnels, ressources partagées et fichiers mobiles",
  description: "Organise tes cours dans une bibliothèque personnelle, explore les ressources partagées par les élèves et accède aux dossiers que tu désignes sur mobile.",
};

export default function PageDecouvrirBibliotheque() {
  return (
    <main className="mx-auto max-w-2xl">
      <Link href={ROUTES_DECOUVRIR.accueil} className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline">
        <ChevronLeft size={14} />
        Découvrir Classinus
      </Link>
      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-dj-texte-muet">Documents et ressources</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-dj-texte">La bibliothèque Classinus</h1>
        <p className="mt-3 text-base leading-relaxed text-dj-texte">
          La bibliothèque rassemble les documents dont tu te sers pour étudier et les ressources que la communauté partage. Elle comprend un espace personnel, un catalogue public et, sur mobile, un accès aux dossiers que tu choisis sur ton téléphone. Chaque espace a un rôle différent : sélectionne le guide correspondant à ce que tu veux faire.
        </p>
      </header>
      <nav className="mt-8" aria-label="Espaces de la bibliothèque">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir un espace</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE.map((sousPage) => (
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
      <AccordeonQuestionsDecouvrir groupes={QUESTIONS_DECOUVRIR_BIBLIOTHEQUE} />
    </main>
  );
}
