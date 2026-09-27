import type { ReactNode } from "react";
import { Suspense } from "react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_CONCENTRATION } from "@/lib/sectionsDecouvrir";
import { MiseEnPageDecouvrirGroupe } from "@/components/MiseEnPageDecouvrirGroupe";
import { MiseEnPageDecouvrirGroupeAvecDepuis } from "@/components/MiseEnPageDecouvrirGroupeAvecDepuis";

// Chantier SEO/AEO de Classinus (27/09/2026). Même principe que
// components/EnTeteDecouvrirBibliotheque.tsx et
// EnTeteDecouvrirPersonnaliser.tsx pour la section Concentration : le
// <Suspense> a un repli qui affiche le même `children` (texte réel de la
// page), sans ?depuis= reporté, jamais de contenu manquant pour Google.
export function MiseEnPageDecouvrirConcentration({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <MiseEnPageDecouvrirGroupe
          retourHref={ROUTES_DECOUVRIR.concentration.accueil}
          retourLabel="Concentration Classinus"
          sousPages={SOUS_PAGES_DECOUVRIR_CONCENTRATION}
        >
          {children}
        </MiseEnPageDecouvrirGroupe>
      }
    >
      <MiseEnPageDecouvrirGroupeAvecDepuis
        retourHref={ROUTES_DECOUVRIR.concentration.accueil}
        retourLabel="Concentration Classinus"
        sousPages={SOUS_PAGES_DECOUVRIR_CONCENTRATION}
      >
        {children}
      </MiseEnPageDecouvrirGroupeAvecDepuis>
    </Suspense>
  );
}
