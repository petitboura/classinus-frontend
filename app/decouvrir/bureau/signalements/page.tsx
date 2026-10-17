import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Signalements Classinus : les problèmes remontés par tes élèves",
  description: "Discute avec Classinus de chaque signalement reçu de tes élèves, à ton rythme, rien n'est automatique.",
};

export default function PageDecouvrirBureauSignalements() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Signalements</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Un élève a signalé un problème sur une réponse de Classinus ? Ouvre une conversation avec Classinus pour
        échanger sur ce cas, à ton rythme. Rien n&apos;est automatique, rien n&apos;est traité sans toi. Réservé aux
        enseignants.
      </p>
    </MiseEnPageDecouvrirBureau>
  );
}
