"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, EyeOff, Minimize2, Minus, Plus } from "lucide-react";
import { textesMinuteurs } from "@/lib/textesMinuteurs";
import { secondesRestantes, type Minuteur } from "@/lib/minuteurs";
import { AnneauMinuteur } from "./AnneauMinuteur";

const PAS_AJUSTEMENT_SECONDES = 300;

const classeBouton =
  "inline-flex h-7 items-center gap-1 rounded-cgpt-bouton border border-dj-bordure px-2 text-xs text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-40";
const classeIcone =
  "flex h-7 w-7 items-center justify-center rounded-full text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte";

// Carte complète d'un minuteur (20/09/2026, demande Bourama) : anneau qui
// se vide, titre, arrêter, ajouter ou retirer 5 minutes, et un bouton qui
// montre à la demande ce que Classinus fera à la fin. Deux gestes pour ne
// jamais gêner : réduire (pastille) et masquer (icône d'horloge).
export function CarteMinuteur({
  minuteur,
  maintenantMs,
  onArreter,
  onAjuster,
  onReduire,
  onMasquer,
}: {
  minuteur: Minuteur;
  maintenantMs: number;
  onArreter: () => void;
  onAjuster: (deltaSecondes: number) => void;
  onReduire: () => void;
  onMasquer: () => void;
}) {
  const t = textesMinuteurs();
  const [suiteOuverte, setSuiteOuverte] = useState(false);
  const enCours = minuteur.statut === "en_cours";
  // Arrêté : le temps reste figé à ce qu'il était au moment de l'arrêt (valeur donnée par le serveur).
  const restant = enCours ? secondesRestantes(minuteur, maintenantMs) : minuteur.secondes_restantes;

  const etat = enCours ? null : minuteur.statut === "termine" ? t.termine : t.arrete;

  return (
    <div className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-3">
        <AnneauMinuteur secondesRestantes={restant} dureeSecondes={minuteur.duree_secondes} statut={minuteur.statut} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-dj-texte">
              {minuteur.titre || t.titreParDefaut}
              {etat && <span className="ml-2 text-xs font-normal text-dj-texte-muet">{etat}</span>}
            </p>
            <button type="button" onClick={onReduire} aria-label={t.reduire} title={t.reduire} className={classeIcone}>
              <Minimize2 size={14} />
            </button>
            <button type="button" onClick={onMasquer} aria-label={t.masquer} title={t.masquer} className={classeIcone}>
              <EyeOff size={14} />
            </button>
          </div>

          {enCours && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={onArreter} className={classeBouton}>
                {t.arreter}
              </button>
              <button
                type="button"
                onClick={() => onAjuster(-PAS_AJUSTEMENT_SECONDES)}
                aria-label={t.retirerCinqAria}
                className={classeBouton}
              >
                <Minus size={12} />
                {t.ajouterCinq}
              </button>
              <button
                type="button"
                onClick={() => onAjuster(PAS_AJUSTEMENT_SECONDES)}
                aria-label={t.ajouterCinqAria}
                className={classeBouton}
              >
                <Plus size={12} />
                {t.ajouterCinq}
              </button>
            </div>
          )}
        </div>
      </div>

      {enCours && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setSuiteOuverte((v) => !v)}
            aria-expanded={suiteOuverte}
            className="inline-flex items-center gap-1 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            {suiteOuverte ? t.masquerSuite : t.voirSuite}
            {suiteOuverte ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <AnimatePresence initial={false}>
            {suiteOuverte && (
              <motion.p
                key="suite"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden pt-1 text-xs text-dj-texte"
              >
                {minuteur.action_fin || t.aucuneSuite}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
