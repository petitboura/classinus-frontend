"use client";

import { RotateCw, ArrowRight, AlertCircle, Pencil, Loader2 } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";

const TEXTES = {
  fr: { interrompue: "Réponse interrompue", arretEnCours: "Arrêt en cours…", modifier: "Modifier", continuer: "Continuer", reessayer: "Réessayer" },
  en: { interrompue: "Reply stopped", arretEnCours: "Stopping…", modifier: "Edit", continuer: "Continue", reessayer: "Try again" },
} as const;

// Ajouté 20/09/2026 (demande Bourama : bouton arrêter). Bandeau affiché
// SOUS le message précis coupé en plein streaming par arreterGeneration
// (ChatIA.tsx), le texte déjà écrit reste affiché tel quel juste
// au-dessus (décision Bourama : "il fait partie de la conversation"),
// ce bandeau prévient juste que la réponse est incomplète et propose de
// quoi continuer. "Continuer" reprend avec les résultats d'outils déjà
// obtenus quand le serveur a renvoyé l'état de reprise avant de fermer le
// flux (ChatIA.tsx:reprendreAgent), sinon il relance une génération neuve
// avec pour seul contexte l'historique déjà accumulé. "Modifier" (choix
// Bourama parmi deux lectures possibles) ouvre le mode édition du message
// UTILISATEUR précédent, pas du texte déjà écrit par Classinus.
// Tant que le serveur finit de s'arrêter (arretEnCours), le bandeau est déjà
// là pour que le clic se voie, boutons désactivés.
export function BandeauReponseInterrompue({
  enAttente,
  arretEnCours = false,
  onModifier,
  onContinuer,
  onReessayer,
}: {
  enAttente: boolean;
  arretEnCours?: boolean;
  // Absent dans la bulle du canal en direct (décision Bourama, 02/10/2026) : pas
  // de bouton Modifier, il n'y a pas de fil de messages à rouvrir.
  onModifier?: () => void;
  onContinuer: () => void;
  onReessayer: () => void;
}) {
  const textes = TEXTES[useLocale()];
  const classeBouton =
    "flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface disabled:opacity-50";

  return (
    <div className="my-1.5 flex w-fit animate-dj-fade-in flex-wrap items-center gap-2 rounded-lg border border-dj-accent-2/40 bg-dj-accent-2/10 px-3 py-2 text-[13px] text-dj-texte">
      <span className="flex items-center gap-1.5">
        {arretEnCours ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-dj-accent-2" />
        ) : (
          <AlertCircle size={16} className="shrink-0 text-dj-accent-2" />
        )}
        {arretEnCours ? textes.arretEnCours : textes.interrompue}
      </span>
      {onModifier && (
        <button onClick={onModifier} disabled={enAttente} className={classeBouton}>
          <Pencil size={13} />
          {textes.modifier}
        </button>
      )}
      <button onClick={onContinuer} disabled={enAttente} className={classeBouton}>
        <ArrowRight size={13} />
        {textes.continuer}
      </button>
      <button onClick={onReessayer} disabled={enAttente} className={classeBouton}>
        <RotateCw size={13} />
        {textes.reessayer}
      </button>
    </div>
  );
}
