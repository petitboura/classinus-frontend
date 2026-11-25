import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Skills publics Classinus : découvrir et réutiliser les consignes partagées",
  description: "Explore les skills partagées par la communauté, consulte leur contenu avant de les activer et ajoute une copie à tes skills personnelles.",
};

export default function PageDecouvrirPersonnaliserSkillsPublics() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Skills publics</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Le catalogue public rassemble des skills que d'autres utilisateurs ont choisi de partager. Une skill peut proposer une méthode de travail, une façon de présenter les explications ou des consignes utiles pour un type de tâche.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir une skill en connaissance de cause</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux consulter le contenu complet d'une skill avant de l'activer. Si elle te convient, Classinus en ajoute une copie à tes skills personnelles, que tu peux ensuite adapter. Vérifie toujours les consignes avant de les utiliser et garde celles qui correspondent à tes objectifs.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Publier ta propre skill</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Dans Mes skills, ouvre une skill, ajoute une description, enregistre puis clique sur Publier. Elle apparaît dans le catalogue. Tu peux la retirer à tout moment : les copies déjà ajoutées par d'autres personnes leur restent.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Trouver et mettre à jour avec l'IA</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Dans le chat, Classinus peut chercher une skill publique pour toi et te proposer de l'ajouter, toujours avec ton accord. Si l'auteur met sa skill à jour, ta copie ne change pas toute seule : Classinus te prévient une fois et te propose de la remplacer, seulement si tu es d'accord.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
