import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

export const metadata: Metadata = {
  title: "Programme pédagogique Classinus : structurer les notions à enseigner",
  description: "Organise le programme d'un code en matières, chapitres, parties et notions, suis leur état d'avancement et importe un document comme point de départ.",
};

export default function PageDecouvrirBureauProgramme() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Programme pédagogique</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Le Programme aide les enseignants à structurer les notions à aborder pour un code Classinus. Il organise le contenu en matière, chapitre, partie et notion, avec la possibilité d'ajouter des sous-notions lorsque le cours demande un découpage plus fin.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Suivre l'avancement</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Chaque notion peut être marquée comme « à venir », « en cours » ou « acquise ». Ces statuts permettent de visualiser ce qui reste à traiter et ce qui a déjà été travaillé ; ils sont renseignés par l'enseignant.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Partir d'un document existant</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux importer un document, comme un sommaire ou un plan de cours, pour proposer une structure initiale. Vérifie et valide la structure suggérée avant de l'appliquer au programme. Cet outil est réservé aux enseignants.</p>
      </section>
    </MiseEnPageDecouvrirBureau>
  );
}
