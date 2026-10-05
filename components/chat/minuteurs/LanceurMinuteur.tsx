"use client";

import { useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Timer } from "lucide-react";
import { BoutonInfoSection } from "@/components/BoutonInfoSection";
import { textesMinuteurs } from "@/lib/textesMinuteurs";
import {
  DUREES_RAPIDES_MINUTES,
  LONGUEUR_MAX_SUITE,
  UNITES_DUREE,
  dureeEnSecondes,
  formaterTemps,
  secondesRestantes,
  type Minuteur,
  type UniteDuree,
} from "@/lib/minuteurs";

// Bouton horloge (20/09/2026, demande Bourama) : lancer un minuteur soi même
// (durées rapides ou durée libre) et retrouver les minuteurs masqués. Le
// nombre de minuteurs masqués s'affiche en pastille sur le bouton.
//
// 03/10/2026, demande Bourama : le bouton est présent sur tous les écrans, à
// gauche de la cloche des notifications (position fixe), la durée n'a plus de
// plafond (secondes, minutes ou heures, décimales permises) et l'étudiant peut
// écrire, en facultatif, ce que Classinus doit faire à la fin. Sans suite
// écrite, Classinus décide selon la conversation, comme avant.
export function LanceurMinuteur({
  masques,
  maintenantMs,
  onLancer,
  onAfficher,
}: {
  masques: Minuteur[];
  maintenantMs: number;
  onLancer: (dureeSecondes: number, actionFin: string | null) => void;
  onAfficher: (id: string) => void;
}) {
  const t = textesMinuteurs();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [unite, setUnite] = useState<UniteDuree>("minutes");
  const [suite, setSuite] = useState("");

  const secondesSaisies = dureeEnSecondes(saisie, unite);

  function lancer(dureeSecondes: number) {
    onLancer(dureeSecondes, suite.trim() || null);
    setSaisie("");
    setSuite("");
    setOuvert(false);
  }

  function surEntree(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && secondesSaisies !== null) lancer(secondesSaisies);
  }

  return (
    // Position fixe à gauche de la cloche des notifications (BoutonNotifications.tsx :
    // 32px de large à 8px du bord droit) pour ne jamais la recouvrir, sur tous les écrans.
    <div className="fixed right-11 top-[calc(0.625rem+var(--safe-top,0px))] z-40">
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
              className="absolute right-0 top-9 z-20 w-72 max-w-[calc(100vw-3.5rem)] origin-top-right rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-3 shadow-lg"
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
                    onClick={() => lancer(minutes * 60)}
                    className="h-7 rounded-cgpt-bouton border border-dj-bordure px-2.5 text-xs text-dj-texte transition-colors hover:bg-dj-surface-haute"
                  >
                    {t.minutesCourt(minutes)}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  value={saisie}
                  onChange={(e) => setSaisie(e.target.value)}
                  onKeyDown={surEntree}
                  placeholder={t.autreDuree}
                  aria-label={t.autreDuree}
                  className="h-8 min-w-0 flex-1 rounded-cgpt-bouton border border-dj-bordure bg-dj-fond px-2 text-xs text-dj-texte placeholder:text-dj-texte-muet focus:border-dj-accent-1 focus:outline-none"
                />
                <select
                  value={unite}
                  onChange={(e) => setUnite(e.target.value as UniteDuree)}
                  aria-label={t.uniteAria}
                  className="h-8 rounded-cgpt-bouton border border-dj-bordure bg-dj-fond px-1.5 text-xs text-dj-texte focus:border-dj-accent-1 focus:outline-none"
                >
                  {UNITES_DUREE.map((u) => (
                    <option key={u} value={u}>
                      {t.unites[u]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={secondesSaisies === null}
                  onClick={() => secondesSaisies !== null && lancer(secondesSaisies)}
                  className="h-8 rounded-cgpt-bouton bg-dj-accent-1 px-3 text-xs font-medium text-[#1A0D02] transition-opacity disabled:opacity-40"
                >
                  {t.lancer}
                </button>
              </div>

              <label className="mt-3 block text-xs text-dj-texte-muet">
                {t.suiteLabel}
                <input
                  type="text"
                  value={suite}
                  maxLength={LONGUEUR_MAX_SUITE}
                  onChange={(e) => setSuite(e.target.value)}
                  onKeyDown={surEntree}
                  placeholder={t.suitePlaceholder}
                  className="mt-1 h-8 w-full rounded-cgpt-bouton border border-dj-bordure bg-dj-fond px-2 text-xs text-dj-texte placeholder:text-dj-texte-muet focus:border-dj-accent-1 focus:outline-none"
                />
              </label>

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
