"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as PointeurReact,
  type RefObject,
} from "react";
import {
  ATTRIBUT_CHAT_TIRE,
  consommerArriveeDepuisChat,
  DUREE_FERMETURE_CHAT_MS,
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

// Même courbe que le glissement de la colonne et du lecteur : toutes les
// animations de largeur du chat collé se ressemblent.
const COURBE_LARGEUR = "cubic-bezier(.25,.8,.35,1)";

// useLayoutEffect avertit côté serveur (Next rend le composant une première
// fois sur le serveur) : là-bas on retombe sur useEffect, qui n'y tourne jamais.
const useEffetAvantAffichage = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type EtatChatLateral = {
  racineRef: RefObject<HTMLDivElement>;
  /** Largeur choisie, en pixels (celle de la colonne une fois déployée). */
  largeur: number;
  /** Largeur réellement donnée à la colonne à cet instant (0 fermée, toute la fenêtre pendant l'étirement). */
  largeurColonne: number;
  /**
   * Largeur du panneau du chat à l'intérieur de la colonne. Fixe pendant
   * l'ouverture et la fermeture (le contenu ne se recalcule pas), elle suit la
   * colonne pendant l'étirement plein écran et l'arrivée depuis le chat plein
   * écran, sinon le chat resterait étroit au milieu d'une colonne vide.
   */
  largeurPanneau: number;
  /** Valeur CSS de `transition` pour la colonne et le panneau (aucune quand rien ne doit glisser). */
  transitionLargeur: string;
  /** Vrai pendant que le chat s'étire vers la gauche pour passer en plein écran. */
  etire: boolean;
  /** Étire le chat vers la gauche sur toute la fenêtre, puis appelle `apres` (la navigation). */
  etirerVersGauche: (apres: () => void) => void;
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
  // Étirement plein écran (bouton du chat) et arrivée depuis le chat plein
  // écran : dans les deux cas la colonne vaut toute la largeur de la fenêtre
  // (page comprise, mesurée à ce moment-là), au lieu de la largeur choisie.
  const [etire, setEtire] = useState(false);
  const [depart, setDepart] = useState(false);
  const [largeurPleine, setLargeurPleine] = useState(0);
  const minuteurEtirementRef = useRef<number | null>(null);
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

  // Arrivée depuis le chat plein écran (clic sur une section) : le chat
  // apparaît déjà sur toute la largeur, puis rétrécit vers la droite pendant
  // que la page s'ouvre à gauche. Mesuré avant le premier affichage pour ne
  // jamais montrer l'image intermédiaire où la page occupe tout l'écran.
  useEffetAvantAffichage(() => {
    if (!docke || !consommerArriveeDepuisChat()) return;
    const pleine = largeurTotale();
    if (pleine === null) return;
    setLargeurPleine(pleine);
    setDepart(true);
  }, [docke]);

  // Une fois déployé, l'arrivée est finie : sans ce retour à faux, la
  // fermeture reviendrait à toute la largeur au lieu de glisser jusqu'à 0.
  useEffect(() => {
    if (deploye && depart) setDepart(false);
  }, [deploye, depart]);

  // Quand le chat n'est plus collé (page du chat plein écran atteinte, chat
  // fermé, fenêtre rétrécie) : plus d'étirement, et la navigation en attente
  // d'un étirement abandonné ne doit pas partir toute seule.
  useEffect(() => {
    if (docke) return;
    setEtire(false);
    setDepart(false);
    if (minuteurEtirementRef.current !== null) {
      window.clearTimeout(minuteurEtirementRef.current);
      minuteurEtirementRef.current = null;
    }
  }, [docke]);

  // Largeur totale (page + chat) : celle que prend le chat en plein écran.
  function largeurTotale(): number | null {
    const racine = racineRef.current;
    const page = racine?.previousElementSibling as HTMLElement | null;
    if (!racine || !page) return null;
    return page.offsetWidth + racine.offsetWidth;
  }

  // Bouton plein écran du chat collé : il s'étire vers la gauche (la page est
  // poussée hors de la fenêtre) puis on navigue vers le chat plein écran.
  function etirerVersGauche(apres: () => void) {
    if (etire) return;
    const pleine = largeurTotale();
    if (pleine === null) {
      apres();
      return;
    }
    setLargeurPleine(pleine);
    setEtire(true);
    minuteurEtirementRef.current = window.setTimeout(() => {
      minuteurEtirementRef.current = null;
      apres();
    }, DUREE_OUVERTURE_CHAT_MS + 30);
  }

  // Largeur maximale : tout l'espace de la page et du chat, sauf le minimum de la page.
  function largeurMaximale(): number | null {
    const total = largeurTotale();
    return total === null ? null : Math.max(LARGEUR_CHAT_LATERAL_MIN, total - LARGEUR_PAGE_MIN);
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
    if (maximum === null || etire) return;
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

  const colonnePleine = etire || (depart && !deploye);
  const largeurColonne = colonnePleine ? largeurPleine : deploye ? largeur : 0;
  const largeurPanneau = etire || depart ? largeurColonne : largeur;
  // Rien ne glisse pendant le tirage de la barre (la largeur suit le doigt) ni
  // à l'image d'arrivée (le chat doit déjà être à toute la largeur). Ensuite
  // l'ouverture et l'étirement sont un peu plus lents que la fermeture.
  const transitionLargeur =
    glisse || (depart && !deploye)
      ? "none"
      : `width ${deploye || etire ? DUREE_OUVERTURE_CHAT_MS : DUREE_FERMETURE_CHAT_MS}ms ${COURBE_LARGEUR}`;

  return {
    racineRef,
    largeur,
    largeurColonne,
    largeurPanneau,
    transitionLargeur,
    etire,
    etirerVersGauche,
    deploye,
    glisse,
    demarrerTirage,
    surTouche,
    reinitialiser,
  };
}
