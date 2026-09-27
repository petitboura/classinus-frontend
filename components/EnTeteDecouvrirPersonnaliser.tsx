import type { ReactNode } from "react";
import { Suspense } from "react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_PERSONNALISER } from "@/lib/sectionsDecouvrir";
import { MiseEnPageDecouvrirGroupe } from "@/components/MiseEnPageDecouvrirGroupe";
import { MiseEnPageDecouvrirGroupeAvecDepuis } from "@/components/MiseEnPageDecouvrirGroupeAvecDepuis";

// Chantier SEO/AEO de Classinus (26/09/2026). Même principe que
// components/EnTeteDecouvrirBibliotheque.tsx pour la section
// Personnaliser Classinus : le <Suspense> a un repli qui affiche le même
// `children` (texte réel de la page), sans ?depuis= reporté, jamais de
// contenu manquant pour Google.
export function MiseEnPageDecouvrirPersonnaliser({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <MiseEnPageDecouvrirGroupe
          retourHref={ROUTES_DECOUVRIR.personnaliser.accueil}
          retourLabel="Personnaliser Classinus"
          sousPages={SOUS_PAGES_DECOUVRIR_PERSONNALISER}
        >
          {children}
        </MiseEnPageDecouvrirGroupe>
      }
    >
      <MiseEnPageDecouvrirGroupeAvecDepuis
        retourHref={ROUTES_DECOUVRIR.personnaliser.accueil}
        retourLabel="Personnaliser Classinus"
        sousPages={SOUS_PAGES_DECOUVRIR_PERSONNALISER}
      >
        {children}
      </MiseEnPageDecouvrirGroupeAvecDepuis>
    </Suspense>
  );
}
