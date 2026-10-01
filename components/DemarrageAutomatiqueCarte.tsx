"use client";

import { useEffect, useState } from "react";
import { Power } from "lucide-react";
import {
  definirDemarrageAutomatique,
  lireDemarrageAutomatique,
  surElectron,
} from "@/lib/superpositionElectron";
import { messageErreurPlugin } from "@/lib/usePluginNatif";
import { Skeleton } from "./Skeleton";

/**
 * Créé le 01/10/2026, demande Bourama : réglage du démarrage automatique de
 * Classinus avec Windows (activé par défaut au premier lancement de l'appli
 * installée, voir electron/demarrage.ts). Au démarrage, Classinus se lance
 * sans ouvrir de fenêtre : seul le bouton du canal en direct apparaît.
 *
 * Carte autonome, même principe que MiseAJourCarte.tsx : elle gère elle même
 * son état. Absente sur web et mobile (ce réglage n'y existe pas), un
 * message explique seulement quand l'appli PC ne peut pas le régler.
 * Pas de mécanisme i18n branché dans les Paramètres : texte en français.
 */
export function DemarrageAutomatiqueCarte() {
  const [surPc, setSurPc] = useState<boolean | null>(null);
  const [disponible, setDisponible] = useState(false);
  const [actif, setActif] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    import("@capacitor/core").then(() => {
      if (annule) return;
      const electron = surElectron();
      setSurPc(electron);
      if (!electron) return;
      lireDemarrageAutomatique()
        .then((r) => {
          if (annule) return;
          setDisponible(r.disponible);
          setActif(r.actif);
        })
        .catch((e) => {
          if (!annule) setErreur(messageErreurPlugin(e));
        });
    });
    return () => {
      annule = true;
    };
  }, []);

  async function basculer() {
    const nouvelleValeur = !actif;
    setErreur(null);
    setEnregistrement(true);
    try {
      await definirDemarrageAutomatique(nouvelleValeur);
      setActif(nouvelleValeur);
    } catch (e) {
      setErreur(messageErreurPlugin(e));
    } finally {
      setEnregistrement(false);
    }
  }

  if (surPc === null) {
    return (
      <div className="flex items-center gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4" aria-hidden>
        <Skeleton className="h-[18px] w-[18px] flex-shrink-0 rounded" />
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-3.5 w-48 rounded" />
          <Skeleton className="h-2.5 w-64 rounded" />
        </div>
      </div>
    );
  }

  if (!surPc) return null;

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Power size={18} className="flex-shrink-0 text-dj-texte-muet" />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-dj-texte">Lancer Classinus avec Windows</span>
            <span className="text-xs text-dj-texte-muet">
              {disponible
                ? "Au démarrage du PC, seul le bouton du canal en direct apparaît, sans ouvrir la fenêtre."
                : "Disponible uniquement dans l'application Classinus installée sous Windows."}
            </span>
          </div>
        </div>
        <button
          role="switch"
          aria-checked={actif}
          aria-label="Lancer Classinus avec Windows"
          onClick={basculer}
          disabled={enregistrement || !disponible}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            actif ? "bg-dj-accent-1" : "bg-dj-inactif"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              actif ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {erreur && <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}
    </div>
  );
}
