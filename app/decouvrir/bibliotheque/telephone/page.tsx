import type { Metadata } from "next";
import { MiseEnPageDecouvrirBibliotheque } from "@/components/EnTeteDecouvrirBibliotheque";

export const metadata: Metadata = {
  title: "Dossiers du téléphone dans Classinus : accéder à tes fichiers sur mobile",
  description: "Dans l'application mobile, désigne des dossiers de ton téléphone pour que Classinus puisse parcourir et organiser les fichiers concernés selon les autorisations accordées.",
};

export default function PageDecouvrirBibliothequeTelephone() {
  return (
    <MiseEnPageDecouvrirBibliotheque>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Dossiers du téléphone</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Sur l'application mobile, tu peux désigner les dossiers de ton téléphone que tu souhaites utiliser avec Classinus. Cette fonction te permet de retrouver des cours et des PDF dans les emplacements choisis sans devoir importer chaque fichier un par un.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Choisir les dossiers concernés</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">L'accès concerne les dossiers que tu sélectionnes et dépend des autorisations accordées au système. Avant de lancer une recherche ou une opération de rangement, vérifie que tu as choisi le bon emplacement.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Organiser les fichiers</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Classinus peut réorganiser le contenu des dossiers que tu lui as explicitement désignés, notamment en créant des sous-dossiers. Cette fonction est disponible sur mobile ; elle n'est pas présentée comme une option de la version web sur ordinateur.</p>
      </section>
    </MiseEnPageDecouvrirBibliotheque>
  );
}
