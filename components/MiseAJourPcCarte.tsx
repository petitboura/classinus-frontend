"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  ecouterMiseAJourPc,
  installerMiseAJourPc,
  lireEtatMiseAJourPc,
  surAppliPc,
  verifierMiseAJourPc,
  type EtatMiseAJourPc,
} from "@/lib/miseAJourPcElectron";
import { messageErreurPlugin } from "@/lib/usePluginNatif";
import { Skeleton } from "./Skeleton";

/**
 * Créé le 19/10/2026, demande Bourama : mise à jour automatique de l'appli PC.
 * L'appli vérifie seule (30 secondes après le démarrage, puis toutes les 4 heures),
 * télécharge en arrière-plan, et installe à la prochaine fermeture. Comme Classinus
 * reste ouvert en arrière-plan (fermer la fenêtre ne l'arrête pas), cette carte
 * permet aussi d'installer tout de suite.
 *
 * Carte autonome, même principe que DemarrageAutomatiqueCarte.tsx : absente sur web
 * et mobile, elle gère elle même son état. Pas de mécanisme i18n branché dans les
 * Paramètres : textes en français.
 */

function texteEtat(e: EtatMiseAJourPc): string {
  switch (e.etat) {
    case "indisponible":
      return e.message ?? "La mise à jour automatique n'existe que dans l'application installée.";
    case "inactif":
      return "Classinus vérifie les mises à jour automatiquement.";
    case "verification":
      return "Recherche d'une mise à jour...";
    case "a-jour":
      return "Classinus est à jour.";
    case "telechargement":
      return `Téléchargement de la version ${e.versionDisponible ?? "plus récente"}${
        e.progression !== null ? ` : ${e.progression} %` : ""
      }`;
    case "prete":
      return `La version ${e.versionDisponible ?? "plus récente"} est prête à être installée.`;
    case "erreur":
      return e.message ?? "Vérification impossible pour le moment.";
  }
}

export function MiseAJourPcCarte() {
  const [surPc, setSurPc] = useState<boolean | null>(null);
  const [etat, setEtat] = useState<EtatMiseAJourPc | null>(null);
  const [action, setAction] = useState<"verification" | "installation" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    let arreterEcoute: (() => void) | null = null;
    import("@capacitor/core").then(() => {
      if (annule) return;
      const pc = surAppliPc();
      setSurPc(pc);
      if (!pc) return;
      lireEtatMiseAJourPc()
        .then((e) => {
          if (!annule) setEtat(e);
        })
        .catch((e) => {
          if (!annule) setErreur(messageErreurPlugin(e));
        });
      ecouterMiseAJourPc((e) => {
        if (!annule) setEtat(e);
      })
        .then((arreter) => {
          if (annule) arreter();
          else arreterEcoute = arreter;
        })
        .catch(() => {
          // Sans écoute, la carte garde le dernier état lu et le bouton Vérifier le rafraîchit.
        });
    });
    return () => {
      annule = true;
      arreterEcoute?.();
    };
  }, []);

  const verifier = useCallback(async () => {
    setErreur(null);
    setAction("verification");
    try {
      setEtat(await verifierMiseAJourPc());
    } catch (e) {
      setErreur(messageErreurPlugin(e));
    } finally {
      setAction(null);
    }
  }, []);

  const installer = useCallback(async () => {
    setErreur(null);
    setAction("installation");
    try {
      const r = await installerMiseAJourPc();
      // Si l'installation démarre, Classinus se ferme et se relance : rien d'autre à faire ici.
      if (!r.lance) setAction(null);
    } catch (e) {
      setErreur(messageErreurPlugin(e));
      setAction(null);
    }
  }, []);

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

  const peutVerifier = etat !== null && (etat.etat === "inactif" || etat.etat === "a-jour" || etat.etat === "erreur");
  const progression = etat?.etat === "telechargement" ? etat.progression : null;

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Download size={18} className="flex-shrink-0 text-dj-texte-muet" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium text-dj-texte">
              Mise à jour de Classinus{etat ? ` (version ${etat.versionActuelle})` : ""}
            </span>
            <span className="text-xs text-dj-texte-muet" aria-live="polite">
              {etat ? texteEtat(etat) : "Lecture de l'état..."}
            </span>
          </div>
        </div>
        {etat?.etat === "prete" ? (
          <button
            onClick={installer}
            disabled={action === "installation"}
            className="flex-shrink-0 rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
          >
            {action === "installation" ? "Redémarrage..." : "Redémarrer pour installer"}
          </button>
        ) : peutVerifier ? (
          <button
            onClick={verifier}
            disabled={action === "verification"}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-dj-surface-haute px-3 py-1.5 text-xs font-bold text-dj-texte transition-colors hover:bg-dj-bordure disabled:opacity-50"
          >
            <RefreshCw size={12} className={action === "verification" ? "animate-spin" : ""} />
            Vérifier
          </button>
        ) : null}
      </div>
      {progression !== null && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progression}
          aria-label="Progression du téléchargement"
          className="h-1.5 w-full overflow-hidden rounded-full bg-dj-inactif"
        >
          <div className="h-full rounded-full bg-dj-accent-1 transition-all duration-300" style={{ width: `${progression}%` }} />
        </div>
      )}
      {erreur && <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}
    </div>
  );
}
