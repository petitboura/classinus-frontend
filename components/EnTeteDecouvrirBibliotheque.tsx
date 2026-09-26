import type { ReactNode } from "react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE } from "@/lib/sectionsDecouvrir";
import { MiseEnPageDecouvrirGroupe } from "@/components/MiseEnPageDecouvrirGroupe";

// Chantier SEO/AEO de Classinus (26/09/2026). Fine enveloppe autour de
// MiseEnPageDecouvrirGroupe (mise en page générique) avec les
// informations propres à Bibliothèque. Gardé comme fichier/nom séparé
// pour ne pas retoucher les 3 pages filles déjà écrites contre ce nom.
export function MiseEnPageDecouvrirBibliotheque({ children }: { children: ReactNode }) {
  return (
    <MiseEnPageDecouvrirGroupe
      retourHref={ROUTES_DECOUVRIR.bibliotheque.accueil}
      retourLabel="Bibliothèque Classinus"
      sousPages={SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE}
    >
      {children}
    </MiseEnPageDecouvrirGroupe>
  );
}
