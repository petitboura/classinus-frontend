import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

// Chantier SEO/AEO de Classinus (12/10/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Éditeur de code Classinus : écris et exécute du code avec l'IA",
  description:
    "Écris du code dans n'importe quel langage, exécute le Python dans ton navigateur, et enregistre tes fichiers dans ta bibliothèque. Classinus peut t'aider en direct.",
};

export default function PageDecouvrirBureauEditeur() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Éditeur de code</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Écris du code dans n&apos;importe quel langage. Le bouton Exécuter lance le code directement dans le
        navigateur, pour le Python uniquement pour l&apos;instant. Le bouton avec trois points horizontaux
        regroupe Ouvrir, Enregistrer et Vers le chat. Ouvrir et Enregistrer utilisent ta bibliothèque
        personnelle comme espace de fichiers : tu choisis un fichier existant à ouvrir, ou tu enregistres le
        code affiché sous un nom, avec ou sans dossier. Vers le chat envoie ton code dans une conversation. Quand le canal en direct est actif,
        Classinus voit ton code : il peut te répondre, te montrer des lignes, te conseiller et écrire
        directement dans l&apos;éditeur. Tu peux annuler ce qu&apos;il écrit avec Ctrl+Z (Cmd+Z sur Mac).
      </p>
    </MiseEnPageDecouvrirBureau>
  );
}
