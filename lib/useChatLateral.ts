"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as PointeurReact,
  type RefObject,
} from "react";
import {
  ATTRIBUT_CHAT_TIRE,
  DUREE_OUVERTURE_CHAT_MS,
  ecrireLargeurChatLocale,
  LARGEUR_CHAT_LATERAL_DEFAUT,
  LARGEUR_CHAT_LATERAL_MIN,
  LARGEUR_PAGE_MIN,
  lireLargeurChatLocale,
  VARIABLE_LARGEUR_CHAT,
} from "@/lib/chatLateral";

// Logique du chat collé à droite des pages (28/11/2026) : largeur réglable en
// tirant la barre, ouverture et fermeture animées, décalage des éléments fixés
// à droite de l'écran. Le dessin (colonne et barre) est dans
// components/chat/CadreChatLateral.tsx, branché par ChatFlottant.tsx.
//
// Le hook est appelé en permanence (les hooks ne peuvent pas être conditionnels)
// mais ne fait rien tant que `docke` est faux.

const PAS_CLAVIER = 24;

export type EtatChatLateral = {
  racineRef: RefObject<HTMLDivElement>;
  /** Largeur choisie, en pixels (celle de la colonne une fois déployée). */
  largeur: number;
  /** Faux juste avant l'ouverture et pendant la fermeture : la colonne est à 0. */
  deploye: boolean;
  /** Vrai pendant que la barre est tirée : plus aucune transition. */
  glisse: boolean;
  demarrerTirage: (e: PointeurReact) => void;
  surTouche: (e: KeyboardEvent) => void;
  reinitialiser: () => void;
};

