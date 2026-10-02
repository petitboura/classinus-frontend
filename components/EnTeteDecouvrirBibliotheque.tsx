import type { ReactNode } from "react";
import { Suspense } from "react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE } from "@/lib/sectionsDecouvrir";
import { MiseEnPageDecouvrirGroupe } from "@/components/MiseEnPageDecouvrirGroupe";
import { MiseEnPageDecouvrirGroupeAvecDepuis } from "@/components/MiseEnPageDecouvrirGroupeAvecDepuis";

// Chantier SEO/AEO de Classinus (26/09/2026). Fine enveloppe autour de
// MiseEnPageDecouvrirGroupe (mise en page générique) avec les
// informations propres à Bibliothèque. Gardé comme fichier/nom séparé
// pour ne pas retoucher les 3 pages filles déjà écrites contre ce nom.
//
// <Suspense> ici (pas dans le layout englobant, voir
// app/decouvrir/layout.tsx) : le repli affiche EXACTEMENT le même
// `children` (le vrai texte de la page), juste sans ?depuis= reporté
// sur les liens -- jamais de contenu manquant pour Google le temps de
// l'hydratation, seul le bouton retour "intelligent" est une
// amélioration progressive.
export function MiseEnPageDecouvrirBibliotheque({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <MiseEnPageDecouvrirGroupe
          retourHref={ROUTES_DECOUVRIR.bibliotheque.accueil}
          retourLabel="Bibliothèque Classinus"
          sousPages={SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE}
        >
          {children}
        </MiseEnPageDecouvrirGroupe>
      }
    >
      <MiseEnPageDecouvrirGroupeAvecDepuis
        retourHref={ROUTES_DECOUVRIR.bibliotheque.accueil}
        retourLabel="Bibliothèque Classinus"
        sousPages={SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE}
      >
        {children}
      </MiseEnPageDecouvrirGroupeAvecDepuis>
    </Suspense>
  );
}
