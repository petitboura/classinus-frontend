"use client";

import { AlertCircle, Check, Loader2, RotateCw, X } from "lucide-react";
import {
  oublierTelechargement,
  useTelechargementsSansBouton,
  type EntreeTelechargement,
} from "@/lib/etatTelechargements";
import { textesTelechargement } from "@/lib/textesTelechargement";
import { useLocale } from "@/lib/i18n/useLocale";

// Carte globale des téléchargements (10/10/2026, demande Bourama : afficher
// l'avancement en pourcentage et informer en cas d'échec partout). Les boutons
// de téléchargement montrent déjà leur propre état ; cette carte couvre les
// téléchargements qu'aucun bouton ne suit : clic sur un lien de fichier dans
// le chat, téléchargement d'une sélection de fichiers, etc. Un échec reste
// affiché avec "Réessayer" jusqu'à ce que l'utilisateur le ferme.
function LigneTelechargement({ entree }: { entree: EntreeTelechargement }) {
  const locale = useLocale();
  const t = textesTelechargement(locale);
  const { statut, pourcentage, erreur, nom, relancer, cle } = entree;
  const enEchec = statut === "echec";

  return (
    <div
      role={enEchec ? "alert" : "status"}
      className={`flex w-full max-w-sm animate-dj-fade-in flex-col gap-2 rounded-cgpt-carte border bg-dj-surface p-3 shadow-[0_8px_30px_rgba(0,0,0,0.35)] ${
        enEchec ? "border-[var(--dj-erreur)]" : "border-dj-bordure"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`shrink-0 ${enEchec ? "text-[var(--dj-erreur)]" : "text-dj-accent-1"}`}>
          {statut === "encours" && <Loader2 size={16} className="animate-spin" />}
          {statut === "reussi" && <Check size={16} />}
          {enEchec && <AlertCircle size={16} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-dj-texte">{nom ?? ""}</span>
        <span className="shrink-0 text-xs text-dj-texte-muet">
          {statut === "encours" && (pourcentage === null ? t.preparation : t.pourcentage(pourcentage))}
          {statut === "reussi" && t.termine}
        </span>
        {enEchec && (
          <button
            type="button"
            onClick={() => oublierTelechargement(cle)}
            aria-label="Fermer"
            className="shrink-0 text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {statut === "encours" && (
        <span className="block h-1 w-full overflow-hidden rounded-full bg-dj-bordure">
          <span
            className={`block h-full rounded-full bg-dj-accent-1 transition-[width] duration-200 ease-out ${
              pourcentage === null ? "w-1/3 animate-pulse" : ""
            }`}
            style={pourcentage === null ? undefined : { width: `${pourcentage}%` }}
          />
        </span>
      )}

      {enEchec && (
        <>
          {erreur && <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p>}
          {relancer && (
            <button
              type="button"
              onClick={() => relancer()}
              className="flex w-fit items-center gap-1.5 rounded-cgpt-bouton bg-[var(--dj-erreur)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--dj-erreur)] transition-colors hover:bg-[var(--dj-erreur)]/20"
            >
              <RotateCw size={13} />
              {t.reessayer}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function IndicateurTelechargements() {
  const entrees = useTelechargementsSansBouton();
  if (entrees.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[200] flex flex-col items-center gap-2 px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      {entrees.map((entree) => (
        <div key={entree.cle} className="pointer-events-auto flex w-full justify-center">
          <LigneTelechargement entree={entree} />
        </div>
      ))}
    </div>
  );
}
