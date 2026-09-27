import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Programme Classinus : organise les notions à enseigner",
  description:
    "Organise le programme d'un code (matière, chapitre, partie, notion) et suis l'avancement de tes élèves, notion par notion.",
};

export default function PageDecouvrirBureauProgramme() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Programme</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Organise les notions à enseigner pour un code, avec des sous notions si besoin. Chaque notion a un statut que
        tu coches toi même : à venir, en cours, ou acquis. Tu peux aussi importer un document (sommaire, plan de
        cours) pour proposer une structure de départ, à valider avant de l&apos;appliquer. Réservé aux enseignants.
      </p>
    </MiseEnPageDecouvrirBureau>
  );
}
