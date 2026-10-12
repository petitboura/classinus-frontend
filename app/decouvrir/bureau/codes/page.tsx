import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Mes codes Classinus : partage un contenu avec un code",
  description: "Crée un code et partage-le : tous ceux qui l'entrent reçoivent ce que tu y mets, modifiable à tout moment.",
};

export default function PageDecouvrirBureauCodes() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Mes codes</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Crée un code et partage le : tous ceux qui l&apos;entrent reçoivent tout ce que tu y mets (comportement,
        bibliothèque, texte). Modifiable après coup, tout le monde voit la mise à jour dès qu&apos;elle est faite.
      </p>
    </MiseEnPageDecouvrirBureau>
  );
}
