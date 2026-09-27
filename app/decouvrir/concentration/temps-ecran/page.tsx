import type { Metadata } from "next";
import { MiseEnPageDecouvrirConcentration } from "@/components/EnTeteDecouvrirConcentration";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Temps d'écran Classinus : combien de temps sur chaque appli",
  description: "Suis le temps passé aujourd'hui dans chaque application, avec un historique sur les 7 derniers jours.",
};

export default function PageDecouvrirConcentrationTempsEcran() {
  return (
    <MiseEnPageDecouvrirConcentration>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Temps d&apos;écran</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Classinus affiche le temps passé aujourd&apos;hui dans chaque application installée sur ton téléphone, avec
        un historique sur les 7 derniers jours. Disponible uniquement sur l&apos;appli mobile, pour l&apos;instant
        réservé à Android.
      </p>
    </MiseEnPageDecouvrirConcentration>
  );
}
