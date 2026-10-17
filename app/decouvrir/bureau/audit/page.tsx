import type { Metadata } from "next";
import { MiseEnPageDecouvrirBureau } from "@/components/EnTeteDecouvrirBureau";

// Chantier SEO/AEO de Classinus (27/09/2026). Titre, description et
// contenu validés par Bourama.
export const metadata: Metadata = {
  title: "Audit hebdomadaire Classinus : suis les signalements de tes élèves",
  description: "Un résumé chaque semaine des signalements de tes élèves, avec un tableau de bord détaillé par code.",
};

export default function PageDecouvrirBureauAudit() {
  return (
    <MiseEnPageDecouvrirBureau>
      <h1 className="font-display text-2xl font-bold text-dj-texte">Audit hebdomadaire</h1>
      <p className="mt-4 text-sm leading-relaxed text-dj-texte-muet">
        Chaque semaine, Classinus t&apos;envoie un résumé des signalements reçus de tes élèves, même s&apos;il
        n&apos;y en a aucun. Les signalements en attente sont listés en priorité, avec un accès direct pour les
        corriger. Tu peux aussi ouvrir le tableau de bord complet d&apos;un de tes codes : élèves actifs,
        conversations, heures les plus actives, outils les plus utilisés. Réservé aux enseignants.
      </p>
    </MiseEnPageDecouvrirBureau>
  );
}
