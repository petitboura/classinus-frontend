"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LogoSite } from "./LogoSite";
import { couleurMarque } from "@/lib/couleursIcones";

// La roue des outils (25/11/2026, demande Bourama) : pendant que l'IA travaille, les outils et ses
// notes tiennent sur UNE seule ligne repliée. Quand une nouvelle ligne arrive, elle monte par le
// bas et l'ancienne glisse vers le haut, comme une roue qui tourne. Aucune durée minimale pour un
// outil : plusieurs outils appelés en même temps se remplacent vite, au rythme où ils arrivent.
// Seule une note de l'IA reste affichée plus longtemps, selon sa longueur, pour qu'on ait le temps
// de la lire.
//
// Texte sur une seule ligne, coupé par « ... » quand il est trop long (surtout sur mobile), au lieu
// de passer à la ligne comme dans la liste dépliée.

// Pause entre deux lignes d'outils quand plusieurs attendent : juste de quoi voir la roue tourner.
const DELAI_ROUE_MS = 170;

// Temps d'affichage d'une note de l'IA avant de laisser la place à la suivante.
function dureeCommentaireMs(longueur: number): number {
  return Math.min(4500, Math.max(1400, longueur * 45));
}

export type ElementRoue = {
  cle: string;
  genre: "outil" | "commentaire";
  texte: string;
  // Outil encore en train de s'exécuter : son texte scintille (shimmer), comme dans la liste dépliée.
  enCours: boolean;
  Icone?: LucideIcon;
  // Un seul site visé : son logo remplace l'icône de l'outil, comme dans LigneOutil.
  domaine?: string | null;
};

function LigneRoue({ element, classe, onFin }: { element: ElementRoue; classe: string; onFin?: () => void }) {
  const couleur = element.Icone ? couleurMarque(element.Icone) : undefined;
  const Icone = element.Icone;
  return (
    <div className={`absolute inset-0 flex items-center gap-2 ${classe}`} onAnimationEnd={onFin}>
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        {element.genre === "commentaire" ? (
          <span className="h-1.5 w-1.5 rounded-full bg-dj-texte-muet" aria-hidden />
        ) : element.domaine ? (
          <LogoSite domaine={element.domaine} size={13} />
        ) : Icone ? (
          <Icone size={13} className={couleur ? undefined : "text-dj-texte"} style={couleur ? { color: couleur } : undefined} />
        ) : null}
      </span>
      <span
        key={element.enCours ? "en-cours" : "fini"}
        className={`block min-w-0 flex-1 animate-dj-fade-in-rapide truncate text-left text-[13px] ${
          element.enCours
            ? "animate-dj-shimmer bg-dj-shimmer-texte bg-[length:200%_100%] bg-clip-text text-transparent"
            : "text-dj-texte-muet"
        }`}
      >
        {element.texte}
      </span>
    </div>
  );
}

export function RoueOutils({ elements }: { elements: ElementRoue[] }) {
  const [index, setIndex] = useState(0);
  const [partant, setPartant] = useState<ElementRoue | null>(null);
  // Les éléments sont reconstruits à chaque rendu : on les lit par un ref pour que le minuteur
  // ne soit pas relancé (et la roue bloquée) à chaque mise à jour du texte de la réponse.
  const elementsRef = useRef(elements);
  elementsRef.current = elements;

  const cible = elements.length - 1;
  const indexAffiche = Math.min(index, Math.max(0, cible));
  const courant = elements[indexAffiche];
  const genreCourant = courant?.genre;
  const longueurCourante = courant?.texte.length ?? 0;

  useEffect(() => {
    if (indexAffiche >= cible) return;
    const delai = genreCourant === "commentaire" ? dureeCommentaireMs(longueurCourante) : DELAI_ROUE_MS;
    const minuteur = setTimeout(() => {
      setPartant(elementsRef.current[indexAffiche] ?? null);
      setIndex(indexAffiche + 1);
    }, delai);
    return () => clearTimeout(minuteur);
  }, [indexAffiche, cible, genreCourant, longueurCourante]);

  if (!courant) return null;

  return (
    <div className="relative h-5 min-w-0 flex-1 overflow-hidden">
      {partant && partant.cle !== courant.cle && (
        <LigneRoue key={`partant-${partant.cle}`} element={partant} classe="animate-dj-roue-sortie" onFin={() => setPartant(null)} />
      )}
      <LigneRoue
        key={courant.cle}
        element={courant}
        classe={partant ? "animate-dj-roue-entree" : "animate-dj-fade-in-rapide"}
      />
    </div>
  );
}
