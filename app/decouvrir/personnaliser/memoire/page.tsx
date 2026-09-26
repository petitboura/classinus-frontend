import type { Metadata } from "next";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";
import { SOUS_PAGES_DECOUVRIR_PERSONNALISER } from "@/lib/sectionsDecouvrir";
import { MiseEnPageDecouvrirGroupe } from "@/components/MiseEnPageDecouvrirGroupe";

// Chantier SEO/AEO de Classinus (26/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Ma mémoire dans Classinus : ce que l'IA retient de toi",
  description:
    "Classinus retient un résumé de vos échanges passés pour personnaliser vos conversations. Tu peux le consulter, le corriger ou l'effacer à tout moment.",
};

export default function PageDecouvrirPersonnaliserMemoire() {
  return (
    <MiseEnPageDecouvrirGroupe
      retourHref={ROUTES_DECOUVRIR.personnaliser.accueil}
      retourLabel="Personnaliser Classinus"
      sousPages={SOUS_PAGES_DECOUVRIR_PERSONNALISER}
    >
      <h1 className="font-display text-2xl font-bold text-dj-texte">Ma mémoire</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Un résumé de ce que Classinus retient de tes conversations passées, pour personnaliser vos échanges. Il se
        met à jour automatiquement au fil des discussions, et tu peux aussi le corriger ou l&apos;effacer toi même à
        tout moment.
      </p>
    </MiseEnPageDecouvrirGroupe>
  );
}
