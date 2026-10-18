import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Skills publics Classinus : découvrir et réutiliser les consignes partagées",
  description: "Explore les skills publiées par d'autres élèves, consulte leur contenu avant de les activer et ajoute une copie à tes skills personnelles.",
};

export default function PageDecouvrirPersonnaliserSkillsPublics() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Skills publics</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Le catalogue public rassemble des skills que d'autres élèves ont choisi de partager. Une skill peut proposer une méthode de révision, une façon de présenter les explications ou des consignes utiles pour un type de tâche.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir une skill en connaissance de cause</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux consulter le contenu complet d'une skill avant de l'activer. Si elle te convient, Classinus en ajoute une copie à tes skills personnelles, que tu peux ensuite adapter. Vérifie toujours les consignes avant de les utiliser et garde celles qui correspondent à tes objectifs.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
