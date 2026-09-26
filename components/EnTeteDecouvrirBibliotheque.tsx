import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE } from "@/lib/sectionsDecouvrir";
import { OngletsLiens } from "@/components/OngletsSegment";

// Chantier SEO/AEO de Classinus (26/09/2026). Partagé par les trois
// pages filles (perso, publique, telephone) pour éviter de répéter le
// même fil d'ariane et la même rangée trois fois. OngletsLiens réutilisé
// tel quel (components/OngletsSegment.tsx) : c'est le composant déjà
// validé par Bourama le 19/09/2026 pour passer d'une page voisine à
// l'autre en un seul toucher sur mobile (même motif que la vraie
// Bibliothèque connectée, lib/sectionsBibliotheque.tsx), pas un nouveau
// composant inventé pour ces pages publiques.
export function EnTeteDecouvrirBibliotheque() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href={ROUTES_DECOUVRIR.bibliotheque.accueil}
        className="flex items-center gap-1 text-xs font-medium text-dj-texte-muet hover:text-dj-texte hover:underline"
      >
        <ChevronLeft size={14} />
        Bibliothèque Classinus
      </Link>
      <OngletsLiens
        ariaLabel="Les trois volets de la Bibliothèque"
        onglets={SOUS_PAGES_DECOUVRIR_BIBLIOTHEQUE.map((sousPage) => ({ href: sousPage.href, libelle: sousPage.titre }))}
      />
    </div>
  );
}