export function useChatLateral({
  docke,
  enFermeture,
  largeurCompte,
  surLargeurFinale,
}: {
  /** Vrai quand le chat est collé à droite (ouvert, grand écran, page concernée). */
  docke: boolean;
  enFermeture: boolean;
  /** Largeur enregistrée sur le compte (null tant qu'elle n'est pas connue). */
  largeurCompte: number | null;
  /** Appelé au relâchement de la barre : le parent enregistre sur le compte. */
  surLargeurFinale: (largeur: number) => void;
}): EtatChatLateral {
  const [largeur, setLargeur] = useState<number>(() =>
    typeof window === "undefined" ? LARGEUR_CHAT_LATERAL_DEFAUT : lireLargeurChatLocale() ?? LARGEUR_CHAT_LATERAL_DEFAUT
  );
  const [deploye, setDeploye] = useState(false);
  const [glisse, setGlisse] = useState(false);
  const racineRef = useRef<HTMLDivElement>(null);
  const largeurRef = useRef(largeur);
  largeurRef.current = largeur;
  const surLargeurFinaleRef = useRef(surLargeurFinale);
  surLargeurFinaleRef.current = surLargeurFinale;

  // La largeur du compte remplace celle gardée sur l'appareil dès qu'elle arrive.
  useEffect(() => {
    if (largeurCompte == null) return;
    const valeur = Math.max(LARGEUR_CHAT_LATERAL_MIN, Math.round(largeurCompte));
    largeurRef.current = valeur;
    setLargeur(valeur);
    ecrireLargeurChatLocale(valeur);
  }, [largeurCompte]);

  // Ouverture : la largeur part de 0 puis glisse (déploiement une image plus
  // tard, sans apparition brute). Fermeture : elle revient à 0.
  useEffect(() => {
    if (!docke || enFermeture) {
      setDeploye(false);
      return;
    }
    let second = 0;
    const premier = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setDeploye(true));
    });
    return () => {
      cancelAnimationFrame(premier);
      cancelAnimationFrame(second);
    };
  }, [docke, enFermeture]);

  // Largeur maximale : tout l'espace de la page et du chat, sauf le minimum de la page.
  function largeurMaximale(): number | null {
    const racine = racineRef.current;
    const page = racine?.previousElementSibling as HTMLElement | null;
    if (!racine || !page) return null;
    return Math.max(LARGEUR_CHAT_LATERAL_MIN, page.offsetWidth + racine.offsetWidth - LARGEUR_PAGE_MIN);
  }

  // La page ne doit jamais passer sous sa largeur minimale : à l'ouverture (une
  // largeur gardée sur un grand écran peut être trop large ici) et quand la
  // fenêtre rétrécit. La largeur recule du dépassement, sans être enregistrée.
  useEffect(() => {
    if (!docke) return;
    function borner() {
      const maximum = largeurMaximale();
      if (maximum !== null && largeurRef.current > maximum) {
        largeurRef.current = maximum;
        setLargeur(maximum);
      }
    }
    window.addEventListener("resize", borner);
    const minuteur = window.setTimeout(borner, DUREE_OUVERTURE_CHAT_MS + 40);
    return () => {
      window.removeEventListener("resize", borner);
      window.clearTimeout(minuteur);
    };
  }, [docke]);

  // Les éléments fixés à droite de l'écran se décalent de la largeur du chat.
  useEffect(() => {
    document.documentElement.style.setProperty(VARIABLE_LARGEUR_CHAT, docke && deploye ? `${largeur}px` : "0px");
  }, [docke, deploye, largeur]);

  useEffect(() => {
    if (glisse) document.documentElement.setAttribute(ATTRIBUT_CHAT_TIRE, "true");
    else document.documentElement.removeAttribute(ATTRIBUT_CHAT_TIRE);
  }, [glisse]);

  // Au démontage (on quitte l'app, ou la page du chat prend le relais) : plus aucun décalage.
  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty(VARIABLE_LARGEUR_CHAT);
      document.documentElement.removeAttribute(ATTRIBUT_CHAT_TIRE);
    };
  }, []);

  function demarrerTirage(e: PointeurReact) {
    const maximum = largeurMaximale();
    if (maximum === null) return;
    e.preventDefault();
    const departX = e.clientX;
    const departLargeur = largeurRef.current;
    setGlisse(true);
    function bouger(ev: PointerEvent) {
      const prochaine = Math.min(maximum as number, Math.max(LARGEUR_CHAT_LATERAL_MIN, departLargeur + (departX - ev.clientX)));
      // Lue à la fin du glissement : la ref est à jour même si le rendu n'a pas encore eu lieu.
      largeurRef.current = prochaine;
      setLargeur(prochaine);
    }
    function finir() {
      window.removeEventListener("pointermove", bouger);
      window.removeEventListener("pointerup", finir);
      window.removeEventListener("pointercancel", finir);
      setGlisse(false);
      ecrireLargeurChatLocale(largeurRef.current);
      surLargeurFinaleRef.current(Math.round(largeurRef.current));
    }
    window.addEventListener("pointermove", bouger);
    window.addEventListener("pointerup", finir);
    window.addEventListener("pointercancel", finir);
  }

  function surTouche(e: KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const sens = e.key === "ArrowLeft" ? 1 : -1;
    const maximum = largeurMaximale() ?? LARGEUR_CHAT_LATERAL_DEFAUT;
    const prochaine = Math.min(maximum, Math.max(LARGEUR_CHAT_LATERAL_MIN, largeurRef.current + sens * PAS_CLAVIER));
    largeurRef.current = prochaine;
    setLargeur(prochaine);
    ecrireLargeurChatLocale(prochaine);
    surLargeurFinaleRef.current(Math.round(prochaine));
  }

  function reinitialiser() {
    largeurRef.current = LARGEUR_CHAT_LATERAL_DEFAUT;
    setLargeur(LARGEUR_CHAT_LATERAL_DEFAUT);
    ecrireLargeurChatLocale(LARGEUR_CHAT_LATERAL_DEFAUT);
    surLargeurFinaleRef.current(LARGEUR_CHAT_LATERAL_DEFAUT);
  }

  return { racineRef, largeur, deploye, glisse, demarrerTirage, surTouche, reinitialiser };
}
