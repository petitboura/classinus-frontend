"use client";

import { useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ContexteStatutUtilisateur } from "@/lib/contexteStatutUtilisateur";
import { estCleSection } from "@/lib/cleSections";
import type { CleFenetre } from "@/lib/contexteFenetres";
import { sectionsVisiblesDuGroupe, type GroupeRail } from "@/lib/groupesRail";
import { FlottantAncre } from "@/components/FlottantAncre";
import type { CoteFlottant } from "@/lib/placementFlottant";
import {
  CELLULE_ICONE_RAIL,
  CELLULE_ICONE_TACTILE,
  ECART_ELEMENTS_TIROIR,
  ECART_LIBELLE_TIROIR,
  ECART_ELEMENTS_RAIL,
  TAILLE_ICONE_RAIL,
  TRAIT_ICONE_RAIL,
} from "@/lib/styleBarreLaterale";

// Bouton de groupe de la barre latérale (Bureau, Bibliothèque, Higgsfield,
// Concentration, Personnaliser Classinus) : UN bouton, ses sous-sections
// viennent toujours de lib/groupesRail.ts. Contrôlé depuis AppSidebar (via
// `ouvert` / `onOuvrir` / `onFermer`) pour le panneau flottant.
//
// Modèle mixte (27/11/2026, demande de Bourama : "le mixte") :
// - Barre dépliée (PC) et tiroir mobile : les sous-sections s'ouvrent dans la
//   barre elle-même, en accordéon animé. Aucun panneau flottant, donc rien qui
//   double ce que la barre montre déjà et plus de couloir étroit à suivre à la
//   souris. Sur PC, hors du chat, un clic sur le bouton du groupe plie ou
//   déplie la liste (demande du 27/11/2026) ; dans le chat, il mène à la page
//   du groupe et seul le chevron à droite plie ou déplie. Sur mobile, toucher
//   la ligne plie ou déplie la liste, on entre dans une page en touchant sa
//   ligne.
// - Barre repliée (icônes seules) et ligne du menu "Plus" : le survol ouvre un
//   petit panneau flottant, placé par FlottantAncre (règle commune des
//   panneaux ancrés). Il garde le comportement demandé le 05/10/2026 : le
//   premier clic ne change rien, le second entre dans la page du groupe.
// - Un groupe sans aucune sous-section entre directement dans sa page.
//
// Trois variantes :
// - "rail" : bouton du rail PC.
// - "mobile" : tiroir du chat sur mobile.
// - "plus" : ligne du menu "Plus" du rail dans le chat, panneau sur le côté.

export type VarianteGroupe = "rail" | "mobile" | "plus";

// Délai avant fermeture quand la souris quitte le groupe : sans lui, le
// moindre trajet en diagonale fermait le panneau avant qu'on puisse cliquer.
const DELAI_FERMETURE_MS = 250;

// Durée de l'animation de sortie du panneau, alignée sur "dj-flyout-sortie"
// dans tailwind.config.ts : si l'une change, changer l'autre.
const DUREE_SORTIE_PANNEAU_MS = 140;

// Côtés essayés pour le panneau : à droite du bouton, puis à gauche.
const COTES_PANNEAU: CoteFlottant[] = ["droite", "gauche"];

