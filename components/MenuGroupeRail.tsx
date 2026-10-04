"use client";

import { useContext, useEffect, useRef } from "react";
import Link from "next/link";
import { ContexteStatutUtilisateur } from "@/lib/contexteStatutUtilisateur";
import { estCleSection } from "@/lib/cleSections";
import type { CleFenetre } from "@/lib/contexteFenetres";
import { sectionsVisiblesDuGroupe, type GroupeRail } from "@/lib/groupesRail";

// Bouton de groupe du rail (Bureau, Bibliothèque, Concentration,
// Personnaliser Classinus) : UN bouton qui montre la liste de ses
// sous-sections au survol. Les quatre groupes passent par ce même composant,
// donc le même comportement, la même apparence et la même source de
// sous-sections (lib/groupesRail.ts). Contrôlé depuis AppSidebar (via
// `ouvert` / `onOuvrir` / `onFermer`) pour que le conteneur du rail sache
// quand passer en overflow-visible, comme pour "Historique" et "Plus".
//
// Trois variantes :
// - "rail" : bouton du rail desktop, liste dessous au survol.
// - "mobile" : tiroir du chat sur mobile, pas de survol, une vraie navigation.
// - "plus" : ligne du menu "Plus" du rail dans le chat, liste sur le côté.

export type VarianteGroupe = "rail" | "mobile" | "plus";

// Délai avant fermeture quand la souris quitte le groupe : sans lui, le
// moindre trajet en diagonale ou le moindre écart fermait la liste avant
// qu'on puisse cliquer sur une sous-section.
const DELAI_FERMETURE_MS = 250;

const CLASSE_POSITION_LISTE: Record<VarianteGroupe, string> = {
  rail: "left-full top-0",
  mobile: "left-2 top-full",
  plus: "left-full top-0",
};

const CLASSE_ECART_LISTE: Record<VarianteGroupe, string> = {
  rail: "ml-1",
  mobile: "mt-1",
  plus: "ml-1",
};

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
  ouverte: boolean;
  LibelleRail: React.ComponentType<{ ouverte: boolean; children: React.ReactNode }>;
  pathname: string;
  contexteChat: boolean;
  ouvrirFenetre: (cle: CleFenetre) => void;
  // Requis pour la variante mobile : naviguer vraiment au lieu d'ouvrir la
  // fenêtre flottante (qui ne fonctionne pas sur mobile).
  naviguerVersSection: (href: string) => void;
  ouvert: boolean;
  onOuvrir: () => void;
  onFermer: () => void;
  onNaviguer?: () => void;
}) {
  const mobile = variante === "mobile";
  const plus = variante === "plus";
  const ref = useRef<HTMLDivElement>(null);
  const { estProfesseur } = useContext(ContexteStatutUtilisateur);
  const sections = sectionsVisiblesDuGroupe(groupe, estProfesseur);
  const actif = groupe.sections.some((s) => pathname === s.href) || pathname === groupe.href;

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
      if (!ref.current.contains(e.target as Node)) onFermer();
    }
    document.addEventListener("mousedown", onClicExterieur);
    return () => document.removeEventListener("mousedown", onClicExterieur);
  }, [ouvert, onFermer]);

  const classeBouton = plus
    ? `group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
        actif ? "text-dj-accent-1-texte" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
      } ${ouvert && !actif ? "bg-dj-surface-haute text-dj-texte" : ""}`
    : `group flex w-full items-center gap-2 rounded-xl transition-colors ${
        actif || ouvert ? "bg-dj-surface-haute text-dj-texte" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
      } ${mobile ? "px-2 py-2" : ""}`;

  return (
    <div
      ref={ref}
      className={`relative w-full ${mobile || plus ? "" : "mt-2"}`}
      onMouseEnter={() => {
        if (mobile) return;
        annulerFermeture();
        onOuvrir();
      }}
      onMouseLeave={() => !mobile && planifierFermeture()}
    >
      {/* Le bouton principal est un vrai lien : en navigation normale, il
          ouvre la page du groupe. Dans le chat il n'y a pas de page à ouvrir
          par-dessus, le clic bascule juste la liste. */}
      <Link
        href={groupe.href}
        aria-current={actif ? "page" : undefined}
        onClick={(e) => {
          if (contexteChat) {
            e.preventDefault();
            // Le survol a déjà ouvert la liste : un clic ne doit pas la
            // refermer (il fallait cliquer deux fois). Basculer seulement
            // quand il n'y a pas de survol (tactile), pour pouvoir ouvrir.
            if (!ouvert) onOuvrir();
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
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <groupe.Icone size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
            {mobile ? <span className="text-sm">{groupe.label}</span> : <LibelleRail ouverte={ouverte}>{groupe.label}</LibelleRail>}
          </>
        )}
      </Link>

      {ouvert && (
        // Le conteneur colle au bouton (aucun vide entre les deux) et porte
        // l'écart à l'intérieur de lui-même : la souris reste "dans" le
        // groupe pendant tout le trajet vers la liste.
        <div className={`absolute z-50 w-56 ${CLASSE_POSITION_LISTE[variante]}`}>
          <div
            className={`${CLASSE_ECART_LISTE[variante]} animate-dj-fade-in-rapide overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-1 shadow-[0_8px_30px_rgba(0,0,0,0.35)]`}
          >
            {sections.map((s) => {
              const estActif = pathname === s.href;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={estActif ? "page" : undefined}
                  onClick={(e) => {
                    onNaviguer?.();
                    onFermer();
                    // Dans le chat, la sous-section s'ouvre en fenêtre
                    // flottante par-dessus (desktop seulement), avec le même
                    // contenu que sa vraie page. Sur mobile, vraie navigation.
                    if (contexteChat) {
                      e.preventDefault();
                      if (mobile || !estCleSection(s.href)) {
                        naviguerVersSection(s.href);
                      } else {
                        ouvrirFenetre(s.href);
                      }
                    }
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    estActif ? "text-dj-accent-1-texte" : "text-dj-texte-muet hover:bg-dj-surface-haute hover:text-dj-texte"
                  }`}
                >
                  <s.Icone size={16} className="flex-shrink-0" />
                  {s.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
