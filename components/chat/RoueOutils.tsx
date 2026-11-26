"use client";

import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { LogoSite } from "./LogoSite";
import { couleurMarque } from "@/lib/couleursIcones";

// La roue des outils (25/11/2026, demande Bourama) : pendant que l'IA travaille, les outils et ses
// notes tiennent sur UNE seule ligne repliée. Quand une nouvelle ligne arrive, elle monte par le
// bas et l'ancienne glisse vers le haut, comme une roue qui tourne. Aucune durée minimale pour un
// outil : plusieurs outils appelés en même temps se remplacent vite, au rythme où ils arrivent.
// Seule une note de l'IA ou une réflexion reste affichée plus longtemps, selon sa longueur, pour
// qu'on ait le temps de la lire.
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
  // Clés des appels réunis dans cette ligne (un même outil répété = une seule ligne) : la roue sait
  // ainsi qu'une ligne a déjà été montrée, même quand sa composition ou son ordre change.
  membres: string[];
  genre: "outil" | "commentaire" | "reflexion";
  texte: string;
  // Outil ou réflexion encore en cours : son texte scintille (shimmer), comme dans la liste dépliée.
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

// La roue n'avance que vers une ligne jamais montrée (26/11/2026, retour Bourama : après un outil,
// tout repassait depuis le début). La dernière ligne reste affichée tant qu'aucune nouvelle
// n'arrive. À la création, elle se pose sur la dernière ligne, sauf si `depart` désigne la ligne que
// la personne voyait juste avant : elle part alors de celle-ci et tourne vers la suivante.
export function RoueOutils({ elements, depart }: { elements: ElementRoue[]; depart?: string | null }) {
  const dernier = elements[elements.length - 1];
  const rangDepart = depart ? elements.findIndex((e) => e.membres.includes(depart)) : -1;
  const [affiche, setAffiche] = useState<string>(() => (rangDepart >= 0 ? depart! : dernier?.membres[0] ?? ""));
  const [partant, setPartant] = useState<ElementRoue | null>(null);
  const vusRef = useRef<Set<string> | null>(null);
  if (vusRef.current === null) {
    const dejaVus = rangDepart >= 0 ? elements.slice(0, rangDepart + 1) : elements;
    vusRef.current = new Set(dejaVus.flatMap((e) => e.membres));
  }
  const vus = vusRef.current;
  const courant = elements.find((e) => e.membres.includes(affiche)) ?? dernier;
  const suivant = elements.find((e) => e !== courant && !e.membres.some((m) => vus.has(m)));

  // Les éléments sont reconstruits à chaque rendu : on les lit par un ref pour que le minuteur
  // ne soit pas relancé (et la roue bloquée) à chaque mise à jour du texte de la réponse.
  const courantRef = useRef(courant);
  courantRef.current = courant;
  const suivantRef = useRef(suivant);
  suivantRef.current = suivant;

  useEffect(() => {
    courantRef.current?.membres.forEach((m) => vus.add(m));
  });

  const genreCourant = courant?.genre;
  const longueurCourante = courant?.texte.length ?? 0;
  const cleSuivante = suivant?.cle;

  useEffect(() => {
    if (!cleSuivante) return;
    const delai = genreCourant !== "outil" ? dureeCommentaireMs(longueurCourante) : DELAI_ROUE_MS;
    const minuteur = setTimeout(() => {
      const prochain = suivantRef.current;
      if (!prochain) return;
      prochain.membres.forEach((m) => vus.add(m));
      setPartant(courantRef.current ?? null);
      setAffiche(prochain.membres[0]);
    }, delai);
    return () => clearTimeout(minuteur);
  }, [cleSuivante, genreCourant, longueurCourante, vus]);

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
