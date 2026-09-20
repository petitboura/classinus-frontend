"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier J. Rendu visuel de la
// bulle de dialogue de Clovis (état dans lib/contexteCanalEnDirect.tsx,
// même séparation état/rendu que CurseurVirtuelAgent.tsx pour
// ContexteCurseurVirtuel).
//
// La bulle affiche DEUX choses distinctes (décision Bourama, 19/09/2026) :
// - l'INFORMATION (ce que Clovis fait, ses petits commentaires) :
//   toujours du texte simple, effacée seule après un court délai ;
// - la RÉPONSE de Clovis à un message de l'étudiant : rendue exactement
//   comme dans le chat (titres, tableaux, code, formules, schémas, QCM,
//   questions auxquelles on peut répondre, sources, images...), voir
//   components/chat/RenduMarkdownAutonome.tsx. Elle se ferme seule après
//   un délai (jamais tant que le pointeur est dessus) et se rouvre d'un
//   clic sur le curseur de Clovis (CurseurVirtuelAgent.tsx).
// Une seule bulle à la fois, la réponse a priorité sur l'information.
//
// Elle n'apparaît QUE canal en direct activé. Elle suit le curseur de
// l'appli : le curseur virtuel de Clovis quand il est affiché (donc aussi
// sur téléphone, où il n'y a pas de souris), sinon la vraie souris. Si
// aucune position n'est encore connue, elle s'affiche en haut au centre.
//
// Taille (correctif 19/09/2026, "le défilement se déclenche très mal") :
// avant, la hauteur maximale était dérivée de la position du curseur, donc
// une bulle proche du bas de l'écran défilait dès deux lignes. Maintenant
// la hauteur maximale ne dépend que de l'écran (70 % de sa hauteur, 560 px
// au plus) : le défilement n'apparaît que si le contenu dépasse vraiment
// cette limite. C'est la POSITION qui s'adapte à la taille réelle mesurée
// de la bulle : elle passe au dessus du curseur ou remonte plutôt que de
// se réduire.
//
// Taille voulue (demande Bourama, 19/09/2026) : la RÉPONSE se redimensionne
// avec la poignée en bas à droite. La taille choisie n'est JAMAIS gardée
// (décision explicite de Bourama) : elle ne vaut que tant que cette
// réponse reste affichée, et disparaît dès que la bulle se ferme ou
// qu'une autre réponse arrive. Rien n'est écrit dans le stockage du
// navigateur. Double clic sur la poignée : retour immédiat à la taille
// automatique. L'information reste toujours en taille automatique.
//
// Le curseur de Clovis est affiché AU DESSUS de la bulle (voir
// CurseurVirtuelAgent.tsx) : avant, la bulle pouvait le recouvrir et
// empêcher de cliquer dessus pour la fermer.
//
// L'écoute mousemove n'est active que pendant qu'un contenu est affiché,
// pour ne rien faire tourner inutilement le reste du temps.

import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useContext, useEffect, useRef, useState, type PointerEvent as EvenementPointeur } from "react";
import { envoyerMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";

// Chargé à la demande : le rendu complet (code, formules, schémas) est
// lourd et la bulle vit dans AppShell, donc sur toutes les pages. Ce code
// n'est téléchargé qu'à la toute première apparition d'une réponse.
const RenduMarkdownAutonome = dynamic(
  () => import("@/components/chat/RenduMarkdownAutonome").then((m) => m.RenduMarkdownAutonome),
  { ssr: false }
);

const DECALAGE_X = 18;
const DECALAGE_Y = 18;
const MARGE_BORD = 8;
const POSITION_REPLI_Y = 72;
const LARGEUR_MAX_INFO = 320;
const LARGEUR_MAX_REPONSE = 440;

const LARGEUR_MIN_REPONSE = 240;
const HAUTEUR_MIN_REPONSE = 120;
// Padding vertical + bordures de la bulle (py-2.5 x 2 + 2 px de bordure) :
// la hauteur choisie est celle de la zone de contenu, sans eux.
const PADDING_VERTICAL_BULLE = 22;

type TailleBulle = { largeur: number; hauteur: number };

function limiter(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), Math.max(min, max));
}

