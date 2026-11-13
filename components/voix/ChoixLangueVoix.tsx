"use client";

// Question posée à l'allumage du mode vocal quand le bambara est branché : « bambara ou autre ? ».
// Autre langue : la voix Gemini Live habituelle, sans aucun changement. Bambara : l'utilisateur
// parle, Soloni transcrit, l'IA répond en bambara et la voix Gemini la lit (lib/voixBambara.ts).
// Montée une fois dans InteractionGlobale, au dessus de tout sauf des éléments de l'agent.

import { AnimatePresence, motion } from "framer-motion";
import { Languages, X } from "lucide-react";
import { useContext } from "react";
import { ContexteVoixDirecte } from "@/lib/contexteVoixDirecte";
import { useFermetureAuRetour } from "@/lib/contexteRetour";
import { COUCHE_VOIX_PLEIN_ECRAN } from "@/lib/couchesAgent";

export function ChoixLangueVoix() {
  const voix = useContext(ContexteVoixDirecte);
  const ouvert = Boolean(voix?.choixLangue);
  const annuler = voix?.annulerChoixLangue;

  // Le retour du téléphone ferme la question au lieu de quitter l'appli.
  useFermetureAuRetour(ouvert, () => annuler?.());

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          key="choix-langue-voix"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed inset-0 flex items-center justify-center px-4 backdrop-blur-sm"
          style={{
            zIndex: COUCHE_VOIX_PLEIN_ECRAN,
            backgroundColor: "color-mix(in srgb, var(--dj-fond) 70%, transparent)",
            paddingTop: "env(safe-area-inset-top, 0px)",
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
          onClick={annuler}
          onKeyDown={(e) => { if (e.key === "Escape") annuler?.(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titre-choix-langue-voix"
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border border-dj-bordure bg-dj-surface p-5 shadow-xl"
          >
            <button
              type="button"
              onClick={annuler}
              aria-label="Fermer"
              title="Fermer"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 pr-10 text-dj-texte">
              <Languages size={20} className="shrink-0" />
              <h2 id="titre-choix-langue-voix" className="text-base font-semibold">
                Dans quelle langue veux-tu parler ?
              </h2>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => voix?.choisirLangue?.("bambara")}
                className="rounded-xl border border-dj-bordure-forte px-4 py-3 text-left transition-colors hover:bg-dj-fond"
              >
                <span className="block text-sm font-medium text-dj-texte">Bambara</span>
                <span className="mt-0.5 block text-xs text-dj-texte-muet">Tu parles, Classinus te répond en bambara à voix haute.</span>
              </button>
              <button
                type="button"
                onClick={() => voix?.choisirLangue?.("autre")}
                className="rounded-xl border border-dj-bordure px-4 py-3 text-left transition-colors hover:bg-dj-fond"
              >
                <span className="block text-sm font-medium text-dj-texte">Autre langue</span>
                <span className="mt-0.5 block text-xs text-dj-texte-muet">Le mode vocal habituel.</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
