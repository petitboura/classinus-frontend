"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE } from "@/lib/sectionsDecouvrir";
import { OngletsLiens } from "@/components/OngletsSegment";

// Chantier SEO/AEO de Classinus (26/09/2026). Mise en page partagée par
// les trois pages filles (perso, publique, telephone) : fil d'ariane,
// navigation entre les trois volets, et colonne de contenu.
//
// Correctif du 26/09/2026 (retour de Bourama après capture d'écran) :
// la rangée de pastilles (OngletsLiens) est un motif TÉLÉPHONE
// uniquement, jamais affichée sur PC. Sur PC, les pages voisines
// s'affichent dans un menu vertical à gauche à la place. Reprend très
// exactement le motif déjà en place dans components/SectionPage.tsx
// (groupe.soeurs) : `md:hidden` pour la rangée de pastilles, `hidden
// md:flex` pour le menu de gauche, pas un nouveau motif inventé pour ces
// pages publiques.
export function MiseEnPageDecouvrirBibliotheque({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      <Link
        href={ROUTES_DECOUVRIR.bibliotheque.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Bibliothèque Classinus
      </Link>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <OngletsLiens
            ariaLabel="Les trois volets de la Bibliothèque"
            onglets={SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE.map((sousPage) => ({ href: sousPage.href, libelle: sousPage.titre }))}
          />
        </div>

        <nav className="hidden w-48 flex-shrink-0 flex-col gap-1 md:flex">
          {SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE.map((sousPage) => {
            const actif = pathname === sousPage.href;
            return (
              <Link
                key={sousPage.href}
                href={sousPage.href}
                replace
                className={`rounded-xl px-3 py-2 text-sm transition-colors ${
                  actif
                    ? "bg-dj-surface-haute font-medium text-dj-texte"
                    : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
                }`}
              >
                {sousPage.titre}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
