"use client";

// Créé le 02/10/2026, Bourama : affichage de la voix en direct. Monté une
// seule fois dans AppShell, il pose l'onde (components/voix/OndeVoix.tsx) par
// dessus tout, jamais comme un but final :
// - dans le chat : onde en plein écran, avec en haut à droite un bouton pour
//   la réduire en bulle sur le côté (le chat reste visible derrière) et un
//   bouton pour arrêter la voix. Rien d'autre au centre que l'onde. Toucher la bulle rouvre le plein écran. Le retour du
//   téléphone réduit l'onde au lieu de quitter l'appli ;
// - canal en direct activé : une petite bulle, la même onde en miniature, qui
//   suit le curseur de Classinus, jamais le pointeur de l'étudiant. Elle ne
//   capture aucun clic pour ne jamais gêner les actions de Classinus.
// Aucun texte n'indique l'état (décision de Bourama) : seule l'onde change.
// Les boutons n'ont que des icônes, avec un libellé pour les lecteurs d'écran.

import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Minimize2, X } from "lucide-react";
import { useContext, useEffect } from "react";
import { OndeVoix } from "@/components/voix/OndeVoix";
import { ContexteCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteVoixDirecte } from "@/lib/contexteVoixDirecte";
import { useFermetureAuRetour } from "@/lib/contexteRetour";
import { COUCHE_AGENT_BULLE, COUCHE_VOIX_PLEIN_ECRAN } from "@/lib/couchesAgent";

const TAILLE_BULLE = 56;
const MARGE_BORD = 8;
// Distance entre la pointe du curseur et le centre de la bulle de voix du canal. La
// bulle (rayon 28) reste ainsi juste derrière la flèche, sans la recouvrir de face.
const DISTANCE_DERRIERE_CURSEUR = 40;
// Déplacement minimal du curseur (en pixels) avant de considérer qu'il change de
// direction : évite que les micro mouvements fassent tourner la bulle pour rien.
const SEUIL_DIRECTION = 8;
// Direction avant le premier déplacement : la bulle est en haut à gauche, comme
// avant, ce qui correspond à un curseur qui descend vers la droite.
const ANGLE_DEPART = Math.PI / 4;
const POSITION_REPLI_Y = 72;

// Même zone basse que les boutons du canal en direct : barre d'onglets web et
// barre de navigation native, toutes deux à 0 quand elles n'existent pas.
// Les espaces autour des "+" sont obligatoires en CSS : sans eux le calcul
// entier est rejeté, la position basse de la bulle est ignorée et elle
// retombe en haut à droite, par dessus la cloche et l'horloge (03/10/2026).
const BAS_SECURISE = "(env(safe-area-inset-bottom, 0px) + var(--dj-barre-onglets-web, 0px) + var(--cap-native-navigation-bottom, 0px))";

function limiter(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), Math.max(min, max));
}

