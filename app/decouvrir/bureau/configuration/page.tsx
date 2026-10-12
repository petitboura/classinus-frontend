import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

// Chantier SEO/AEO de Classinus (12/10/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Configuration Classinus : dis à l'IA comment se comporter",
  description:
    "Crée des procédures, des règles, des comportements et des styles pour guider les réponses de Classinus, et partage-les avec un code.",
};

export default function PageDecouvrirBureauConfiguration() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Configuration</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        La Configuration te permet de dire à Classinus comment répondre, en quatre catégories séparées. Une
        procédure décrit une suite d&apos;étapes à suivre. Une règle est une consigne courte, par exemple
        toujours répondre en français. Un comportement dit comment réagir dans un cas précis : tu décris le
        cas, puis la réaction voulue. Un style donne le ton à reproduire, à partir d&apos;un exemple de ton
        écriture ou d&apos;une description. Tu peux créer et modifier chaque élément toi même avec son
        bouton, ou le demander à Classinus directement dans la conversation. Tu peux aussi l&apos;activer ou
        le désactiver, le lier à un code pour le partager, ou le publier dans le catalogue public.
      </p>
    </MiseEnPageDecouvrirBureau>
  );
}
