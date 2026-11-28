import type { Metadata } from "next";
import { MiseEnPageDecouvrirBibliotheque } from "@/components/EnTeteDecouvrirBibliotheque";

export const metadata: Metadata = {
  title: "Bibliothèque personnelle Classinus : tes fichiers, lus par l'IA",
  description: "Range tes fichiers dans des dossiers personnels, retrouve les documents envoyés dans le chat et demande à Classinus de les retrouver ou de les analyser.",
};

export default function PageDecouvrirBibliothequePerso() {
  return (
    <MiseEnPageDecouvrirBibliotheque>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Bibliothèque personnelle</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Ta bibliothèque personnelle est l'espace où tu rassembles les fichiers que tu souhaites retrouver et utiliser avec Classinus. Tu peux les organiser par dossiers et demander aux modèles d'IA de rechercher une information, d'analyser un document ou de travailler à partir de son contenu.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Ajouter et organiser tes documents</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux ajouter des fichiers depuis la bibliothèque et retrouver les fichiers que l'application y ajoute après leur envoi dans le chat. Les archives ZIP prises en charge peuvent être extraites dans un dossier dédié pour rendre leur contenu plus facile à parcourir.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Exploiter tes propres documents</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Dans une conversation, tu peux demander à Classinus de retrouver un fichier, d'en extraire des informations, de le résumer ou de l'utiliser comme source pour une tâche. La bibliothèque personnelle est distincte du catalogue public : les documents que tu y ranges ne sont pas publiés automatiquement pour les autres utilisateurs.</p>
      </section>
    </MiseEnPageDecouvrirBibliotheque>
  );
}
