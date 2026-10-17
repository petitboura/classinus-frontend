"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FlottantAncre } from "@/components/FlottantAncre";
import type { CoteFlottant } from "@/lib/placementFlottant";
import { CELLULE_ICONE_RAIL, CELLULE_ICONE_TACTILE, ECART_ELEMENTS_RAIL } from "@/lib/styleBarreLaterale";

// Côtés essayés pour le panneau de l'en-tête : en dessous, puis au dessus.
const COTES_MENU: CoteFlottant[] = ["bas", "haut"];

// Libellé simple du menu profil quand il n'est pas dans le rail (panneau Plus
// du téléphone) : pas de repli animé, le texte est toujours visible.
function LibelleMenu({ children }: { ouverte: boolean; children: React.ReactNode }) {
  return <span className="text-sm font-semibold">{children}</span>;
}

// Menu déroulant ouvert au clic sur la photo de profil, en bas de la
// sidebar (22/08/2026, correctif demande Bourama : un clic sur la photo
// ne doit PAS naviguer directement, il doit ouvrir un petit menu : même
// pattern que Slack/Discord/Notion, et même mécanique de popover que le
// menu "Actions" de AppSidebar.tsx : ref + état booléen +
// fermeture au clic extérieur, popover ancré juste au dessus du bouton).
export function MenuProfil({
  avatarUrl,
  nomAffiche,
  ouverte,
  LibelleRail = LibelleMenu,
  mobile = false,
  entete = false,
  onNaviguer,
  menuOuvert,
  onBasculerMenu,
  onFermerMenu,
  enSortieMenu,
  onNaviguerVersParametres,
  onNaviguerVersProfil,
  onSeDeconnecter,
  pointRouge = false,
}: {
  avatarUrl: string | null;
  nomAffiche: string | null;
  ouverte: boolean;
  LibelleRail?: React.ComponentType<{ ouverte: boolean; children: React.ReactNode }>;
  mobile?: boolean;
  // Mode en-tête du panneau Plus (téléphone) : bouton compact avatar + nom,
  // popup ouvert vers le bas. Même contenu que dans la barre latérale.
  entete?: boolean;
  // Si fourni, remplace la navigation du Link (fermeture du chat et
  // router.replace côté panneau Plus, pour ne pas laisser d'entrée
  // d'historique intermédiaire).
  onNaviguer?: (href: string) => void;
  // État du popup remonté à AppSidebar (24/08/2026, correctif demande
  // Bourama : le popup s'affichait masqué/coupé) : avant, ce menu
  // gérait son ouverture tout seul en interne (useState local), donc
  // AppSidebar ne savait jamais qu'il fallait repasser le rail en
  // overflow-visible pendant que ce popup est ouvert. Même mécanique
  // que le menu "Actions" un peu plus haut dans ce fichier, qui avait
  // eu exactement ce problème le 20/08.
  menuOuvert: boolean;
  onBasculerMenu: () => void;
  // 01/09/2026 : onFermerMenu passé par AppSidebar route déjà par
  // demarrerFermeture (voir profilEnSortie/fermerProfilMenu côté
  // AppSidebar) : ce composant n'a plus sa propre instance du hook,
  // enSortieMenu lui est passé en prop pour rester en phase avec le
  // bouton retour matériel (même raisonnement que tiroirEnSortie).
  onFermerMenu: () => void;
  enSortieMenu: boolean;
  onNaviguerVersParametres: () => void;
  // 04/09/2026 : "Voir le profil" ouvrait Paramètres tout court, comme le
  // bouton "Paramètres" juste en dessous, au lieu d'aller directement sur
  // la section Profil (photo/nom/bio) à l'intérieur de Paramètres. Prop
  // séparée, même principe que onNaviguerVersParametres, mais vers
  // "/parametres/profil" (19/09/2026 : devenue une vraie page, voir
  // lib/sectionsParametres.tsx : avant, paramètre de requête
  // "/parametres?vue=profil" lu par l'ancien EspaceParametres.tsx).
  onNaviguerVersProfil: () => void;
  onSeDeconnecter: () => void;
  // 09/09/2026, demande Bourama : petit point rouge sur l'avatar tant
  // qu'une mise à jour n'a pas été installée : couvre en un seul endroit
  // le rail desktop ET le tiroir mobile du chat plein écran, puisque
  // MenuProfil est le même composant pour les deux (voir les deux appels
  // plus bas dans ce fichier).
  pointRouge?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Panneau du mode en-tête, rendu dans le corps de la page : il n'est plus un
  // descendant de ref, le clic à l'extérieur doit le connaître.
  const popupRef = useRef<HTMLDivElement | null>(null);
  const libelle = nomAffiche || "Mon compte";
  const fermer = onFermerMenu;
  const enSortie = enSortieMenu;

  useEffect(() => {
    if (!menuOuvert) return;
    function onClicExterieur(e: MouseEvent) {
      const cible = e.target as Node;
      if (ref.current && !ref.current.contains(cible) && !popupRef.current?.contains(cible)) fermer();
    }
    document.addEventListener("mousedown", onClicExterieur);
    return () => document.removeEventListener("mousedown", onClicExterieur);
    // eslint-disable-next-line react-hooks/exhaustive-deps : fermer recrée une fonction stable via demarrerFermeture (useCallback) + onFermerMenu du parent
  }, [menuOuvert, onFermerMenu]);

  const Avatar = (
    <span className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded-full border border-dj-bordure bg-dj-surface-haute">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element : avatar_url vient de Supabase Storage, hôte dynamique
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-dj-texte-muet">
          {libelle.trim().charAt(0).toUpperCase()}
        </span>
      )}
      {pointRouge && (
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-dj-surface bg-[var(--dj-erreur)]" />
      )}
    </span>
  );

  const contenuPopup = (
    <>
      {/* 07/09/2026, demande Bourama : "Paramètres" doit être une
          section normale comme les autres, accessible par un vrai
          lien Next.js (comme Bibliothèque/Notes/Chat, voir Link plus
          haut dans ce fichier) au lieu d'un bouton qui navigue par
          code : seule façon d'obtenir le préchargement automatique
          de Next.js et éviter le délai au premier clic (bug signalé :
          "rien ne se passe" la première fois qu'on ouvre
          Paramètres). Les effets de bord (fermeture du menu/tiroir,
          marquage historique) restent dans onNaviguerVersProfil/
          onNaviguerVersParametres (AppSidebar), qui ne font plus
          eux-mêmes de router.push : la navigation vient maintenant
          du href du Link. */}
      <Link
        href="/parametres/profil"
        onClick={(e) => {
          if (onNaviguer) {
            e.preventDefault();
            onNaviguer("/parametres/profil");
          }
          fermer();
          onNaviguerVersProfil();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-dj-surface-haute"
      >
        {Avatar}
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-medium text-dj-texte">{libelle}</span>
          <span className="text-xs text-dj-texte-muet">Voir le profil</span>
        </div>
      </Link>

      <div className="border-t border-dj-bordure" />

      <Link
        href="/parametres"
        onClick={(e) => {
          if (onNaviguer) {
            e.preventDefault();
            onNaviguer("/parametres");
          }
          fermer();
          onNaviguerVersParametres();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface-haute"
      >
        <Settings size={16} className="text-dj-texte-muet" />
        Paramètres
      </Link>

      <ThemeToggle LibelleRail={LibelleRail} ouverte />

      <div className="border-t border-dj-bordure" />

      <button
        onClick={() => {
          fermer();
          onSeDeconnecter();
        }}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--dj-erreur)] transition-colors hover:bg-dj-surface-haute"
      >
        <LogOut size={16} />
        Se déconnecter
      </button>
    </>
  );

  return (
    <div ref={ref} className={entete ? "relative max-w-full" : `relative w-full ${mobile ? "" : ECART_ELEMENTS_RAIL}`}>
      {entete ? (
        <button
          onClick={onBasculerMenu}
          aria-label={libelle}
          aria-expanded={menuOuvert}
          className="group flex max-w-full items-center gap-2.5 rounded-xl py-1 pr-2 text-dj-texte transition-colors hover:bg-dj-surface-haute"
        >
          {Avatar}
          <span className="truncate text-sm font-semibold">{libelle}</span>
        </button>
      ) : (
        <button
          onClick={onBasculerMenu}
          className={`group flex w-full items-center gap-2 rounded-xl text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte ${
            mobile ? "px-2" : ""
          }`}
        >
          <span className={mobile ? CELLULE_ICONE_TACTILE : CELLULE_ICONE_RAIL}>{Avatar}</span>
          {mobile ? <span className="text-sm font-semibold">{libelle}</span> : <LibelleRail ouverte={ouverte}>{libelle}</LibelleRail>}
        </button>
      )}

      {(menuOuvert || enSortie) &&
        (entete ? (
          // En-tête du panneau Plus : placé par la règle commune des menus ancrés
          // (voir FlottantAncre.tsx), qui le garde dans le panneau et au dessus du
          // clavier. Le clic à l'extérieur doit donc aussi regarder popupRef.
          <FlottantAncre
            ancreRef={ref}
            innerRef={popupRef}
            role="menu"
            cotes={COTES_MENU}
            alignement="debut"
            className={`w-56 rounded-cgpt-carte border border-dj-bordure bg-dj-surface shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${
              enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
            }`}
          >
            {contenuPopup}
          </FlottantAncre>
        ) : (
          <div
            className={`absolute bottom-full z-50 mb-2 w-56 overflow-hidden rounded-cgpt-carte border border-dj-bordure shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${
              mobile ? "left-2 bg-dj-surface" : "left-0 bg-dj-rail"
            } ${enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"}`}
          >
            {contenuPopup}
          </div>
        ))}
    </div>
  );
}
