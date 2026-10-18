import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

export const metadata: Metadata = {
  title: "Entrer un code Classinus : récupérer un partage",
  description: "Saisis un code reçu pour récupérer les éléments que son auteur a choisi de partager : consignes, contenu de bibliothèque ou texte.",
};

export default function PageDecouvrirBureauEntrerCode() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Entrer un code</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Si un enseignant, un camarade ou un autre utilisateur t'a transmis un code, saisis-le dans Classinus pour récupérer le partage qui lui est associé. Le contenu reçu dépend des éléments que l'auteur a choisis au moment de créer le code.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Avant de saisir le code</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Vérifie que le code vient bien de la personne qui devait te transmettre le contenu. Un code peut donner accès à des consignes, à du contenu de bibliothèque ou à un texte ; consulte ce qui est ajouté avant de t'en servir.</p>
      </section>
    </MiseEnPageDecouvrirBureau>
  );
}
