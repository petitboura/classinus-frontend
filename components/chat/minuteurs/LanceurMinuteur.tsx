"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Timer } from "lucide-react";
import { BoutonInfoSection } from "@/components/BoutonInfoSection";
import { textesMinuteurs } from "@/lib/textesMinuteurs";
import {
  DUREES_RAPIDES_MINUTES,
  DUREE_MAX_PERSONNALISEE_MINUTES,
  DUREE_MIN_PERSONNALISEE_MINUTES,
  formaterTemps,
  secondesRestantes,
  type Minuteur,
} from "@/lib/minuteurs";

// Bouton horloge du chat (20/09/2026, demande Bourama) : lancer un minuteur
// soi même (durées rapides ou durée libre) et retrouver les minuteurs
// masqués. Toujours présent, discret, en haut à droite du chat. Le nombre
// de minuteurs masqués s'affiche en pastille sur le bouton.
export function LanceurMinuteur({
  masques,
  maintenantMs,
  onLancer,
  onAfficher,
}: {
  masques: Minuteur[];
  maintenantMs: number;
  onLancer: (dureeSecondes: number) => void;
  onAfficher: (id: string) => void;
}) {
  const t = textesMinuteurs();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");

  const minutesSaisies = Number(saisie);
  const saisieValide =
    saisie.trim() !== "" &&
    Number.isInteger(minutesSaisies) &&
    minutesSaisies >= DUREE_MIN_PERSONNALISEE_MINUTES &&
    minutesSaisies <= DUREE_MAX_PERSONNALISEE_MINUTES;

  function lancer(minutes: number) {
    onLancer(minutes * 60);
    setSaisie("");
    setOuvert(false);
  }

  return (
    <div className="absolute right-2 top-1 z-20">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={t.boutonMinuteurs}
        title={t.boutonMinuteurs}
        aria-expanded={ouvert}
        className="relative flex h-7 w-7 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
      >
        <Timer size={16} />
        {masques.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-dj-accent-1 px-0.5 text-[9px] font-semibold text-[#1A0D02]">
            {masques.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {ouvert && (
          <>
            {/* Zone invisible pour fermer au clic à l'extérieur, même
                motif que les autres popovers légers de l'app. */}
            <button type="button" aria-hidden tabIndex={-1} onClick={() => setOuvert(false)} className="fixed inset-0 z-10 cursor-default" />
            <motion.div
              key="panneau"
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-9 z-20 w-64 max-w-[calc(100vw-2rem)] origin-top-right rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-3 shadow-lg"
            >
              <div className="mb-2 flex items-center gap-1.5">
                <p className="text-sm font-medium text-dj-texte">{t.lancerTitre}</p>
                <BoutonInfoSection rubriqueId="minuteurs" texteCourt={t.infoCourt} />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {DUREES_RAPIDES_MINUTES.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => lancer(minutes)}
                    className="h-7 rounded-cgpt-bouton border border-dj-bordure px-2.5 text-xs text-dj-texte transition-colors hover:bg-dj-surface-haute"
                  >
                    {t.minutesCourt(minutes)}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  min={DUREE_MIN_PERSONNALISEE_MINUTES}
                  max={DUREE_MAX_PERSONNALISEE_MINUTES}
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && saisieValide) lancer(minutesSaisies);
                  }}
                  placeholder={t.autreDuree}
                  aria-label={t.autreDuree}
                  className="h-8 min-w-0 flex-1 rounded-cgpt-bouton border border-dj-bordure bg-dj-fond px-2 text-xs text-dj-texte placeholder:text-dj-texte-muet focus:border-dj-accent-1 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!saisieValide}
                  onClick={() => lancer(minutesSaisies)}
                  className="h-8 rounded-cgpt-bouton bg-dj-accent-1 px-3 text-xs font-medium text-[#1A0D02] transition-opacity disabled:opacity-40"
                >
                  {t.lancer}
                </button>
              </div>

              {masques.length > 0 && (
                <div className="mt-3 border-t border-dj-bordure pt-2">
                  <p className="mb-1 text-xs text-dj-texte-muet">{t.minuteursMasques}</p>
                  <ul className="space-y-1">
                    {masques.map((m) => (
                      <li key={m.id} className="flex items-center gap-2 text-xs text-dj-texte">
                        <span className="min-w-0 flex-1 truncate">{m.titre || t.titreParDefaut}</span>
                        <span className="tabular-nums text-dj-texte-muet">
                          {formaterTemps(m.statut === "en_cours" ? secondesRestantes(m, maintenantMs) : m.secondes_restantes)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onAfficher(m.id);
                            setOuvert(false);
                          }}
                          className="rounded-cgpt-bouton border border-dj-bordure px-2 py-0.5 transition-colors hover:bg-dj-surface-haute"
                        >
                          {t.afficher}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
