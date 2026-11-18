"use client";

import type { ReactNode } from "react";
import { Check, CircleAlert, LoaderCircle, MoreHorizontal, PlugZap } from "lucide-react";
import type { AppliDisponible } from "@/lib/outils";

export type EtatConnexion = "chargement" | "connecte" | "deconnecte" | "reconnecter" | "erreur";

// Pastille d'état partagée par la carte et le panneau : une seule source pour les libellés.
export function IndicateurEtatConnexion({ etat }: { etat: EtatConnexion }) {
  const libelle = etat === "chargement" ? "Vérification…" : etat === "connecte" ? "Connecté" : etat === "reconnecter" ? "Reconnexion nécessaire" : etat === "erreur" ? "Statut indisponible" : "Non connecté";
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs text-dj-texte-muet">
      {etat === "chargement" ? <LoaderCircle size={14} className="shrink-0 animate-spin" /> : etat === "connecte" ? <Check size={14} className="shrink-0 text-emerald-500" /> : etat === "erreur" || etat === "reconnecter" ? <CircleAlert size={14} className="shrink-0" /> : <PlugZap size={14} className="shrink-0" />}
      <span className="truncate">{libelle}</span>
    </span>
  );
}

export function BadgePreversion({ app }: { app: AppliDisponible }) {
  if (app.etatDisponibilite !== "apercu") return null;
  return <span className="shrink-0 rounded-full border border-dj-bordure px-2 py-0.5 text-[10px] text-dj-texte-muet">Préversion développeur</span>;
}

// Carte de taille fixe : la description est coupée, le panneau « Voir plus » (trois points)
// montre la carte complète. Toutes les cartes ont donc la même hauteur, avec ou sans jeton.
export function CarteConnexion({
  app,
  description,
  etat,
  actions,
  onVoirPlus,
  className = "",
}: {
  app: AppliDisponible;
  description: string;
  etat: EtatConnexion;
  actions: ReactNode;
  onVoirPlus: () => void;
  className?: string;
}) {
  const Icone = app.Icone;
  return (
    <article className={"flex h-48 flex-col justify-between gap-3 overflow-hidden rounded-2xl border border-dj-bordure bg-dj-surface p-4 " + className}>
      <div className="flex min-h-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><Icone size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-dj-texte">{app.label}</h3>
            <BadgePreversion app={app} />
          </div>
          <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-dj-texte-muet">{description}</p>
        </div>
        <button
          type="button"
          onClick={onVoirPlus}
          aria-label="Voir plus"
          title="Voir plus"
          className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <IndicateurEtatConnexion etat={etat} />
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      </div>
    </article>
  );
}
