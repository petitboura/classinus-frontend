"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ContexteMinuteurs } from "@/lib/contexteMinuteurs";
import { useMaintenantMs } from "@/lib/useMaintenantMs";
import { CarteMinuteur } from "./CarteMinuteur";
import { LanceurMinuteur } from "./LanceurMinuteur";
import { PastilleMinuteur } from "./PastilleMinuteur";

type ModeAffichage = "carte" | "mini" | "masque";

// Mémoire locale du mode d'affichage choisi pour chaque minuteur : réduire
// ou masquer un minuteur doit tenir même si l'étudiant change de page.
// Simple confort d'affichage, propre à cet appareil, jamais envoyé au
// serveur. Toujours dans un try/catch : le stockage peut être indisponible.
const CLE_STOCKAGE = "clovis:minuteurs:affichage";

function lireModes(): Record<string, ModeAffichage> {
  try {
    const brut = window.localStorage.getItem(CLE_STOCKAGE);
    return brut ? (JSON.parse(brut) as Record<string, ModeAffichage>) : {};
  } catch {
    return {};
  }
}

function ecrireModes(modes: Record<string, ModeAffichage>) {
  try {
    window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(modes));
  } catch {
    // Stockage indisponible : le choix vaut pour la session seulement.
  }
}

// Zone des minuteurs en haut du chat (20/09/2026, demande Bourama) : cartes
// complètes, pastilles des minuteurs réduits, et le bouton horloge (lancer
// un minuteur, retrouver les masqués). Ne prend aucune place quand il n'y a
// aucun minuteur à montrer, et ne bloque jamais rien : l'étudiant continue
// à discuter pendant que le temps défile.
export function DockMinuteurs({ conversationId }: { conversationId: string }) {
  const ctx = useContext(ContexteMinuteurs);
  const [modes, setModes] = useState<Record<string, ModeAffichage>>({});

  // Lu après le montage (pas dans l'état initial) : le rendu serveur et le
  // premier rendu client doivent rester identiques.
  useEffect(() => {
    setModes(lireModes());
  }, []);

  const changerMode = useCallback((id: string, mode: ModeAffichage) => {
    setModes((prec) => {
      const suivant = { ...prec, [id]: mode };
      ecrireModes(suivant);
      return suivant;
    });
  }, []);

  const minuteurs = ctx?.minuteurs ?? [];
  const maintenantMs = useMaintenantMs(ctx?.decalageMs ?? 0, minuteurs.length > 0);

  if (!ctx) return null;

  const modeDe = (id: string): ModeAffichage => modes[id] ?? "carte";
  const cartes = minuteurs.filter((m) => modeDe(m.id) === "carte");
  const pastilles = minuteurs.filter((m) => modeDe(m.id) === "mini");
  const masques = minuteurs.filter((m) => modeDe(m.id) === "masque");

  return (
    <>
      <div className="flex-none space-y-2 px-4 pr-11 pt-2 empty:hidden">
        <AnimatePresence initial={false}>
          {ctx.erreur && (
            <motion.p
              key="erreur"
              role="alert"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="rounded-cgpt-bouton border border-dj-bordure bg-dj-surface px-3 py-2 text-xs text-[var(--dj-erreur)]"
            >
              {ctx.erreur}
            </motion.p>
          )}

          {pastilles.length > 0 && (
            <motion.div
              key="pastilles"
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="flex flex-wrap gap-1.5"
            >
              {pastilles.map((m) => (
                <PastilleMinuteur key={m.id} minuteur={m} maintenantMs={maintenantMs} onAgrandir={() => changerMode(m.id, "carte")} />
              ))}
            </motion.div>
          )}

          {cartes.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <CarteMinuteur
                minuteur={m}
                maintenantMs={maintenantMs}
                onArreter={() => void ctx.arreter(m.id)}
                onAjuster={(delta) => void ctx.ajuster(m.id, delta)}
                onReduire={() => changerMode(m.id, "mini")}
                onMasquer={() => changerMode(m.id, "masque")}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <LanceurMinuteur
        masques={masques}
        maintenantMs={maintenantMs}
        onLancer={(dureeSecondes) => void ctx.lancer(dureeSecondes, { conversationId })}
        onAfficher={(id) => changerMode(id, "carte")}
      />
    </>
  );
}
