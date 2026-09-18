"use client";

import { Share2, Star, Library, Sparkles } from "lucide-react";
import type { CompteursCatalogue } from "@/lib/api";

/**
 * 18/09/2026, chantier "profil contributeur bibliotheque publique",
 * étape 9 : ligne compacte partages/étoiles/enregistrements/CTA sur
 * chaque carte de BibliothequePublique.tsx. Purement informatif (pas
 * cliquable) -- l'étoile INTERACTIVE reste BoutonEtoile.tsx, affichée
 * séparément sur la carte ; le total ici est juste rappelé pour la
 * cohérence du bloc. `compteurs` undefined pendant le chargement du lot
 * (voir analytiqueCatalogueEnLot) : rien n'est affiché plutôt qu'un 0
 * trompeur.
 */
export function BlocAnalytiqueCarte({ compteurs }: { compteurs: CompteursCatalogue | undefined }) {
  if (!compteurs) return null;

  const items = [
    { icone: Share2, valeur: compteurs.partages_count, titre: "Partages" },
    { icone: Star, valeur: compteurs.etoiles_count, titre: "Étoiles" },
    { icone: Library, valeur: compteurs.enregistrements_count, titre: "Enregistrements" },
    { icone: Sparkles, valeur: compteurs.cta_count, titre: "Discussions lancées avec l'IA" },
  ];

  return (
    <div className="flex items-center gap-2.5 text-[11px] text-dj-texte-muet">
      {items.map(({ icone: Icone, valeur, titre }) => (
        <span key={titre} title={titre} className="flex items-center gap-0.5">
          <Icone size={11} />
          {valeur}
        </span>
      ))}
    </div>
  );
}
