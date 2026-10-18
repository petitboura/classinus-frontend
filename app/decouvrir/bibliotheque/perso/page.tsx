import type { Metadata } from "next";
import { MiseEnPageDecouvrirBibliotheque } from "@/components/EnTeteDecouvrirBibliotheque";

export const metadata: Metadata = {
  title: "Bibliothèque personnelle Classinus : organiser et exploiter ses cours",
  description: "Range tes cours et fichiers dans des dossiers personnels, retrouve les documents envoyés dans le chat et demande à Classinus de travailler à partir de ces ressources.",
};

export default function PageDecouvrirBibliothequePerso() {
  return (
    <MiseEnPageDecouvrirBibliotheque>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Bibliothèque personnelle</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Ta bibliothèque personnelle est l'espace où tu rassembles les documents dont tu te sers pour étudier. Tu peux les organiser par dossiers et demander à Classinus de s'appuyer sur ces ressources pour expliquer une notion, retrouver un élément ou travailler à partir de ton cours.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Ajouter et organiser tes documents</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux ajouter des fichiers depuis la bibliothèque et retrouver les fichiers que l'application y ajoute après leur envoi dans le chat. Les archives ZIP prises en charge peuvent être extraites dans un dossier dédié pour rendre leur contenu plus facile à parcourir.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Travailler à partir de tes propres cours</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Lorsque tu poses une question, précise le document ou le sujet sur lequel tu veux travailler. Cela aide Classinus à concentrer sa réponse sur les ressources pertinentes. La bibliothèque personnelle est distincte du catalogue public : les documents que tu y ranges ne sont pas publiés automatiquement pour les autres utilisateurs.</p>
      </section>
    </MiseEnPageDecouvrirBibliotheque>
  );
}
