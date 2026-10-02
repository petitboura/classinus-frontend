import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

// Chantier SEO/AEO de Classinus (26/09/2026). Titre, description et
// contenu validés par Bourama, revus une première fois pour préciser le
// rôle de l'IA (chercher/trouver une skill publique).
export const metadata: Metadata = {
  title: "Skills publics Classinus : les consignes partagées par les élèves",
  description:
    "Cherche et trouve avec l'IA les skills publiées par d'autres élèves, active celle qui t'intéresse. Une copie s'ajoute directement dans tes propres skills, prête à l'emploi.",
};

export default function PageDecouvrirPersonnaliserSkillsPublics() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Skills publics</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Un catalogue de skills publiées par d&apos;autres élèves. L&apos;IA peut t&apos;aider à en chercher et en
        trouver une qui te correspond. Tu peux voir son contenu complet avant de l&apos;activer, et une copie
        s&apos;ajoute directement dans tes propres skills, prête à l&apos;emploi.
      </p>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
