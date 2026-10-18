import type { Metadata } from "next";
import { MiseEnPageDecouvrirBibliotheque } from "@/components/EnTeteDecouvrirBibliotheque";

export const metadata: Metadata = {
  title: "Bibliothèque publique Classinus : rechercher et partager des ressources",
  description: "Explore le catalogue de ressources partagées par la communauté, consulte les informations des documents, note les ressources et découvre les profils des contributeurs.",
};

export default function PageDecouvrirBibliothequePublique() {
  return (
    <MiseEnPageDecouvrirBibliotheque>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Bibliothèque publique</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        La bibliothèque publique est un catalogue de ressources que les utilisateurs choisissent de partager avec la communauté Classinus. Tu peux y rechercher un document, parcourir les informations associées et consulter le profil de la personne qui l'a publié.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Trouver et évaluer une ressource</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Les ressources peuvent être organisées par dossier et notées par les utilisateurs. Ces indications facilitent la découverte, mais vérifie toujours que le document correspond à ton niveau, à ton programme et à l'objectif de ton travail.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Partager dans le respect des droits</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux proposer une ressource au catalogue public si tu disposes des droits nécessaires. Avant de publier un fichier, vérifie sa licence et les conditions imposées par son auteur ou sa source.</p>
      </section>
    </MiseEnPageDecouvrirBibliotheque>
  );
}
