import type { Metadata } from "next";
import { EnTeteDecouvrirBibliotheque } from "@/components/EnTeteDecouvrirBibliotheque";

// Chantier SEO/AEO de Classinus (25 26/09/2026). Titre, description et
// contenu validés par Bourama le 25/09/2026, repris ici mot pour mot.
export const metadata: Metadata = {
  title: "Bibliothèque personnelle Classinus : reste dans ton programme avec l'IA",
  description:
    "Ajoute et organise tes documents par dossier. Classinus y navigue et agit comme toi, toujours dans le cadre de ton programme, jamais hors sujet.",
};

export default function PageDecouvrirBibliothequePerso() {
  return (
    <main>
      <EnTeteDecouvrirBibliotheque />

      <h1 className="mt-6 font-display text-2xl font-bold text-dj-texte">Bibliothèque personnelle</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Les documents que tu ajoutes ici sont personnels, toi seul y as accès. Elle sert surtout à éviter le hors
        programme : en t&apos;appuyant dessus, Classinus reste sur ce que tu étudies vraiment, plutôt que d&apos;aller
        chercher ailleurs. Tu peux tout y ajouter et l&apos;organiser en dossiers. Tout ce que tu envoies dans le chat
        s&apos;y retrouve aussi automatiquement, et tu peux y ajouter un document directement depuis la bibliothèque
        publique. L&apos;IA peut y naviguer et y agir exactement comme toi.
      </p>
    </main>
  );
}
