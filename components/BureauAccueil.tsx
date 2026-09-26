"use client";

import { useContext, useState } from "react";
import Link from "next/link";
import { ListeSections } from "./ListeSections";
import { Skeleton } from "./Skeleton";
import { messageErreur } from "@/lib/erreurs";
import { SECTIONS_BUREAU } from "@/lib/sectionsBureau";
import { ROUTES_BUREAU } from "@/lib/routesBureau";
import { ROUTES_PARAMETRES } from "@/lib/routesParametres";
import { ContexteStatutUtilisateur } from "@/lib/contexteStatutUtilisateur";

// 26/09/2026, demande Bourama : "Es-tu prof ?" -- redesigné deux fois le
// même jour après retours de Bourama : (1) un interrupteur permanent en
// haut de Bureau prenait trop de place, l'inverse de son but ; (2) le
// statut ne doit être lu qu'UNE FOIS par session d'appli, jamais rappelé
// à chaque écran -- voir lib/contexteStatutUtilisateur.tsx (lu une seule
// fois dans AppShell.tsx, partagé ici via ce contexte).
//
// Question posée une seule fois, à la première entrée dans Bureau tant
// que jamais répondue (estProfesseur === null). Une fois répondue,
// conditionne l'affichage de trois sections (Audit hebdomadaire,
// Programme, Signalements) dans la liste -- les trois autres (Mes codes,
// Entrer un code, Établissements) restent toujours visibles. Modifiable
// ensuite dans Paramètres > Préférences (voir ParametresPreferences.tsx),
// pas ici. Accès direct par URL volontairement non bloqué (demande
// explicite de Bourama : juste une préférence d'affichage de la liste).
const SECTIONS_PROF_UNIQUEMENT = new Set<string>([
  ROUTES_BUREAU.audit,
  ROUTES_BUREAU.programme,
  ROUTES_BUREAU.signalements,
]);

export function BureauAccueil() {
  const { chargement, estProfesseur, connecte, definirEstProfesseur } = useContext(ContexteStatutUtilisateur);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Message "c'est noté, voir Paramètres" affiché juste après avoir
  // répondu -- transitoire (pas gardé en mémoire), disparaît si on
  // ressort de Bureau et qu'on y revient.
  const [vientDeRepondre, setVientDeRepondre] = useState(false);

  async function repondre(valeur: boolean) {
    setEnregistrement(true);
    setErreur(null);
    try {
      await definirEstProfesseur(valeur);
      setVientDeRepondre(true);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  // Chargement (une seule fois par session d'appli, pas à chaque visite
  // de cette page) : mêmes dimensions que la liste de sections en
  // dessous, pour ne jamais montrer brièvement la mauvaise liste avant de
  // la corriger (bug signalé par Bourama sur le premier jet).
  if (chargement) {
    return (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-[60px] w-full rounded-cgpt-carte" />
        <Skeleton className="h-[60px] w-full rounded-cgpt-carte" />
        <Skeleton className="h-[60px] w-full rounded-cgpt-carte" />
      </div>
    );
  }

  if (connecte && estProfesseur === null) {
    return (
      <div className="flex flex-col gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-dj-texte">Es-tu prof ?</span>
          <span className="text-xs text-dj-texte-muet">
            Ça décide si Audit hebdomadaire, Programme et Signalements apparaissent ici. Modifiable ensuite dans
            Paramètres.
          </span>
        </div>
        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => repondre(true)}
            disabled={enregistrement}
            className="flex-1 rounded-lg border border-dj-accent-1 bg-dj-accent-1/10 px-3 py-2 text-sm font-medium text-dj-texte transition-colors disabled:opacity-60"
          >
            Oui, je suis prof
          </button>
          <button
            type="button"
            onClick={() => repondre(false)}
            disabled={enregistrement}
            className="flex-1 rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm font-medium text-dj-texte-muet transition-colors hover:bg-dj-surface disabled:opacity-60"
          >
            Non
          </button>
        </div>
      </div>
    );
  }

  const sections =
    estProfesseur === false
      ? SECTIONS_BUREAU.filter((s) => !SECTIONS_PROF_UNIQUEMENT.has(s.href))
      : SECTIONS_BUREAU;

  return (
    <div className="space-y-3">
      {vientDeRepondre && (
        <p className="text-xs text-dj-texte-muet">
          C&apos;est noté. Tu peux changer ça dans{" "}
          <Link href={ROUTES_PARAMETRES.preferences} className="underline hover:text-dj-texte">
            Paramètres → Préférences
          </Link>
          .
        </p>
      )}
      <ListeSections sections={sections} />
    </div>
  );
}
