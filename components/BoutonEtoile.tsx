"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { basculerEtoileCatalogue, type TypeElementCataloguePublic } from "@/lib/api";

// 17/09/2026, demande Bourama : "comme sur GitHub, une étoile par
// personne, seul le nombre compte" -- bouton partagé entre
// BibliothequePublique.tsx (fichiers + dossiers) et
// ComportementsPublics.tsx (skills), pour ne pas dupliquer la logique
// de toggle + petite animation. `onBascule` reçoit le nouvel état
// renvoyé par le serveur (jamais deviné côté client) pour que l'appelant
// mette à jour sa liste localement, sans tout recharger.
export function BoutonEtoile({
  typeElement,
  elementId,
  count,
  active,
  onBascule,
}: {
  typeElement: TypeElementCataloguePublic;
  elementId: string;
  count: number;
  active: boolean;
  onBascule: (etoile: boolean, etoilesCount: number) => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const [pop, setPop] = useState(false);

  async function cliquer(e: React.MouseEvent) {
    e.stopPropagation();
    if (enCours) return;
    setEnCours(true);
    try {
      const resultat = await basculerEtoileCatalogue(typeElement, elementId);
      onBascule(resultat.etoile, resultat.etoiles_count);
      setPop(true);
      setTimeout(() => setPop(false), 200);
    } catch {
      // Silencieux : l'état affiché ne bouge pas, l'utilisateur peut
      // simplement recliquer (même philosophie que le reste de l'appli
      // pour les actions secondaires non bloquantes).
    } finally {
      setEnCours(false);
    }
  }

  return (
    <button
      type="button"
      onClick={cliquer}
      disabled={enCours}
      title={active ? "Retirer mon étoile" : "Mettre une étoile"}
      className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-transform disabled:cursor-not-allowed ${
        pop ? "scale-125" : "scale-100"
      } ${active ? "text-amber-500" : "text-gray-400 hover:text-amber-500"}`}
    >
      <Star className="h-3.5 w-3.5" fill={active ? "currentColor" : "none"} />
      <span>{count}</span>
    </button>
  );
}
