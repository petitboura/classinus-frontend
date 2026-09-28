import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

// Chantier SEO/AEO de Classinus (26/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Ma mémoire dans Classinus : ce que l'IA retient de toi",
  description:
    "Classinus retient un résumé de vos échanges passés pour personnaliser vos conversations. Tu peux le consulter, le corriger ou l'effacer à tout moment.",
};

export default function PageDecouvrirPersonnaliserMemoire() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Ma mémoire</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Un résumé de ce que Classinus retient de tes conversations passées, pour personnaliser vos échanges. Il se
        met à jour automatiquement au fil des discussions, et tu peux aussi le corriger ou l&apos;effacer toi même à
        tout moment.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Sous ce résumé, une section Ma progression rassemble ce que Classinus a noté matière par matière (notions
        vues, difficultés repérées). Elle se remplit toute seule quand tu partages des informations sur tes études
        pendant les conversations.
      </p>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
