import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

export const metadata: Metadata = {
  title: "Éditeur de code Classinus : écrire, exécuter et enregistrer du code",
  description: "Écris du code dans plusieurs langages, exécute Python, ouvre et enregistre tes fichiers dans ta bibliothèque et demande de l'aide avec le canal en direct.",
};

export default function PageDecouvrirBureauEditeur() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Éditeur de code</h1>
      <p className="mt-4 text-base leading-relaxed text-dj-texte">
        L'éditeur de Classinus te permet d'écrire et de modifier du code dans un espace dédié. Tu peux travailler dans plusieurs langages, mais le bouton Exécuter prend actuellement en charge Python uniquement.
      </p>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Ouvrir et enregistrer tes fichiers</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Le menu à trois points regroupe les commandes Ouvrir, Enregistrer et Vers le chat. Ouvrir et Enregistrer utilisent ta bibliothèque personnelle : tu peux sélectionner un fichier existant ou enregistrer le code sous un nom et, si tu le souhaites, dans un dossier. Vers le chat transmet le code à une conversation pour que tu puisses poser une question à son sujet.</p>
      </section>
      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-dj-texte">Travailler avec Classinus en direct</h2>
        <p className="mt-2 text-sm leading-relaxed text-dj-texte-muet">Lorsque le canal en direct est activé, Classinus peut recevoir le contexte du code affiché, proposer des explications et écrire des modifications dans l'éditeur. Relis les changements avant de les conserver : tu peux annuler une insertion avec Ctrl+Z (ou Cmd+Z sur Mac).</p>
      </section>
    </MiseEnPageDecouvrirBureau>
  );
}
