import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Mes skills Classinus : créer des consignes adaptées à ta façon d'apprendre",
  description: "Crée et ajuste des skills personnelles pour guider les réponses de Classinus, par exemple sur le niveau de détail, la méthode d'explication ou le format attendu.",
};

export default function PageDecouvrirPersonnaliserMesSkills() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Mes skills</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Une skill est un ensemble de consignes personnelles qui aide Classinus à répondre d'une manière adaptée à ton travail. Tu peux, par exemple, demander des explications progressives, des exemples avant une définition formelle ou une correction qui commence par des indices.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Créer et faire évoluer une skill</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux créer une skill ou modifier une consigne existante, avec l'aide de l'IA si tu le souhaites. Ajuste-la lorsque tes besoins changent et désactive-la lorsqu'elle n'est pas utile. Les skills personnelles complètent les consignes de ton enseignant ; elles ne les remplacent pas.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
