import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Entrer un code Classinus : reçois ce qui a été partagé avec toi",
  description:
    "Quelqu'un t'a donné un code ? Entre-le pour recevoir tout ce qu'il partage : comportement, bibliothèque, ou texte.",
};

export default function PageDecouvrirBureauEntrerCode() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Entrer un code</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Si quelqu&apos;un t&apos;a donné un code, entre le ici pour recevoir tout ce qu&apos;il partage :
        comportement, bibliothèque, ou texte, selon ce que la personne y a mis.
      </p>
    </MiseEnPageDecouvrirBureau>
  );
}
