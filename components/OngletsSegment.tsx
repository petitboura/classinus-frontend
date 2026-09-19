"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { LucideIcon } from "lucide-react";

// Créé le 31/08/2026, demande Bourama : les groupes d'onglets à
// soulignement (border-b-2, hérités du web) faisaient "site dans une
// appli" sur natif. Remplacé par un seul composant partagé, repris
// partout où ce pattern existait (EspaceBibliotheque, EspaceConcentration,
// MesComportements x2), au lieu d'un correctif isolé sur un seul écran.
//
// Style validé par Bourama : pas de vrai plugin natif segmented control
// disponible côté Capacitor (vérifié), donc un fond en pilule (rounded-full)
// qui apparaît derrière l'onglet actif, sans bordure ni soulignement,
// inspiré de NotebookLM. Web et natif partagent exactement le même
// composant (demande explicite : partout, pas seulement natif).
//
// Couleurs reprises des tokens déjà en place (globals.css) : --dj-accent-1-conteneur
// (fond translucide) et --dj-accent-1-texte (texte accessible sur ce fond),
// déjà utilisés ailleurs dans l'app (EspacePlus.tsx, EspaceBibliotheque.tsx),
// pas de nouvelle couleur inventée.

// Classes d'une pastille, partagées par OngletsSegment (boutons) et
// OngletsLiens (liens) pour que les deux restent visuellement identiques
// (19/09/2026, demande Bourama : la Bibliothèque fonctionne comme
// Personnaliser Clovis, avec la même rangée de pastilles sur téléphone).
function classesPastille(actif: boolean, taille: "normal" | "compact"): string {
  const paddingBouton = taille === "compact" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm";
  return `flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium transition-colors duration-200 ${paddingBouton} ${
    actif ? "bg-dj-accent-1-conteneur text-dj-accent-1-texte" : "text-dj-texte-muet hover:text-dj-texte"
  }`;
}

export interface OngletSegment {
  valeur: string;
  libelle: string;
  icone?: LucideIcon;
}

interface OngletsSegmentProps {
  onglets: OngletSegment[];
  valeur: string;
  onChange: (valeur: string) => void;
  ariaLabel: string;
  taille?: "normal" | "compact";
}

export function OngletsSegment({ onglets, valeur, onChange, ariaLabel, taille = "normal" }: OngletsSegmentProps) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="dj-scrollbar-cachee flex w-full gap-1 overflow-x-auto">
      {onglets.map(({ valeur: v, libelle, icone: Icone }) => {
        const actif = v === valeur;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={actif}
            onClick={() => onChange(v)}
            className={classesPastille(actif, taille)}
          >
            {Icone && <Icone size={taille === "compact" ? 12 : 14} />}
            {libelle}
          </button>
        );
      })}
    </div>
  );
}

// Version "vrais liens" de la rangée de pastilles (19/09/2026, demande
// Bourama : sur téléphone, passer d'une page voisine à l'autre doit se
// faire en un seul toucher, sans revenir à la liste). Chaque pastille est
// un lien vers une vraie page : l'adresse change, la page choisie est
// retenue au rafraîchissement, et le retour reste logique.
//
// `replace` : passer d'une page voisine à l'autre remplace l'entrée
// courante de l'historique au lieu d'en ajouter une. Sinon, après trois
// changements, il faudrait appuyer trois fois sur retour pour quitter le
// groupe. Le retour ramène ainsi toujours à la liste d'où l'on est venu.
//
// La pastille active est recentrée dans la rangée à chaque changement de
// page, car la rangée peut défiler de côté quand il y a beaucoup de
// pastilles et la page repart de zéro à chaque navigation.
interface OngletLien {
  href: string;
  libelle: string;
}

export function OngletsLiens({
  onglets,
  ariaLabel,
  taille = "normal",
}: {
  onglets: OngletLien[];
  ariaLabel: string;
  taille?: "normal" | "compact";
}) {
  const pathname = usePathname();
  const rangeeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const rangee = rangeeRef.current;
    const active = rangee?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!rangee || !active) return;
    rangee.scrollLeft = active.offsetLeft - (rangee.clientWidth - active.clientWidth) / 2;
  }, [pathname]);

  return (
    <nav ref={rangeeRef} aria-label={ariaLabel} className="dj-scrollbar-cachee relative flex w-full gap-1 overflow-x-auto">
      {onglets.map(({ href, libelle }) => {
        const actif = pathname === href;
        return (
          <Link key={href} href={href} replace aria-current={actif ? "page" : undefined} className={classesPastille(actif, taille)}>
            {libelle}
          </Link>
        );
      })}
    </nav>
  );
}
