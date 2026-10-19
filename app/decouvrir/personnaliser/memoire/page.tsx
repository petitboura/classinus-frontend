import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

export const metadata: Metadata = {
  title: "Mémoire Classinus : consulter et gérer les informations retenues",
  description:
    "Consulte les informations que Classinus retient au fil des conversations, réparties en catégories, puis supprime celles que tu ne souhaites plus conserver selon les options disponibles.",
};

export default function PageDecouvrirPersonnaliserMemoire() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Ma mémoire</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        La mémoire aide Classinus à tenir compte de certains éléments déjà évoqués dans vos conversations, plutôt que de repartir de zéro à chaque échange. Les informations sont organisées en quatre catégories : identité, scolarité, apprentissage et préférences.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Consulter ce qui est retenu</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux parcourir les catégories pour voir les informations conservées, notamment les éléments liés à ton parcours scolaire, aux notions étudiées et à tes préférences de travail. Prends le temps de les vérifier si elles ne correspondent plus à ta situation.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Supprimer des informations</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Depuis la page Mémoire ou les paramètres prévus à cet effet, tu peux supprimer une catégorie ou vider l'ensemble de la mémoire. Une confirmation supplémentaire est demandée avant l'effacement.</p>
      </section>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