export function MenuGroupe({
  groupe,
  variante = "rail",
  ouverte,
  LibelleRail,
  pathname,
  contexteChat,
  ouvrirFenetre,
  naviguerVersSection,
  ouvert,
  onOuvrir,
  onFermer,
  onNaviguer,
}: {
  groupe: GroupeRail;
  variante?: VarianteGroupe;
  /** Rail déplié (libellés visibles). Toujours vrai pour le tiroir mobile. */
  ouverte: boolean;
  LibelleRail: React.ComponentType<{ ouverte: boolean; children: React.ReactNode }>;
  pathname: string;
  contexteChat: boolean;
  ouvrirFenetre: (cle: CleFenetre) => void;
  // Requis pour la variante mobile : naviguer vraiment au lieu d'ouvrir la
  // fenêtre flottante (qui ne fonctionne pas sur mobile).
  naviguerVersSection: (href: string) => void;
  /** Le panneau flottant est voulu ouvert (jamais utilisé en accordéon). */
  ouvert: boolean;
  onOuvrir: () => void;
  onFermer: () => void;
  onNaviguer?: () => void;
}) {
  const mobile = variante === "mobile";
  const plus = variante === "plus";
  const ref = useRef<HTMLDivElement>(null);
  const panneauRef = useRef<HTMLDivElement | null>(null);
  const { estProfesseur } = useContext(ContexteStatutUtilisateur);
  const sections = sectionsVisiblesDuGroupe(groupe, estProfesseur);
  const actif = groupe.sections.some((s) => pathname === s.href) || pathname === groupe.href;

  const sansSousSection = sections.length === 0;

  // Les sous-sections s'ouvrent dans la barre quand elle est dépliée et dans
  // le tiroir mobile. Sinon (barre repliée, menu "Plus"), panneau flottant.
  const enLigne = mobile || (variante === "rail" && ouverte);

  // Accordéon : ouvert d'office pour le groupe de la page où l'on se trouve,
  // puis libre. L'état survit au repli de la barre.
  const [deplie, setDeplie] = useState(actif);
  useEffect(() => {
    if (actif) setDeplie(true);
  }, [actif]);
  const accordeonOuvert = enLigne && deplie && !sansSousSection;

  const panneauVoulu = ouvert && !sansSousSection && !enLigne;

  // Le panneau reste monté le temps de son animation de sortie.
  const [panneauMonte, setPanneauMonte] = useState(false);
  useEffect(() => {
    if (panneauVoulu) {
      setPanneauMonte(true);
      return;
    }
    if (!panneauMonte) return;
    const minuteur = setTimeout(() => setPanneauMonte(false), DUREE_SORTIE_PANNEAU_MS);
    return () => clearTimeout(minuteur);
  }, [panneauVoulu, panneauMonte]);
  const affichePanneau = panneauVoulu || panneauMonte;
  const panneauEnSortie = affichePanneau && !panneauVoulu;

  // Si la barre se déplie pendant que le panneau est ouvert, il se referme :
  // la liste est alors dans la barre.
  useEffect(() => {
    if (enLigne && ouvert) onFermer();
  }, [enLigne, ouvert, onFermer]);

  // Vrai après le premier clic sur le bouton pendant que le panneau est
  // affiché (PC, barre repliée). Le second clic entre alors dans la page.
  const premierClicFait = useRef(false);
  useEffect(() => {
    if (!ouvert) premierClicFait.current = false;
  }, [ouvert]);

  const minuteurFermeture = useRef<ReturnType<typeof setTimeout> | null>(null);
  function annulerFermeture() {
    if (minuteurFermeture.current) {
      clearTimeout(minuteurFermeture.current);
      minuteurFermeture.current = null;
    }
  }
  function planifierFermeture() {
    annulerFermeture();
    minuteurFermeture.current = setTimeout(() => {
      minuteurFermeture.current = null;
      onFermer();
    }, DELAI_FERMETURE_MS);
  }
  useEffect(() => annulerFermeture, []);

  useEffect(() => {
    if (!ouvert) return;
    function onClicExterieur(e: MouseEvent) {
      if (!ref.current) return;
      // Instance masquee (display:none sur un parent, par exemple le rail
      // ordinateur sur un telephone) : tout appui est "exterieur" pour elle.
      // Sans cette garde elle fermait le groupe sur le mousedown, avant que
      // le clic n'arrive sur la sous-section de l'instance visible.
      if (ref.current.getClientRects().length === 0) return;
      const cible = e.target as Node;
      // Le panneau est rendu dans le corps de la page : il n'est plus un
      // descendant DOM du bouton, il faut donc le tester aussi.
      if (!ref.current.contains(cible) && !panneauRef.current?.contains(cible)) onFermer();
    }
    document.addEventListener("mousedown", onClicExterieur);
    return () => document.removeEventListener("mousedown", onClicExterieur);
  }, [ouvert, onFermer]);

  useEffect(() => {
    if (!panneauVoulu) return;
    function onTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onFermer();
    }
    document.addEventListener("keydown", onTouche);
    return () => document.removeEventListener("keydown", onTouche);
  }, [panneauVoulu, onFermer]);

  function entrerDansGroupe() {
    onNaviguer?.();
    onFermer();
    naviguerVersSection(groupe.href);
  }

  function cliquerSection(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    onNaviguer?.();
    onFermer();
    // Dans le chat, la sous-section s'ouvre en fenêtre flottante par-dessus
    // (desktop seulement), avec le même contenu que sa vraie page. Sur
    // mobile, vraie navigation.
    if (contexteChat) {
      e.preventDefault();
      if (mobile || !estCleSection(href)) {
        naviguerVersSection(href);
      } else {
        ouvrirFenetre(href);
      }
    }
  }

  const classeBouton = plus
    ? `group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
        actif ? "text-dj-accent-1-texte" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
      } ${panneauVoulu && !actif ? "bg-dj-surface-haute text-dj-texte" : ""}`
    : `group flex w-full items-center ${mobile ? `${ECART_LIBELLE_TIROIR} px-2` : "gap-2"} rounded-xl transition-colors ${
        actif || panneauVoulu ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
      }`;

  const ariaExpanded = sansSousSection
    ? undefined
    : mobile || (enLigne && !contexteChat)
      ? accordeonOuvert
      : enLigne
        ? undefined
        : panneauVoulu;

  return (
    <div
      ref={ref}
      className={`relative w-full ${plus ? "" : mobile ? ECART_ELEMENTS_TIROIR : ECART_ELEMENTS_RAIL}`}
      onMouseEnter={() => {
        if (enLigne) return;
        annulerFermeture();
        onOuvrir();
      }}
      onMouseLeave={() => {
        if (enLigne) return;
        // La souris quitte le groupe : le compte des clics repart de zéro.
        premierClicFait.current = false;
        planifierFermeture();
      }}
    >
      {/* Le bouton principal est un vrai lien : en navigation normale, il
          ouvre la page du groupe. Dans le chat, voir le comportement décrit
          en haut du fichier. */}
      <Link
        href={groupe.href}
        aria-current={actif ? "page" : undefined}
        aria-expanded={ariaExpanded}
        onClick={(e) => {
          if (contexteChat) {
            e.preventDefault();
            if (sansSousSection || (enLigne && !mobile)) {
              // Rien à déplier ici (ou la liste a son propre chevron) : on
              // entre directement dans la page du groupe.
              entrerDansGroupe();
            } else if (mobile) {
              setDeplie((v) => !v);
            } else if (!ouvert) {
              // Panneau pas encore affiché (clavier, par exemple) : ce clic
              // l'ouvre seulement.
              onOuvrir();
            } else if (!premierClicFait.current) {
              premierClicFait.current = true;
            } else {
              premierClicFait.current = false;
              entrerDansGroupe();
            }
          } else if (enLigne && !sansSousSection) {
            // Hors du chat, barre dépliée : le clic plie ou déplie la liste, il
            // n'emmène pas dans la page du groupe.
            e.preventDefault();
            setDeplie((v) => !v);
          } else {
            onNaviguer?.();
            onFermer();
          }
        }}
        className={classeBouton}
      >
        {plus ? (
          <>
            <groupe.Icone size={16} className="flex-shrink-0" />
            {groupe.label}
          </>
        ) : (
          <>
            <span className={mobile ? CELLULE_ICONE_TACTILE : CELLULE_ICONE_RAIL}>
              <groupe.Icone size={TAILLE_ICONE_RAIL} strokeWidth={TRAIT_ICONE_RAIL} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
            {mobile ? <span className="text-sm font-semibold">{groupe.label}</span> : <LibelleRail ouverte={ouverte}>{groupe.label}</LibelleRail>}
            {mobile && !sansSousSection && (
              <ChevronRight
                size={TAILLE_ICONE_RAIL}
                strokeWidth={TRAIT_ICONE_RAIL}
                aria-hidden="true"
                className={`ml-auto mr-1 flex-shrink-0 transition-transform duration-200 ${accordeonOuvert ? "rotate-90" : ""}`}
              />
            )}
          </>
        )}
      </Link>

      {/* Chevron du rail déplié : ouvre ou ferme la liste dans la barre, sans
          quitter la page. Hors du lien pour ne pas imbriquer deux contrôles. */}
      {variante === "rail" && !sansSousSection && (
        <button
          type="button"
          aria-label={groupe.label}
          aria-expanded={accordeonOuvert}
          tabIndex={ouverte ? 0 : -1}
          onClick={() => setDeplie((v) => !v)}
          className={`absolute right-1 top-0.5 flex h-6 w-6 items-center justify-center rounded-md text-dj-texte-muet transition-[opacity,background-color,color] duration-200 hover:bg-dj-bordure hover:text-dj-texte ${
            ouverte ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <ChevronRight
            size={TAILLE_ICONE_RAIL}
            strokeWidth={TRAIT_ICONE_RAIL}
            className={`transition-transform duration-200 ${accordeonOuvert ? "rotate-90" : ""}`}
          />
        </button>
      )}

      {/* Accordéon dans la barre : la hauteur s'anime de 0 à la taille réelle,
          jamais d'apparition brute. Le filet vertical tombe sous l'icône du
          groupe et relie visuellement les lignes à leur parent. */}
      {!plus && !sansSousSection && (
        <div
          className={`grid transition-[grid-template-rows,visibility] duration-300 ease-cgpt-doux ${
            accordeonOuvert ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
          }`}
        >
          <div className="overflow-hidden">
            <div className={`mb-1 mt-0.5 border-l border-dj-bordure pl-2 ${mobile ? "ml-6" : "ml-5"}`}>
              {sections.map((s) => {
                const estActif = pathname === s.href;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    aria-current={estActif ? "page" : undefined}
                    tabIndex={accordeonOuvert ? 0 : -1}
                    onClick={(e) => cliquerSection(e, s.href)}
                    className={`flex w-full items-center rounded-lg text-left font-medium transition-colors ${
                      mobile ? "gap-2.5 px-2.5 py-2 text-sm" : "gap-2 px-2 py-1.5 text-[13px]"
                    } ${estActif ? "bg-dj-surface-haute text-dj-accent-1-texte" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"}`}
                  >
                    <s.Icone size={TAILLE_ICONE_RAIL} strokeWidth={TRAIT_ICONE_RAIL} className="flex-shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Panneau flottant : barre repliée et menu "Plus" seulement. Posé par
          FlottantAncre, à droite du bouton. Le bord transparent de gauche
          (pl-3) fait partie du panneau pour la souris : en passant du bouton
          au panneau, le curseur reste toujours dans l'un des deux. Le titre du
          groupe rappelle d'où viennent les lignes. Le vide transparent autour du
          panneau (py-8, pr-8) laisse la place à l'ombre : FlottantAncre coupe
          tout ce qui dépasse de sa boîte, ce qui donnait une ombre tranchée en
          bas. Un petit triangle, au milieu
          du bord, pointe vers le bouton (le panneau est centré sur lui). */}
      {affichePanneau && !sansSousSection && (
        <FlottantAncre
          ancreRef={ref}
          innerRef={panneauRef}
          role="menu"
          cotes={COTES_PANNEAU}
          alignement="centre"
          ecart={0}
          className={panneauEnSortie ? "pointer-events-none animate-dj-flyout-sortie" : "animate-dj-flyout-entree"}
        >
          <div data-flyout-groupe onMouseEnter={annulerFermeture} onMouseLeave={planifierFermeture} className="py-8 pl-3 pr-8">
            <div className="relative min-w-[12rem] max-w-[17rem] rounded-xl border border-dj-bordure bg-dj-panneau p-1.5 shadow-[4px_8px_24px_-8px_rgba(0,0,0,0.3)] [--dj-surface-haute:var(--dj-panneau-survol)]">
              <p className="truncate px-2.5 pb-1 pt-1 text-xs font-semibold text-dj-texte-muet">{groupe.label}</p>
              <div className="mx-1 mb-1 h-px bg-dj-bordure" />
              {sections.map((s) => {
                const estActif = pathname === s.href;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    role="menuitem"
                    aria-current={estActif ? "page" : undefined}
                    onClick={(e) => cliquerSection(e, s.href)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-semibold transition-colors ${
                      estActif ? "bg-dj-surface-haute text-dj-accent-1-texte" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
                    }`}
                  >
                    <s.Icone size={16} strokeWidth={TRAIT_ICONE_RAIL} className="flex-shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </Link>
                );
              })}
              {/* Petit triangle au milieu du bord côté bouton : le panneau est
                  centré sur son bouton, donc il pointe vers lui. Un carré
                  tourné de 45 degrés, dont les deux bords tournés vers
                  l'extérieur reprennent la bordure du panneau et dont le fond
                  recouvre la bordure du panneau à cet endroit. */}
              <div
                aria-hidden="true"
                className="absolute -left-[6px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 rotate-45 border-b border-l border-dj-bordure bg-dj-panneau"
              />
            </div>
          </div>
        </FlottantAncre>
      )}
    </div>
  );
}
