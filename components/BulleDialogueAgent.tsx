"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier J. Rendu visuel de la
// bulle de dialogue de Clovis (état dans lib/contexteCanalEnDirect.tsx,
// même séparation état/rendu que CurseurVirtuelAgent.tsx pour
// ContexteCurseurVirtuel).
//
// Décision Bourama (18/09/2026) : la bulle n'est PAS persistante --
// elle s'ouvre seulement quand Clovis a un texte à dire (dernierTexte
// non null), se ferme sinon (effacement automatique après un délai,
// voir lib/contexteCanalEnDirect.tsx).
//
// Révisé le 19/09/2026 (décision Bourama) :
// - elle n'apparaît QUE canal en direct activé, jamais sinon ;
// - elle suit le curseur de l'appli : le curseur virtuel de Clovis quand
//   il est affiché (donc aussi sur téléphone, où il n'y a pas de souris),
//   sinon la vraie souris. Si aucune position n'est encore connue (téléphone,
//   curseur jamais apparu), elle s'affiche en haut au centre de l'écran.
//
// L'écoute mousemove n'est active que pendant qu'un texte est affiché,
// pour ne rien faire tourner inutilement le reste du temps (même souci
// de performance que le MutationObserver dans lib/canalAgentApplicatif.ts).

import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useContext, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";

// Chargé à la demande : le rendu complet (code, formules, schémas) est
// lourd et la bulle vit dans AppShell, donc sur toutes les pages. Ce code
// n'est téléchargé qu'à la toute première apparition d'un texte de Clovis.
const RenduMarkdownAutonome = dynamic(
  () => import("@/components/chat/RenduMarkdownAutonome").then((m) => m.RenduMarkdownAutonome),
  { ssr: false }
);

const DECALAGE_X = 18;
const DECALAGE_Y = 18;
const LARGEUR_MAX = 320;
const MARGE_BORD = 8;
const HAUTEUR_MIN_SOUS_LE_CURSEUR = 96;
const POSITION_REPLI_Y = 72;

function limiter(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), Math.max(min, max));
}

export function BulleDialogueAgent() {
  const contexte = useContext(ContexteCanalEnDirect);
  const curseur = useContext(ContexteCurseurVirtuel);
  const texte = contexte?.actif ? (contexte.dernierTexte ?? null) : null;
  const curseurVisible = curseur?.visible ?? false;

  const curseurX = curseur?.x;
  const curseurY = curseur?.y;
  const positionX = useMotionValue(0);
  const positionY = useMotionValue(0);
  const positionConnue = useRef(false);

  const gauche = useTransform(positionX, (v) =>
    typeof window === "undefined" ? v : limiter(v + DECALAGE_X, MARGE_BORD, window.innerWidth - LARGEUR_MAX - MARGE_BORD)
  );
  const haut = useTransform(positionY, (v) =>
    typeof window === "undefined" ? v : limiter(v + DECALAGE_Y, MARGE_BORD, window.innerHeight - HAUTEUR_MIN_SOUS_LE_CURSEUR)
  );
  // Correctif (demande Bourama) : la bulle grandissait sans limite avec
  // un texte long, pouvant déborder en bas de l'écran selon la position
  // du curseur. Hauteur maximale calculée depuis la position verticale
  // RÉELLE de la bulle (dérivée de `haut`, jamais une valeur fixe) --
  // garantit qu'elle ne dépasse jamais le bas de l'écran, où qu'elle
  // s'affiche. Au-delà, le contenu défile au lieu de déborder.
  const hauteurMax = useTransform(haut, (v) =>
    typeof window === "undefined" ? 320 : Math.min(320, Math.max(120, window.innerHeight - v - MARGE_BORD))
  );

  useEffect(() => {
    if (!texte) return;

    const poser = (x: number, y: number) => {
      positionX.set(x);
      positionY.set(y);
      positionConnue.current = true;
    };

    if (curseurVisible && curseurX && curseurY) {
      poser(curseurX.get(), curseurY.get());
      const arretX = curseurX.on("change", (v) => positionX.set(v));
      const arretY = curseurY.on("change", (v) => positionY.set(v));
      return () => {
        arretX();
        arretY();
      };
    }

    if (!positionConnue.current) poser(window.innerWidth / 2 - DECALAGE_X - LARGEUR_MAX / 2, POSITION_REPLI_Y);
    const surDeplacement = (e: MouseEvent) => poser(e.clientX, e.clientY);
    window.addEventListener("mousemove", surDeplacement);
    return () => window.removeEventListener("mousemove", surDeplacement);
  }, [texte, curseurVisible, curseurX, curseurY, positionX, positionY]);

  if (!contexte) return null;

  return (
    <AnimatePresence>
      {texte && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.18 }}
          style={{
            position: "fixed",
            top: haut,
            left: gauche,
            zIndex: 70,
            pointerEvents: "none",
            maxWidth: `min(${LARGEUR_MAX}px, calc(100vw - ${MARGE_BORD * 2}px))`,
          }}
          className="rounded-cgpt-bouton bg-dj-surface border border-dj-bordure px-3 py-2 text-sm text-dj-texte shadow-xl"
        >
          {/* Rendu identique à celui d'une réponse du chat (demande Bourama,
              19/09/2026) : titres, listes, tableaux, code, formules,
              schémas, liens avec aperçu, voir
              components/chat/RenduMarkdownAutonome.tsx. Défilement interne
              (demande Bourama) : au-delà de hauteurMax, le contenu défile
              au lieu de déborder, horizontalement aussi pour les blocs
              larges (tableaux, code). Ce conteneur repasse en
              pointerEvents "auto" (le parent reste "none" pour ne jamais
              bloquer un clic sous la bulle) pour que la molette, le
              tactile et tous les éléments cliquables du contenu (liens,
              boutons de copie, schémas) fonctionnent vraiment. */}
          <motion.div
            style={{ pointerEvents: "auto", maxHeight: hauteurMax }}
            className="overflow-y-auto overflow-x-auto break-words"
          >
            <RenduMarkdownAutonome texte={texte} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
