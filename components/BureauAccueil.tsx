"use client";

import { useEffect, useState } from "react";
import { ListeSections } from "./ListeSections";
import { obtenirMonStatut, enregistrerMonProfil } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { SECTIONS_BUREAU } from "@/lib/sectionsBureau";
import { ROUTES_BUREAU } from "@/lib/routesBureau";

// 26/09/2026, demande Bourama : bouton "je suis prof / je ne suis pas
// prof" en haut de la page Bureau. Désactivé, il retire de la liste les
// trois sections pensées pour un usage prof (Audit hebdomadaire,
// Programme, Signalements) -- les trois autres (Mes codes, Entrer un
// code, Établissements) restent toujours visibles, dans les deux états.
// Accès direct par URL volontairement non bloqué (demande explicite de
// Bourama : juste une préférence d'affichage de la liste, pas une vraie
// restriction d'accès).
const SECTIONS_PROF_UNIQUEMENT = new Set<string>([
  ROUTES_BUREAU.audit,
  ROUTES_BUREAU.programme,
  ROUTES_BUREAU.signalements,
]);

export function BureauAccueil() {
  // True par défaut (voir MonStatutReponse.est_professeur côté
  // backend) : tant que le statut n'est pas encore chargé, ou pour un
  // visiteur sans compte, la liste complète s'affiche -- pas de
  // masquage à tort le temps du chargement.
  const [estProfesseur, setEstProfesseur] = useState(true);
  const [connecte, setConnecte] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    obtenirMonStatut()
      .then((s) => {
        setEstProfesseur(s.est_professeur);
        setConnecte(true);
      })
      .catch(() => {
        // Silencieux (visiteur sans compte, ou lecture en échec) :
        // reste sur la liste complète, bouton simplement pas affiché.
      });
  }, []);

  async function basculer(nouvelleValeur: boolean) {
    if (nouvelleValeur === estProfesseur) return;
    setEstProfesseur(nouvelleValeur); // optimiste
    setEnregistrement(true);
    setErreur(null);
    try {
      await enregistrerMonProfil({ est_professeur: nouvelleValeur });
    } catch (e) {
      setEstProfesseur(!nouvelleValeur);
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  const sections = estProfesseur
    ? SECTIONS_BUREAU
    : SECTIONS_BUREAU.filter((s) => !SECTIONS_PROF_UNIQUEMENT.has(s.href));

  return (
    <div className="space-y-4">
      {connecte && (
        <div className="flex items-center justify-between gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-dj-texte">Je suis prof</span>
            <span className="text-xs text-dj-texte-muet">
              Désactive pour ne garder que Mes codes, Entrer un code et Établissements.
            </span>
          </div>
          <button
            role="switch"
            aria-checked={estProfesseur}
            onClick={() => basculer(!estProfesseur)}
            disabled={enregistrement}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
              estProfesseur ? "bg-dj-accent-1" : "bg-dj-inactif"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                estProfesseur ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      )}
      {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
      <ListeSections sections={sections} />
    </div>
  );
}
