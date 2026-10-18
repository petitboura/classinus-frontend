import type { Metadata } from "next";
import { MiseEnPageDecouvrirConcentration } from "@/components/EnTeteDecouvrirConcentration";

export const metadata: Metadata = {
  title: "Temps d'écran Classinus : consulter l'utilisation des applications",
  description: "Sur Android, consulte le temps passé dans chaque application aujourd'hui et l'historique des sept derniers jours.",
};

export default function PageDecouvrirConcentrationTempsEcran() {
  return (
    <MiseEnPageDecouvrirConcentration>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Temps d'écran</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        L'outil Temps d'écran t'aide à observer comment se répartit l'utilisation de ton téléphone. Il présente le temps passé dans les applications pour la journée en cours et permet de consulter l'historique des sept derniers jours.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Disponibilité</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Cette fonction est disponible dans l'application mobile Classinus sur Android. Le système peut demander une autorisation d'accès aux données d'utilisation ; sans cette autorisation, Classinus ne peut pas afficher ces informations.</p>
      </section>
    </MiseEnPageDecouvrirConcentration>
  );
}
