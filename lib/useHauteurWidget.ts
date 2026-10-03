"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { TYPE_MESSAGE_HAUTEUR_WIDGET } from "@/lib/scriptHauteurWidget";

// Hauteur du cadre d'un widget interactif (voir components/chat/WidgetSandbox.tsx).
//
// Le cadre part de HAUTEUR_INITIALE_WIDGET_PX, qui est l'ancienne hauteur
// fixe (h-96), puis suit la hauteur que le widget annonce, entre un minimum et
// un maximum. Au delà du maximum, le widget défile à l'intérieur de son cadre.
//
// Trois protections, chacune pour un cas précis :
//
// 1. Widget qui dépend de la hauteur de la fenêtre (100vh) : chaque
//    agrandissement du cadre agrandit le contenu, donc le cadre grandirait
//    sans fin. Après NB_CROISSANCES_SUSPECTES_WIDGET agrandissements de suite,
//    espacés de moins de DELAI_CROISSANCE_SUSPECTE_MS, on revient à la hauteur
//    initiale et le cadre ne bouge plus (comportement d'avant).
// 2. Plein écran : le cadre remplit alors le panneau, sa hauteur n'est plus
//    celle du contenu, on ignore les messages.
// 3. Enregistrement vidéo (bouton Filmer) : la vidéo est recadrée sur le
//    cadre, une taille qui change en cours de route abîmerait le film. Pendant
//    ce temps on garde la dernière hauteur reçue en attente, et on l'applique
//    dès que le film est fini.

export const HAUTEUR_INITIALE_WIDGET_PX = 384;
export const HAUTEUR_MIN_WIDGET_PX = 120;
export const HAUTEUR_MAX_WIDGET_PX = 1200;
const NB_CROISSANCES_SUSPECTES_WIDGET = 5;
const DELAI_CROISSANCE_SUSPECTE_MS = 700;

interface SuiviCroissance {
  nombre: number;
  dernierInstant: number;
  fige: boolean;
}

function suiviVierge(): SuiviCroissance {
  return { nombre: 0, dernierInstant: 0, fige: false };
}

// `cleDocument` change à chaque nouveau document dans le cadre (nouveau code
// ou nouveau thème) : on repart alors de la hauteur initiale. `figee` vaut
// true tant que la hauteur ne doit pas bouger (enregistrement en cours).
export function useHauteurWidget(
  cadreRef: RefObject<HTMLIFrameElement>,
  cleDocument: string,
  figee: boolean,
): number {
  const [hauteur, setHauteur] = useState(HAUTEUR_INITIALE_WIDGET_PX);
  // Copies lisibles dans l'écouteur de messages sans le recréer.
  const hauteurRef = useRef(HAUTEUR_INITIALE_WIDGET_PX);
  const suiviRef = useRef<SuiviCroissance>(suiviVierge());
  const figeeRef = useRef(figee);
  const enAttenteRef = useRef<number | null>(null);
  const cadreVuRef = useRef<HTMLIFrameElement | null>(null);

  const appliquer = useCallback((brute: number) => {
    const suivi = suiviRef.current;
    if (suivi.fige) return;

    const cible = Math.min(Math.max(Math.ceil(brute), HAUTEUR_MIN_WIDGET_PX), HAUTEUR_MAX_WIDGET_PX);
    const actuelle = hauteurRef.current;
    if (cible === actuelle) return;

    if (cible > actuelle) {
      const maintenant = Date.now();
      suivi.nombre = maintenant - suivi.dernierInstant <= DELAI_CROISSANCE_SUSPECTE_MS ? suivi.nombre + 1 : 1;
      suivi.dernierInstant = maintenant;
      if (suivi.nombre >= NB_CROISSANCES_SUSPECTES_WIDGET) {
        suivi.fige = true;
        hauteurRef.current = HAUTEUR_INITIALE_WIDGET_PX;
        setHauteur(HAUTEUR_INITIALE_WIDGET_PX);
        return;
      }
    } else {
      suivi.nombre = 0;
    }
    hauteurRef.current = cible;
    setHauteur(cible);
  }, []);

  // Nouveau document : suivi vierge, hauteur initiale, rien en attente.
  useEffect(() => {
    suiviRef.current = suiviVierge();
    enAttenteRef.current = null;
    hauteurRef.current = HAUTEUR_INITIALE_WIDGET_PX;
    setHauteur(HAUTEUR_INITIALE_WIDGET_PX);
  }, [cleDocument]);

  // Fin d'un enregistrement : on applique la dernière hauteur reçue.
  useEffect(() => {
    figeeRef.current = figee;
    if (!figee && enAttenteRef.current !== null) {
      const brute = enAttenteRef.current;
      enAttenteRef.current = null;
      appliquer(brute);
    }
  }, [figee, appliquer]);

  useEffect(() => {
    function surMessage(e: MessageEvent) {
      const cadre = cadreRef.current;
      // Seul le cadre de ce widget est écouté : la fenêtre du widget est
      // isolée (sandbox sans allow-same-origin), son origine est donc opaque
      // et seule la fenêtre source permet de l'identifier.
      if (!cadre || e.source !== cadre.contentWindow) return;
      const donnees = e.data as { type?: unknown; hauteur?: unknown } | null;
      if (!donnees || donnees.type !== TYPE_MESSAGE_HAUTEUR_WIDGET) return;
      if (typeof donnees.hauteur !== "number" || !Number.isFinite(donnees.hauteur)) return;
      if (cadre.closest('[role="dialog"]')) return;

      // Nouvel iframe (retour du plein écran, par exemple) : le suivi des
      // agrandissements repart de zéro pour ce nouveau document.
      if (cadreVuRef.current !== cadre) {
        cadreVuRef.current = cadre;
        suiviRef.current = suiviVierge();
        enAttenteRef.current = null;
      }

      if (figeeRef.current) {
        enAttenteRef.current = donnees.hauteur;
        return;
      }
      appliquer(donnees.hauteur);
    }
    window.addEventListener("message", surMessage);
    return () => window.removeEventListener("message", surMessage);
  }, [cadreRef, appliquer]);

  return hauteur;
}
