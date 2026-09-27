import type { ReactNode } from "react";
import { Suspense } from "react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_BUREAU } from "@/lib/sectionsDecouvrir";
import { MiseEnPageDecouvrirGroupe } from "@/components/MiseEnPageDecouvrirGroupe";
import { MiseEnPageDecouvrirGroupeAvecDepuis } from "@/components/MiseEnPageDecouvrirGroupeAvecDepuis";

// Chantier SEO/AEO de Classinus (27/09/2026). Même principe que
// EnTeteDecouvrirBibliotheque.tsx / EnTeteDecouvrirPersonnaliser.tsx /
// EnTeteDecouvrirConcentration.tsx pour la section Bureau (5 des 6
// cartes : Établissements exclu, voir lib/sectionsDecouvrir.tsx).
export function MiseEnPageDecouvrirBureau({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <MiseEnPageDecouvrirGroupe
          retourHref={ROUTES_DECOUVRIR.bureau.accueil}
          retourLabel="Bureau Classinus"
          sousPages={SOUS_PAGES_DECOUVRIR_BUREAU}
        >
          {children}
        </MiseEnPageDecouvrirGroupe>
      }
    >
      <MiseEnPageDecouvrirGroupeAvecDepuis
        retourHref={ROUTES_DECOUVRIR.bureau.accueil}
        retourLabel="Bureau Classinus"
        sousPages={SOUS_PAGES_DECOUVRIR_BUREAU}
      >
        {children}
      </MiseEnPageDecouvrirGroupeAvecDepuis>
    </Suspense>
  );
}
