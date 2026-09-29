import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

// Chantier SEO/AEO de Classinus (26/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Ma mémoire dans Classinus : ce que l'IA retient de toi",
  description:
    "Classinus retient ce qui compte pour toi (identité, scolarité, apprentissage, préférences) afin de personnaliser vos conversations. Tu peux tout consulter et l'effacer quand tu veux.",
};

export default function PageDecouvrirPersonnaliserMemoire() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Ma mémoire</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Ce que Classinus retient de toi pour personnaliser vos échanges. Tout est classé en quatre catégories :
        ton identité, ta scolarité, ce que tu apprends (matière par matière, avec les notions vues et les
        difficultés repérées) et tes préférences.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Cette mémoire se construit toute seule au fil de tes conversations. Tu peux tout consulter, oublier une
        catégorie entière, ou tout effacer d&apos;un coup depuis les Paramètres.
      </p>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
