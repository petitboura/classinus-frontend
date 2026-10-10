"use client";

import { AlertCircle, Check, Download, Loader2 } from "lucide-react";
import { useEtatTelechargement, useSuiviParBouton, type EtatTelechargement } from "@/lib/etatTelechargements";
import { textesTelechargement } from "@/lib/textesTelechargement";

// Pièces partagées du retour visuel d'un téléchargement (10/10/2026, demande
// Bourama : afficher l'avancement en pourcentage et informer en cas d'échec,
// sur tous les boutons de téléchargement). Chaque bouton garde son propre
// style et sa propre mise en page : il remplace seulement son icône et son
// libellé par ceux-ci, et suit l'état par l'adresse du fichier (la même que
// celle passée à telecharger() dans lib/telecharger.ts).

// Classes à ajouter au bouton lui-même quand le téléchargement a échoué
// (bouton rouge, comme demandé) ou est en cours (non cliquable, pas de double
// téléchargement).
export function classeEtatTelechargement(etat: EtatTelechargement | undefined): string {
  if (etat?.statut === "echec") {
    return "!border-[var(--dj-erreur)] !bg-[var(--dj-erreur)]/15 !text-[var(--dj-erreur)]";
  }
  if (etat?.statut === "encours") return "pointer-events-none opacity-80";
  return "";
}

export function IconeTelechargement({
  href,
  size = 14,
  className,
}: {
  href: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const etat = useEtatTelechargement(href);
  // Ce bouton affiche déjà l'état : la carte globale ne le répète pas.
  useSuiviParBouton(href);
  if (etat?.statut === "encours") return <Loader2 size={size} className={`animate-spin ${className ?? ""}`} />;
  if (etat?.statut === "reussi") return <Check size={size} className={className} />;
  if (etat?.statut === "echec") return <AlertCircle size={size} className={className} />;
  return <Download size={size} className={className} />;
}

// Texte du bouton : le libellé habituel au repos, puis le pourcentage (ou
// "Préparation" tant que la taille est inconnue), "Téléchargé", ou
// "Échec, réessayer".
export function LibelleTelechargement({ href, defaut }: { href: string | null | undefined; defaut: string }) {
  const etat = useEtatTelechargement(href);
  const t = textesTelechargement();
  if (!etat) return <>{defaut}</>;
  if (etat.statut === "encours") {
    return <>{etat.pourcentage === null ? t.preparation : t.pourcentage(etat.pourcentage)}</>;
  }
  if (etat.statut === "reussi") return <>{t.termine}</>;
  return <>{t.echecCourt}</>;
}

// Message d'erreur explicite sous le bouton quand le téléchargement a échoué.
// Annoncé aux lecteurs d'écran (role="alert") et animé à l'apparition.
export function MessageEchecTelechargement({
  href,
  className = "",
}: {
  href: string | null | undefined;
  className?: string;
}) {
  const etat = useEtatTelechargement(href);
  if (etat?.statut !== "echec" || !etat.erreur) return null;
  return (
    <span role="alert" className={`block animate-dj-fade-in text-xs text-[var(--dj-erreur)] ${className}`}>
      {etat.erreur}
    </span>
  );
}

// Fine barre de progression à placer sous un bouton ou en bordure d'une
// carte : largeur au pourcentage réel, ou balayage continu quand la taille
// totale est inconnue. Rien d'affiché hors téléchargement en cours.
export function BarreProgressionTelechargement({
  href,
  className = "",
}: {
  href: string | null | undefined;
  className?: string;
}) {
  const etat = useEtatTelechargement(href);
  if (etat?.statut !== "encours") return null;
  const pourcentage = etat.pourcentage;
  return (
    <span
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pourcentage ?? undefined}
      className={`block h-1 w-full overflow-hidden rounded-full bg-dj-bordure ${className}`}
    >
      <span
        className={`block h-full rounded-full bg-dj-accent-1 transition-[width] duration-200 ease-out ${
          pourcentage === null ? "w-1/3 animate-pulse" : ""
        }`}
        style={pourcentage === null ? undefined : { width: `${pourcentage}%` }}
      />
    </span>
  );
}
