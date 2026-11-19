"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Power } from "lucide-react";
import {
  arreterRelaisPc,
  demarrerRelaisPc,
  ecouterRelaisPc,
  lireEtatRelaisPc,
  ouvrirPageSanteRelaisPc,
  surAppliPc,
  type EtatRelaisPc,
} from "@/lib/relaisPc";
import { messageErreurPlugin } from "@/lib/usePluginNatif";
import { Skeleton } from "./Skeleton";

/**
 * Créé le 28/10/2026, demande Bourama : relais téléphone embarqué dans
 * l'appli PC (décision D31). Depuis D37 (29/10/2026 : relais 100 % automatique,
 * aucun réglage à ouvrir), le relais démarre tout seul avec l'appli : cette
 * carte n'est qu'un voyant d'état, et ouvre la page de santé. Les boutons
 * Lancer et Arrêter restent en secours manuel, jamais obligatoires.
 *
 * Carte autonome, même principe que MiseAJourPcCarte.tsx : absente sur web
 * et mobile, elle gère elle même son état. Pas de mécanisme i18n branché dans
 * les Paramètres : textes en français.
 */

function texteEtat(e: EtatRelaisPc): string {
  switch (e.etat) {
    case "indisponible":
      return e.message ?? "Le relais téléphone n'est pas dans cette installation de Classinus.";
    case "arrete":
      return "Le relais est arrêté. Il repart tout seul au prochain lancement de Classinus, ou relance-le ici.";
    case "demarrage":
      return "Le relais démarre...";
    case "enmarche":
      return "Le relais tourne. Ton téléphone branché en USB est relié.";
    case "erreur":
      return e.message ?? "Le relais ne répond pas pour le moment.";
  }
}

export function RelaisPcCarte() {
  const [surPc, setSurPc] = useState<boolean | null>(null);
  const [etat, setEtat] = useState<EtatRelaisPc | null>(null);
  const [action, setAction] = useState<"demarrage" | "arret" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    let arreterEcoute: (() => void) | null = null;
    import("@capacitor/core").then(() => {
      if (annule) return;
      const pc = surAppliPc();
      setSurPc(pc);
      if (!pc) return;
      lireEtatRelaisPc()
        .then((e) => {
          if (!annule) setEtat(e);
        })
        .catch((e) => {
          if (!annule) setErreur(messageErreurPlugin(e));
        });
      ecouterRelaisPc((e) => {
        if (!annule) setEtat(e);
      })
        .then((arreter) => {
          if (annule) arreter();
          else arreterEcoute = arreter;
        })
        .catch(() => {
          // Sans écoute, la carte garde le dernier état lu.
        });
    });
    return () => {
      annule = true;
      arreterEcoute?.();
    };
  }, []);

  const demarrer = useCallback(async () => {
    setErreur(null);
    setAction("demarrage");
    try {
      setEtat(await demarrerRelaisPc());
    } catch (e) {
      setErreur(messageErreurPlugin(e));
    } finally {
      setAction(null);
    }
  }, []);

  const arreter = useCallback(async () => {
    setErreur(null);
    setAction("arret");
    try {
      setEtat(await arreterRelaisPc());
    } catch (e) {
      setErreur(messageErreurPlugin(e));
    } finally {
      setAction(null);
    }
  }, []);

  const ouvrirPageSante = useCallback(async () => {
    setErreur(null);
    try {
      const r = await ouvrirPageSanteRelaisPc();
      if (!r.ouvert) setErreur("La page de santé ne peut pas s'ouvrir pour le moment.");
    } catch (e) {
      setErreur(messageErreurPlugin(e));
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

  const peutLancer = etat !== null && (etat.etat === "arrete" || etat.etat === "erreur");
  const peutArreter = etat !== null && (etat.etat === "demarrage" || etat.etat === "enmarche");

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-2 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Activity size={18} className="flex-shrink-0 text-dj-texte-muet" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm font-medium text-dj-texte">Relais téléphone</span>
            <span className="text-xs text-dj-texte-muet" aria-live="polite">
              {etat ? texteEtat(etat) : "Lecture de l'état..."}
            </span>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {etat?.etat === "enmarche" && etat.urlSante && (
            <button
              onClick={ouvrirPageSante}
              className="rounded-lg bg-dj-surface-haute px-3 py-1.5 text-xs font-bold text-dj-texte transition-colors hover:bg-dj-bordure"
            >
              Page de santé
            </button>
          )}
          {peutLancer ? (
            <button
              onClick={demarrer}
              disabled={action === "demarrage"}
              className="flex items-center gap-1.5 rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
            >
              <Power size={12} />
              {action === "demarrage" ? "Lancement..." : "Lancer"}
            </button>
          ) : peutArreter ? (
            <button
              onClick={arreter}
              disabled={action === "arret"}
              className="flex items-center gap-1.5 rounded-lg bg-dj-surface-haute px-3 py-1.5 text-xs font-bold text-dj-texte transition-colors hover:bg-dj-bordure disabled:opacity-50"
            >
              <Power size={12} />
              {action === "arret" ? "Arrêt..." : "Arrêter"}
            </button>
          ) : null}
        </div>
      </div>
      {erreur && <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}
    </div>
  );
}