export function BulleDialogueAgent() {
  const contexte = useContext(ContexteCanalEnDirect);
  const curseur = useContext(ContexteCurseurVirtuel);
  const actif = contexte?.actif ?? false;
  const reponse = actif && contexte?.reponseVisible ? contexte.derniereReponse : null;
  const info = actif && !reponse ? (contexte?.dernierTexte ?? null) : null;
  const contenuPresent = !!(reponse || info);
  const largeurMax = reponse ? LARGEUR_MAX_REPONSE : LARGEUR_MAX_INFO;
  const curseurVisible = curseur?.visible ?? false;
  const curseurX = curseur?.x;
  const curseurY = curseur?.y;

  // Une question de la réponse affichée a-t-elle déjà reçu sa réponse ?
  // Suivi par id de réponse : une nouvelle réponse repart déverrouillée.
  const [idReponseRepondue, setIdReponseRepondue] = useState<number | null>(null);
  const questionDejaRepondue = !!reponse && idReponseRepondue === reponse.id;
  const idReponse = reponse?.id ?? null;
  const repondreQuestion = useCallback(
    (texteFinal: string) => {
      if (idReponse !== null) setIdReponseRepondue(idReponse);
      envoyerMessageEtudiant(texteFinal);
    },
    [idReponse]
  );

  // Position du curseur suivi (posX/posY) et position finale de la bulle
  // (gauche/haut), recalculée à partir de la taille RÉELLE mesurée.
  const posX = useMotionValue(0);
  const posY = useMotionValue(0);
  const gauche = useMotionValue(0);
  const haut = useMotionValue(0);
  const positionConnue = useRef(false);
  const dimensions = useRef({ largeur: LARGEUR_MAX_INFO, hauteur: 80 });

  // Taille choisie par l'étudiant pour la réponse affichée en ce moment
  // (null = automatique). Jamais sauvegardée : remise à null dès que la
  // bulle de réponse se ferme ou change (voir l'effet plus bas).
  const [taille, setTaille] = useState<TailleBulle | null>(null);
  const tailleRef = useRef<TailleBulle | null>(null);
  const redimensionnement = useRef<{ x: number; y: number; largeur: number; hauteur: number } | null>(null);
  const positionGelee = useRef(false);
  const elementBulle = useRef<HTMLDivElement | null>(null);
  const elementContenu = useRef<HTMLDivElement | null>(null);
  const reponseAffichee = reponse !== null;
  useEffect(() => {
    tailleRef.current = null;
    setTaille(null);
  }, [idReponse, reponseAffichee]);

  // Nettoyage unique : une version précédente écrivait la taille dans le
  // stockage du navigateur (19/09/2026, retiré sur demande de Bourama).
  useEffect(() => {
    try {
      window.localStorage.removeItem("canalEnDirect.tailleBulleReponse");
    } catch {
      // Stockage indisponible : rien à nettoyer.
    }
  }, []);

  const recalculer = useCallback(() => {
    if (typeof window === "undefined") return;
    // Pendant qu'on redimensionne, la bulle reste où elle est (sinon elle
    // sauterait au dessus/en dessous du curseur à chaque mouvement).
    if (positionGelee.current) return;
    const { largeur, hauteur } = dimensions.current;
    const x = posX.get();
    const y = posY.get();
    gauche.set(limiter(x + DECALAGE_X, MARGE_BORD, window.innerWidth - largeur - MARGE_BORD));
    let sommet = y + DECALAGE_Y;
    if (sommet + hauteur > window.innerHeight - MARGE_BORD) {
      const auDessus = y - DECALAGE_Y - hauteur;
      sommet = auDessus >= MARGE_BORD ? auDessus : window.innerHeight - hauteur - MARGE_BORD;
    }
    haut.set(Math.max(MARGE_BORD, sommet));
  }, [posX, posY, gauche, haut]);

  useEffect(() => {
    const arretX = posX.on("change", recalculer);
    const arretY = posY.on("change", recalculer);
    window.addEventListener("resize", recalculer);
    return () => {
      arretX();
      arretY();
      window.removeEventListener("resize", recalculer);
    };
  }, [posX, posY, recalculer]);

  // Mesure la bulle à chaque changement de taille (contenu qui charge,
  // schéma qui s'affiche...) et replace la bulle en conséquence.
  const observateur = useRef<ResizeObserver | null>(null);
  const refBulle = useCallback(
    (element: HTMLDivElement | null) => {
      observateur.current?.disconnect();
      observateur.current = null;
      elementBulle.current = element;
      if (!element) return;
      const mesurer = () => {
        dimensions.current = { largeur: element.offsetWidth, hauteur: element.offsetHeight };
        recalculer();
      };
      mesurer();
      observateur.current = new ResizeObserver(mesurer);
      observateur.current.observe(element);
    },
    [recalculer]
  );

  useEffect(() => {
    if (!contenuPresent) return;

    const poser = (x: number, y: number) => {
      posX.set(x);
      posY.set(y);
      positionConnue.current = true;
    };

    if (curseurVisible && curseurX && curseurY) {
      poser(curseurX.get(), curseurY.get());
      const arretX = curseurX.on("change", (v) => posX.set(v));
      const arretY = curseurY.on("change", (v) => posY.set(v));
      return () => {
        arretX();
        arretY();
      };
    }

    if (!positionConnue.current) {
      poser(window.innerWidth / 2 - DECALAGE_X - dimensions.current.largeur / 2, POSITION_REPLI_Y);
    }
    const surDeplacement = (e: MouseEvent) => poser(e.clientX, e.clientY);
    window.addEventListener("mousemove", surDeplacement);
    return () => window.removeEventListener("mousemove", surDeplacement);
  }, [contenuPresent, curseurVisible, curseurX, curseurY, posX, posY]);

  const debuterRedimensionnement = (e: EvenementPointeur<HTMLDivElement>) => {
    const bulle = elementBulle.current;
    const contenu = elementContenu.current;
    if (!bulle || !contenu) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    redimensionnement.current = { x: e.clientX, y: e.clientY, largeur: bulle.offsetWidth, hauteur: contenu.clientHeight };
    positionGelee.current = true;
    contexte?.suspendreMasquageReponse();
  };

  const redimensionner = (e: EvenementPointeur<HTMLDivElement>) => {
    const depart = redimensionnement.current;
    if (!depart) return;
    const largeurMax = window.innerWidth - gauche.get() - MARGE_BORD;
    const hauteurMax = window.innerHeight - haut.get() - MARGE_BORD - PADDING_VERTICAL_BULLE;
    const nouvelle: TailleBulle = {
      largeur: limiter(depart.largeur + (e.clientX - depart.x), LARGEUR_MIN_REPONSE, largeurMax),
      hauteur: limiter(depart.hauteur + (e.clientY - depart.y), HAUTEUR_MIN_REPONSE, hauteurMax),
    };
    tailleRef.current = nouvelle;
    setTaille(nouvelle);
  };

  const terminerRedimensionnement = (e: EvenementPointeur<HTMLDivElement>) => {
    if (!redimensionnement.current) return;
    redimensionnement.current = null;
    positionGelee.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    recalculer();
    contexte?.reprendreMasquageReponse();
  };

  const retablirTailleAutomatique = () => {
    tailleRef.current = null;
    setTaille(null);
  };

  if (!contexte) return null;

  const tailleAppliquee =
    reponse && taille && typeof window !== "undefined"
      ? {
          largeur: Math.min(taille.largeur, window.innerWidth - MARGE_BORD * 2),
          hauteur: Math.min(taille.hauteur, window.innerHeight - MARGE_BORD * 2 - PADDING_VERTICAL_BULLE),
        }
      : null;

  return (
    <AnimatePresence>
      {contenuPresent && (
        <motion.div
          ref={refBulle}
          key="bulle"
          data-agent-superposition="true"
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
            // Au dessus des popups de l'application (z-index jusqu'à 999),
            // juste sous le curseur de Clovis (10000).
            zIndex: 9990,
            pointerEvents: "none",
            maxWidth: tailleAppliquee
              ? `calc(100vw - ${MARGE_BORD * 2}px)`
              : `min(${largeurMax}px, calc(100vw - ${MARGE_BORD * 2}px))`,
            width: tailleAppliquee ? tailleAppliquee.largeur : undefined,
          }}
          className={`rounded-cgpt-bouton bg-dj-surface border border-dj-bordure shadow-xl text-dj-texte ${
            reponse ? "px-3.5 py-2.5 text-[15px]" : "px-3 py-2 text-sm"
          }`}
        >
          {/* Le parent reste en pointerEvents "none" pour ne jamais
              bloquer un clic sous la bulle ; ce conteneur repasse en
              "auto" pour que la molette, le tactile et tout ce qui est
              cliquable dans le contenu (liens, questions, boutons de
              copie, schémas) fonctionnent. La hauteur maximale ne dépend
              que de l'écran : le défilement ne se déclenche que si le
              contenu dépasse vraiment. */}
          <div
            ref={elementContenu}
            style={{ pointerEvents: "auto", maxHeight: tailleAppliquee ? tailleAppliquee.hauteur : undefined }}
            onPointerEnter={reponse ? contexte.suspendreMasquageReponse : undefined}
            onPointerLeave={reponse ? contexte.reprendreMasquageReponse : undefined}
            className="max-h-[min(70dvh,560px)] overflow-y-auto overflow-x-hidden overscroll-contain break-words"
          >
            {reponse ? (
              <RenduMarkdownAutonome
                texte={reponse.texte}
                sources={reponse.sources}
                images={reponse.images}
                conversationId={contexte.conversationId ?? undefined}
                onRepondreQuestion={repondreQuestion}
                questionDejaRepondue={questionDejaRepondue}
              />
            ) : (
              <p className="whitespace-pre-wrap">{info}</p>
            )}
          </div>
          {reponse && (
            <div
              role="separator"
              aria-label="Redimensionner la bulle, double clic pour rétablir la taille automatique"
              title="Glisser pour redimensionner, double clic pour rétablir"
              onPointerDown={debuterRedimensionnement}
              onPointerMove={redimensionner}
              onPointerUp={terminerRedimensionnement}
              onPointerCancel={terminerRedimensionnement}
              onDoubleClick={retablirTailleAutomatique}
              style={{ pointerEvents: "auto", touchAction: "none" }}
              className="absolute bottom-0.5 right-0.5 flex h-4 w-4 cursor-nwse-resize items-end justify-end text-dj-texte-muet hover:text-dj-texte"
            >
              <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
                <path d="M11 3 3 11M11 7 7 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