export function VoixDirecteSuperposition() {
  const voix = useContext(ContexteVoixDirecte);
  const canal = useContext(ContexteCanalEnDirect);
  const curseur = useContext(ContexteCurseurVirtuel);

  const actif = voix?.actif ?? false;
  const modeCanal = canal?.actif ?? false;
  const reduit = voix?.reduit ?? false;
  const pleinEcran = actif && !modeCanal && !reduit;
  const bulleChat = actif && !modeCanal && reduit;
  const bulleCanal = actif && modeCanal;

  // Le retour du téléphone réduit l'onde au lieu de quitter l'appli.
  useFermetureAuRetour(pleinEcran, () => voix?.reduire());

  // Position de la bulle du canal : à côté du curseur de Classinus, avec un
  // ressort pour que le suivi reste fluide.
  const zero = useMotionValue(0);
  const curseurX = curseur?.x ?? zero;
  const curseurY = curseur?.y ?? zero;
  // Correctif (03/10/2026, demande Bourama) : la bulle ne se place plus à un endroit
  // fixe au dessus du curseur, ce qui la mettait devant quand le curseur montait.
  // Elle suit le curseur : elle reste du côté d'où il vient et tourne autour de lui
  // quand il change de direction. Le curseur est toujours dessiné au dessus d'elle
  // (couche COUCHE_AGENT_CURSEUR, voir lib/couchesAgent.ts).
  const angleCible = useMotionValue(ANGLE_DEPART);
  useEffect(() => {
    if (!curseur) return;
    // Point de départ du dernier mouvement mesuré : mis à jour seulement quand le
    // curseur a parcouru SEUIL_DIRECTION, pour que de petits pas successifs finissent
    // par compter au lieu d'être ignorés un à un.
    let ancre: { x: number; y: number } | null = null;
    const mesurer = () => {
      const x = curseur.x.get();
      const y = curseur.y.get();
      if (!ancre) {
        ancre = { x, y };
        return;
      }
      const dx = x - ancre.x;
      const dy = y - ancre.y;
      if (Math.hypot(dx, dy) < SEUIL_DIRECTION) return;
      ancre = { x, y };
      // Dépliage de l'angle : la bulle prend toujours le chemin le plus court au lieu
      // de refaire presque un tour complet quand l'angle passe de 179° à -179°.
      const courant = angleCible.get();
      const delta = Math.atan2(dy, dx) - courant;
      angleCible.set(courant + ((((delta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI);
    };
    const arreterX = curseur.x.on("change", mesurer);
    const arreterY = curseur.y.on("change", mesurer);
    return () => {
      arreterX();
      arreterY();
    };
  }, [curseur, angleCible]);
  const angle = useSpring(angleCible, { stiffness: 90, damping: 16, mass: 0.8 });

  const cibleX = useTransform([curseurX, angle], ([x, a]: number[]) =>
    typeof window === "undefined"
      ? 0
      : limiter(x - Math.cos(a) * DISTANCE_DERRIERE_CURSEUR - TAILLE_BULLE / 2, MARGE_BORD, window.innerWidth - TAILLE_BULLE - MARGE_BORD)
  );
  const cibleY = useTransform([curseurY, angle], ([y, a]: number[]) =>
    typeof window === "undefined"
      ? 0
      : limiter(y - Math.sin(a) * DISTANCE_DERRIERE_CURSEUR - TAILLE_BULLE / 2, MARGE_BORD, window.innerHeight - TAILLE_BULLE - MARGE_BORD)
  );
  const suivreX = useSpring(cibleX, { stiffness: 320, damping: 32, mass: 0.6 });
  const suivreY = useSpring(cibleY, { stiffness: 320, damping: 32, mass: 0.6 });
  const curseurVisible = curseur?.visible ?? false;

  if (!voix) return null;

  return (
    <>
      <AnimatePresence>
        {pleinEcran && (
          <motion.div
            key="voix-plein-ecran"
            role="dialog"
            aria-label="Mode vocal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center backdrop-blur-xl"
            // Fond du thème à 95 % : les couleurs du thème sont des variables CSS,
            // la transparence Tailwind (bg-dj-fond/95) ne s'y applique pas.
            style={{ zIndex: COUCHE_VOIX_PLEIN_ECRAN, backgroundColor: "color-mix(in srgb, var(--dj-fond) 95%, transparent)" }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-56 w-full max-w-3xl px-4 sm:h-72"
            >
              <OndeVoix />
            </motion.div>

            {/* Les deux boutons sont groupés en haut à droite : le centre de l'écran
                reste réservé à l'onde, rien ne passe jamais dessus. */}
            <div className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] flex items-center gap-3">
              <button
                type="button"
                onClick={voix.reduire}
                aria-label="Réduire en bulle"
                title="Réduire en bulle"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
              >
                <Minimize2 size={20} />
              </button>
              <button
                type="button"
                onClick={voix.fermer}
                aria-label="Arrêter la voix"
                title="Arrêter la voix"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-dj-bordure bg-dj-surface text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulleChat && (
          <motion.button
            key="voix-bulle-chat"
            type="button"
            onClick={voix.agrandir}
            aria-label="Agrandir la voix"
            title="Agrandir la voix"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed right-3 flex items-center justify-center overflow-hidden rounded-full border border-dj-bordure bg-dj-surface shadow-lg"
            style={{ zIndex: COUCHE_VOIX_PLEIN_ECRAN, width: TAILLE_BULLE, height: TAILLE_BULLE, bottom: `calc(9rem + ${BAS_SECURISE})` }}
          >
            <OndeVoix mini />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulleCanal && (
          <motion.div
            key="voix-bulle-canal"
            aria-hidden="true"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed left-0 top-0 overflow-hidden rounded-full border border-dj-bordure bg-dj-surface shadow-lg"
            style={{
              zIndex: COUCHE_AGENT_BULLE,
              width: TAILLE_BULLE,
              height: TAILLE_BULLE,
              pointerEvents: "none",
              // Curseur de Classinus affiché : la bulle l'accompagne. Sinon, repli
              // en haut au centre, comme la bulle de dialogue.
              x: curseurVisible ? suivreX : "calc(50vw - 28px)",
              y: curseurVisible ? suivreY : POSITION_REPLI_Y,
            }}
          >
            <OndeVoix mini />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
