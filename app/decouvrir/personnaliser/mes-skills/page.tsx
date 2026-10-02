import type { Metadata } from "next";
import { MiseEnPageDecouvrirPersonnaliser } from "@/components/EnTeteDecouvrirPersonnaliser";

// Chantier SEO/AEO de Classinus (26/09/2026). Titre, description et
// contenu validés par Bourama, revus une première fois pour préciser le
// rôle de l'IA (créer/modifier une skill).
export const metadata: Metadata = {
  title: "Mes skills Classinus : donne tes propres consignes à l'IA",
  description:
    "Crée et modifie tes propres consignes pour Classinus avec l'aide de l'IA, en plus de celles données par ton enseignant. Autant de skills que tu veux, modifiables à tout moment.",
};

export default function PageDecouvrirPersonnaliserMesSkills() {
  return (
    <MiseEnPageDecouvrirPersonnaliser>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Mes skills</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Une skill est une consigne personnelle que tu donnes à Classinus, en plus de ce que ton enseignant a déjà mis
        en place. Tu peux en créer et en modifier à tout moment, avec l&apos;aide de l&apos;IA.
      </p>
    </MiseEnPageDecouvrirPersonnaliser>
  );
}
