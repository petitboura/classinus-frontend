"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import type { ActionSelection } from "./BarreActionsSelection";

// 13/09/2026, demande Bourama : sur mobile (et mobile installé), les
// cartes de la Bibliothèque (perso/publique, fichiers/dossiers) et de Mes
// codes entassaient jusqu'à 6 boutons icône côte à côte -- obligé de
// cacher certains, et même les noms restants perdaient en lisibilité,
// faute de place. Bourama a tranché : un seul bouton par carte. Ce
// composant remplace toute rangée de boutons d'action par un unique
// bouton "..." qui ouvre un menu déroulant listant les mêmes actions
// (même forme `ActionSelection` que BarreActionsSelection, pour rester
// cohérent). Comportement (ouverture/fermeture animée, clic extérieur,
// bascule automatique vers le haut si pas assez de place en dessous)
// calqué sur SelectPersonnalise.tsx pour rester cohérent avec le reste du
// dépôt plutôt que d'inventer un nouveau pattern.

export function MenuActionsCarte({
  actions,
  ariaLabel = "Actions",
  contraste = false,
  portail = false,
  declencheur,
  classeDeclencheur = "",
  desactive = false,
  niveauPortail = "z-[130]",
}: {
  actions: ActionSelection[];
  ariaLabel?: string;
  /** 02/10/2026, demande Bourama (panneau "quasi invisible") : bordure dorée
   * et ombre marquée, pour un menu posé sur une carte de même couleur que lui.
   * Absent : rendu inchangé pour les autres écrans. */
  contraste?: boolean;
  /** 02/10/2026 : rend le menu dans document.body, en position fixe. Une carte
   * désactivée est à demi transparente, ce qui crée une couche qui passerait
   * sous les cartes suivantes. Absent : rendu inchangé. */
  portail?: boolean;
  /** 07/10/2026 : contenu du bouton d'ouverture, a la place de l'icone "...".
   * Sert au bouton Telecharger du bloc animation (choix du format). Absent :
   * rendu inchange pour les autres ecrans. */
  declencheur?: ReactNode;
  /** Classes du bouton d'ouverture quand `declencheur` est fourni. */
  classeDeclencheur?: string;
  /** Bouton d'ouverture non cliquable. Absent : cliquable. */
  desactive?: boolean;
  /** Classe de niveau (z-index) du menu en mode `portail`. Le plein ecran des
   * blocs du chat est a z-[160] : un menu ouvert depuis son en-tete doit etre
   * au dessus. Absent : z-[130], inchange. */
  niveauPortail?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [ouvrirVersHaut, setOuvrirVersHaut] = useState(false);
  const [alignerAGauche, setAlignerAGauche] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [positionFixe, setPositionFixe] = useState<CSSProperties>({});
  // Hauteur estimée du menu (nombre d'actions * hauteur d'une ligne),
  // utilisée pour savoir s'il reste assez de place en dessous du bouton.
  const hauteurMenuEstimee = actions.length * 36 + 16;
  // Largeur max réelle du menu (cf. max-w-[16rem] plus bas) : sert à
  // savoir, avant même que le menu soit affiché, s'il tiendra en
  // s'alignant sur le bord droit du bouton (le comportement par défaut)
  // ou s'il déborderait de l'écran à gauche et doit s'aligner à gauche.
  const LARGEUR_MENU_MAX = 256;
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(() => setOuvert(false));

  const ouvertRef = useRef(ouvert);
  useEffect(() => {
    ouvertRef.current = ouvert;
  }, [ouvert]);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (!ouvertRef.current) return;
      const cible = e.target as Node;
      if (ref.current && !ref.current.contains(cible) && !(menuRef.current && menuRef.current.contains(cible))) fermer();
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fermer recrée une fonction stable via demarrerFermeture (useCallback), l'état ouvert est lu via ouvertRef
  }, []);

  useEffect(() => {
    if (!portail || !ouvert) return;
    // Le menu est en position fixe : il ne suit pas la page qui défile.
    const surDeplacement = () => fermer();
    window.addEventListener("scroll", surDeplacement, true);
    window.addEventListener("resize", surDeplacement);
    return () => {
      window.removeEventListener("scroll", surDeplacement, true);
      window.removeEventListener("resize", surDeplacement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fermer est stable via demarrerFermeture
  }, [portail, ouvert]);

  function ouvrirMenu() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const placeEnDessous = window.innerHeight - rect.bottom;
      const placeAuDessus = rect.top;
      const versHaut = placeEnDessous < hauteurMenuEstimee && placeAuDessus > placeEnDessous;
      const aGauche = rect.right - LARGEUR_MENU_MAX < 0;
      if (portail) {
        setPositionFixe({
          position: "fixed",
          ...(versHaut ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
          ...(aGauche ? { left: Math.max(8, rect.left) } : { right: Math.max(8, window.innerWidth - rect.right) }),
        });
      }
      setOuvrirVersHaut(versHaut);
      // Par défaut le menu s'aligne sur le bord droit du bouton (s'étend
      // vers la gauche) -- sûr tant que le bouton est proche du bord
      // droit de l'écran (cas normal, "..." toujours en fin de ligne).
      // S'il n'y a pas assez de place à gauche du bouton, on aligne à
      // gauche à la place (le menu s'étend alors vers la droite).
      setAlignerAGauche(rect.right - LARGEUR_MENU_MAX < 0);
    }
    setOuvert(true);
  }

  const panneau = () => (
    <div
          ref={menuRef}
          role={portail ? "menu" : undefined}
          style={portail ? positionFixe : undefined}
          className={`${portail ? niveauPortail : "absolute z-20"} max-w-[min(16rem,85vw)] min-w-[10rem] overflow-hidden rounded-lg border p-1 ${
            contraste
              ? "border-dj-bordure-forte bg-dj-surface shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
              : "border-dj-bordure bg-dj-surface-haute shadow-lg"
          } ${portail ? "" : `${alignerAGauche ? "left-0" : "right-0"} ${ouvrirVersHaut ? "bottom-full mb-1" : "top-full mt-1"}`} ${
            enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
          }`}
        >
          {actions.map((a) => (
            <button
              key={a.cle}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
                fermer();
              }}
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${contraste ? "hover:bg-dj-surface-haute" : "hover:bg-dj-surface"} ${
                a.destructif ? "text-[var(--dj-erreur)]" : "text-dj-texte"
              }`}
            >
              <span className="flex-shrink-0">{a.icone}</span>
              <span className="min-w-0 flex-1 truncate">{a.label}</span>
            </button>
          ))}
        </div>
  );

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        disabled={desactive}
        onClick={(e) => {
          e.stopPropagation();
          ouvert ? fermer() : ouvrirMenu();
        }}
        aria-label={ariaLabel}
        aria-haspopup={declencheur ? "menu" : undefined}
        aria-expanded={declencheur ? ouvert : undefined}
        className={
          declencheur
            ? classeDeclencheur
            : "flex flex-shrink-0 items-center rounded-full p-1.5 text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        }
      >
        {declencheur ?? <MoreVertical size={16} />}
      </button>

      {(ouvert || enSortie) && portail && typeof document !== "undefined"
        ? createPortal(panneau(), document.body)
        : (ouvert || enSortie) && panneau()}
    </div>
  );
}
