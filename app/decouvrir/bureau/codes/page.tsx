import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

export const metadata: Metadata = {
  title: "Créer un code Classinus pour partager des consignes ou des ressources",
  description: "Crée un code, associe-lui les éléments à partager et transmets-le aux personnes concernées. Tu peux modifier le contenu associé par la suite.",
};

export default function PageDecouvrirBureauCodes() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Mes codes</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        Un code Classinus permet de partager un ensemble d'éléments sans devoir les transmettre séparément à chaque personne. Tu crées le code, tu lui associes le contenu voulu, puis tu communiques ce code aux personnes qui doivent le récupérer.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Ce que tu peux associer à un code</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-dj-texte-muet">
          <li>Un comportement ou des consignes destinées à guider Classinus.</li>
          <li>Du contenu de bibliothèque que tu souhaites partager.</li>
          <li>Un texte ou des informations utiles aux destinataires.</li>
        </ul>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Modifier un partage</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Tu peux modifier les éléments associés au code après sa création. Les personnes qui utilisent ce code peuvent alors retrouver la version mise à jour. Avant de partager un document, assure-toi d'avoir les droits nécessaires.</p>
      </section>
    </MiseEnPageDecouvrirBureau>
  );
}
