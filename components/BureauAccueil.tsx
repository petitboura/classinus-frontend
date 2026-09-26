"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ListeSections } from "./ListeSections";
import { Skeleton } from "./Skeleton";
import { obtenirMonStatut, enregistrerMonProfil } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { SECTIONS_BUREAU } from "@/lib/sectionsBureau";
import { ROUTES_BUREAU } from "@/lib/routesBureau";
import { ROUTES_PARAMETRES } from "@/lib/routesParametres";

// 26/09/2026, demande Bourama : "Es-tu prof ?" -- redesigné le même
// jour après un premier retour (un interrupteur permanent en haut de
// Bureau prenait trop de place, l'inverse de son but). Devient une
// question posée UNE SEULE FOIS, à la première entrée dans Bureau tant
// que jamais répondue (voir MonStatutReponse.est_professeur côté
// backend, None = jamais répondu). Une fois répondue, conditionne
// l'affichage de trois sections (Audit hebdomadaire, Programme,
// Signalements) dans la liste -- les trois autres (Mes codes, Entrer un
// code, Établissements) restent toujours visibles. Modifiable ensuite
// dans Paramètres > Préférences (voir ParametresPreferences.tsx), pas
// ici. Accès direct par URL volontairement non bloqué (demande
// explicite de Bourama : juste une préférence d'affichage de la liste).
const SECTIONS_PROF_UNIQUEMENT = new Set<string>([
  ROUTES_BUREAU.audit,
  ROUTES_BUREAU.programme,
  ROUTES_BUREAU.signalements,
]);

export function BureauAccueil() {
  const [chargement, setChargement] = useState(true);
  // null = jamais répondu (ou visiteur sans compte -- voir le catch
  // ci-dessous, qui laisse volontairement cette valeur à null plutôt
  // que de poser la question à quelqu'un qui n'a pas de profil à
  // enregistrer).
  const [estProfesseur, setEstProfesseur] = useState<boolean | null>(null);
  const [sansCompte, setSansCompte] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Message "c'est noté, voir Paramètres" affiché juste après avoir
  // répondu -- transitoire (pas gardé en mémoire), disparaît si on
  // ressort de Bureau et qu'on y revient.
  const [vientDeRepondre, setVientDeRepondre] = useState(false);

  useEffect(() => {
    obtenirMonStatut()
      .then((s) => setEstProfesseur(s.est_professeur))
      .catch(() => {
        // Visiteur sans compte (401) ou lecture en échec : reste sur la
        // liste complète, jamais cette question (rien à enregistrer).
        setSansCompte(true);
      })
      .finally(() => setChargement(false));
  }, []);

  async function repondre(valeur: boolean) {
    setEnregistrement(true);
    setErreur(null);
    try {
      await enregistrerMonProfil({ est_professeur: valeur });
      setEstProfesseur(valeur);
      setVientDeRepondre(true);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  // Chargement : mêmes dimensions que la liste de sections en dessous,
  // pour ne jamais montrer brièvement la mauvaise liste avant de la
  // corriger (BUG signalé par Bourama sur le premier jet).
  if (chargement) {
    return (
      <div className="space-y-2" aria-hidden>
        <Skeleton className="h-[60px] w-full rounded-cgpt-carte" />
        <Skeleton className="h-[60px] w-full rounded-cgpt-carte" />
        <Skeleton className="h-[60px] w-full rounded-cgpt-carte" />
      </div>
    );
  }

  if (!sansCompte && estProfesseur === null) {
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
