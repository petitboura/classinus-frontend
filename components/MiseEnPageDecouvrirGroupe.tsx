"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { OngletsLiens } from "@/components/OngletsSegment";
import type { CarteDecouvrir } from "@/lib/sectionsDecouvrir";

// Chantier SEO/AEO de Classinus (26/09/2026). Mise en page partagée par
// toute page /decouvrir/... qui a des soeurs (fil d'ariane vers la page
// mère, navigation entre les soeurs, colonne de contenu). Généralisée
// depuis le premier groupe traité, Bibliothèque, pour que Personnaliser
// Classinus (et les prochaines sections) réutilisent la même mécanique
// au lieu de la dupliquer.
//
// Reprend très exactement le motif déjà en place dans
// components/SectionPage.tsx (groupe.soeurs) : rangée de pastilles
// (OngletsLiens) uniquement sur téléphone (`md:hidden`), menu vertical à
// gauche uniquement sur PC (`hidden md:flex`), jamais les deux en même
// temps (retour de Bourama le 26/09 après capture d'écran).
export function MiseEnPageDecouvrirGroupe({
  retourHref,
  retourLabel,
  sousPages,
  children,
}: {
  retourHref: string;
  retourLabel: string;
  sousPages: CarteDecouvrir[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      <Link
        href={retourHref}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        {retourLabel}
      </Link>

      <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
        <div className="md:hidden">
          <OngletsLiens
            ariaLabel={retourLabel}
            onglets={sousPages.map((sousPage) => ({ href: sousPage.href, libelle: sousPage.titre }))}
          />
        </div>

        <nav className="hidden w-48 flex-shrink-0 flex-col gap-1 md:flex">
          {sousPages.map((sousPage) => {
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
