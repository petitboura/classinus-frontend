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
import { useContext } from "react";
import { OndeVoix } from "@/components/voix/OndeVoix";
import { ContexteCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteVoixDirecte } from "@/lib/contexteVoixDirecte";
import { useFermetureAuRetour } from "@/lib/contexteRetour";
import { COUCHE_AGENT_BULLE, COUCHE_VOIX_PLEIN_ECRAN } from "@/lib/couchesAgent";

const TAILLE_BULLE = 56;
const MARGE_BORD = 8;
const ECART_CURSEUR = 60;
const POSITION_REPLI_Y = 72;

// Même zone basse que les boutons du canal en direct : barre d'onglets web et
// barre de navigation native, toutes deux à 0 quand elles n'existent pas.
const BAS_SECURISE = "calc(env(safe-area-inset-bottom,0px)+var(--dj-barre-onglets-web,0px)+var(--cap-native-navigation-bottom,0px))";

function limiter(valeur: number, min: number, max: number): number {
  return Math.min(Math.max(valeur, min), Math.max(min, max));
}

type Props = {
  // Sur le client Electron, la bulle du canal vit dans la fenêtre de
  // superposition système (autre chantier) : on ne l'affiche pas ici.
  sansBulleCanal?: boolean;
};

export function VoixDirecteSuperposition({ sansBulleCanal = false }: Props) {
  const voix = useContext(ContexteVoixDirecte);
  const canal = useContext(ContexteCanalEnDirect);
  const curseur = useContext(ContexteCurseurVirtuel);

  const actif = voix?.actif ?? false;
  const modeCanal = canal?.actif ?? false;
  const reduit = voix?.reduit ?? false;
  const pleinEcran = actif && !modeCanal && !reduit;
  const bulleChat = actif && !modeCanal && reduit;
  const bulleCanal = actif && modeCanal && !sansBulleCanal;

  // Le retour du téléphone réduit l'onde au lieu de quitter l'appli.
  useFermetureAuRetour(pleinEcran, () => voix?.reduire());

  // Position de la bulle du canal : à côté du curseur de Classinus, avec un
  // ressort pour que le suivi reste fluide.
  const zero = useMotionValue(0);
  const curseurX = curseur?.x ?? zero;
  const curseurY = curseur?.y ?? zero;
  const cibleX = useTransform(curseurX, (v) =>
    typeof window === "undefined" ? 0 : limiter(v - ECART_CURSEUR, MARGE_BORD, window.innerWidth - TAILLE_BULLE - MARGE_BORD)
  );
  const cibleY = useTransform(curseurY, (v) =>
    typeof window === "undefined" ? 0 : limiter(v - ECART_CURSEUR, MARGE_BORD, window.innerHeight - TAILLE_BULLE - MARGE_BORD)
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
