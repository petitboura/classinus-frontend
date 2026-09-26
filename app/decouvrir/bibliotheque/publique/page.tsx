import type { Metadata } from "next";
import { MiseEnPageDecouvrirBibliotheque } from "@/components/EnTeteDecouvrirBibliotheque";

// Chantier SEO/AEO de Classinus (25 26/09/2026). Titre, description et
// contenu validés par Bourama le 25/09/2026, repris ici mot pour mot.
export const metadata: Metadata = {
  title: "Bibliothèque publique Classinus : ressources partagées, notées par les élèves",
  description:
    "Fouille ou partage des documents dans le catalogue public de Classinus. Note les ressources, organise par dossier, consulte le profil de chaque contributeur.",
};

export default function PageDecouvrirBibliothequePublique() {
  return (
    <MiseEnPageDecouvrirBibliotheque>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Bibliothèque publique</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        C&apos;est un catalogue de documents partagé par tous les élèves de Classinus, que l&apos;IA peut aussi
        fouiller pour toi. Tu peux tout y ajouter, organiser le contenu par dossier, et noter chaque ressource pour
        aider les autres à voir laquelle est la meilleure. Tu peux aussi consulter le profil de la personne qui a
        partagé un document.
      </p>
    </MiseEnPageDecouvrirBibliotheque>
  );
}
