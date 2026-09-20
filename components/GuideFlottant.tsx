"use client";

import { useEffect, useRef, useState } from "react";
import { Compass, MessageSquareText, Eye, Sparkles } from "lucide-react";
import { useOuvrirGuide, useOuvrirDecouverteCanal } from "@/lib/contexteChat";

// Bouton flottant "Guide de decouverte", etape 4 du chantier (voir
// specs-guide-decouverte.md a la racine de ce depot), 16/09/2026, demande
// Bourama. Monte dans AppShell.tsx, visible sur toutes les pages SAUF
// /chat (meme condition que le reste de la nav globale masquee sur
// /chat, voir AppShell.tsx) -- le chat a deja son propre point d'entree
// du guide, dans le menu "+" (etape 5, pas ce fichier).
//
// ETENDU le 20/09/2026 (chantier "demo + guide visuel", demande Bourama,
// voir specs-demo-decouverte.md dans ce depot) : reste UN SEUL bouton
// (decision Bourama : "unique bouton"), mais un vrai clic (pas un
// glissement) ouvre desormais un petit menu a trois choix -- Guide
// textuel (comportement d'origine, inchange), Guide visuel, Demo --
// plutot que de lancer directement le guide textuel comme avant. Meme
// convention de popover maison que AjoutContenuPopover
// (components/MesCodes.tsx) : etat local + overlay plein ecran pour
// fermer au clic exterieur, rien de nouveau importe.
//
// Deplacable par glisser-deposer (souris ET tactile, via les evenements
// Pointer). Position remise a sa valeur par defaut a chaque chargement
// de page : aucune persistance demandee par Bourama, meme principe que
// les fenetres de sections deplacables (voir lib/contexteFenetres.tsx,
// "jamais restaurees apres un rafraichissement").
//
// Position par defaut : bord droit, milieu vertical de l'ecran. Evite
// la bulle du chat flottant (bottom-right, desktop uniquement, voir
// ChatFlottant.tsx ~ligne 464) et la barre d'onglets du bas sur mobile.
const TAILLE = 52;
const MARGE = 16;
// Distance de deplacement (px) au dela de laquelle un pointerdown ->
// pointerup est traite comme un glissement plutot qu'un clic -- sans ce
// seuil, le moindre tremblement de la main pendant un clic ouvrirait le
// guide alors que l'utilisateur voulait juste relacher sur place.
const SEUIL_GLISSEMENT = 4;

export function GuideFlottant() {
  const ouvrirGuide = useOuvrirGuide();
  const ouvrirDecouverteCanal = useOuvrirDecouverteCanal();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  // Chantier "demo + guide visuel" (20/09/2026) : menu a trois choix,
  // voir commentaire d'en-tete du fichier.
  const [menuOuvert, setMenuOuvert] = useState(false);
  const enGlissement = useRef(false);
  const aBouge = useRef(false);
  const origine = useRef({ x: 0, y: 0, boutonX: 0, boutonY: 0 });

  useEffect(() => {
    setPosition({
      x: window.innerWidth - TAILLE - MARGE,
      y: window.innerHeight / 2 - TAILLE / 2,
    });
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!position) return;
    aBouge.current = false;
    enGlissement.current = true;
    origine.current = { x: e.clientX, y: e.clientY, boutonX: position.x, boutonY: position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!enGlissement.current) return;
    const dx = e.clientX - origine.current.x;
    const dy = e.clientY - origine.current.y;
    if (Math.abs(dx) > SEUIL_GLISSEMENT || Math.abs(dy) > SEUIL_GLISSEMENT) aBouge.current = true;
    setPosition({
      x: Math.min(Math.max(MARGE, origine.current.boutonX + dx), window.innerWidth - TAILLE - MARGE),
      y: Math.min(Math.max(MARGE, origine.current.boutonY + dy), window.innerHeight - TAILLE - MARGE),
    });
  }

  function onPointerUp() {
    enGlissement.current = false;
    // Un vrai clic (pas de glissement) ouvre desormais le petit menu a
    // trois choix, plus le guide textuel directement (voir commentaire
    // d'en-tete du fichier).
    if (!aBouge.current) setMenuOuvert((p) => !p);
  }

  if (!position) return null;

  // Menu a droite du bouton par defaut (le bouton est ancre au bord
  // droit de l'ecran, voir MARGE plus haut) -- bascule a gauche si le
  // bouton a ete glisse trop pres du bord droit pour que le menu tienne.
  const LARGEUR_MENU = 208;
  const ouvrirAGauche = position.x + TAILLE + LARGEUR_MENU + MARGE > window.innerWidth;
  const optionsMenu: { icone: typeof Compass; label: string; onClick: () => void }[] = [
    { icone: MessageSquareText, label: "Guide (texte)", onClick: () => ouvrirGuide() },
    { icone: Eye, label: "Guide (visuel)", onClick: () => ouvrirDecouverteCanal("visuel") },
    { icone: Sparkles, label: "Démo", onClick: () => ouvrirDecouverteCanal("demo") },
  ];

  return (
    <>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="Découvrir Classinus"
        style={{ left: position.x, top: position.y, width: TAILLE, height: TAILLE }}
        className="fixed z-40 flex touch-none select-none items-center justify-center rounded-cgpt-bouton bg-dj-accent-1 text-[#1A0D02] shadow-[0_4px_20px_rgba(0,0,0,0.35)] transition-colors hover:bg-dj-accent-2"
      >
        <Compass size={22} />
      </button>

      {menuOuvert && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOuvert(false)} />
          <div
            style={{
              left: ouvrirAGauche ? position.x - LARGEUR_MENU - 8 : position.x + TAILLE + 8,
              top: position.y,
              width: LARGEUR_MENU,
            }}
            className="fixed z-40 flex flex-col gap-0.5 rounded-xl border border-dj-bordure bg-dj-surface p-1.5 shadow-lg"
          >
            {optionsMenu.map(({ icone: Icone, label, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setMenuOuvert(false);
                  onClick();
                }}
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-dj-texte transition-colors hover:bg-dj-surface-haute"
              >
                <Icone size={16} className="shrink-0 text-dj-texte-muet" />
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
