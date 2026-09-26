import type { Metadata } from "next";
import { EnTeteDecouvrirBibliotheque } from "@/components/EnTeteDecouvrirBibliotheque";

// Chantier SEO/AEO de Classinus (25 26/09/2026). Titre, description et
// contenu validés par Bourama le 25/09/2026, repris ici mot pour mot.
export const metadata: Metadata = {
  title: "Dossiers du téléphone dans Classinus : plus besoin d'uploader tes fichiers",
  description:
    "Désigne des dossiers de ton téléphone, sans copier tes PDF ni documents. Classinus les explore et les réorganise pour toi.",
};

export default function PageDecouvrirBibliothequeTelephone() {
  return (
    <main>
      <EnTeteDecouvrirBibliotheque />

      <h1 className="mt-6 font-display text-2xl font-bold text-dj-texte">Dossiers du téléphone</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Disponible uniquement sur l&apos;appli mobile. Si tu le décides, plus besoin d&apos;ajouter tes PDF ou
        documents un par un : Classinus peut fouiller directement dans les dossiers de ton téléphone que tu lui
        désignes, et même les réorganiser en sous dossiers.
      </p>
    </main>
  );
}
