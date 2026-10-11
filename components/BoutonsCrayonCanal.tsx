"use client";

// Les deux boutons du crayon du canal en direct sur PC (11/10/2026, demande Bourama),
// posés dans le groupe de ControlesInteractionCanal, fenêtre de superposition seulement :
// - le crayon : sort ou range le crayon pour entourer quelque chose à l'écran ;
// - les traits : efface les traits affichés, ou les fait réapparaître une fois estompés.
// Les icônes sont volontairement différentes de celles d'Écrire et du dessin des Utilitaires.

import { Eraser, Highlighter, History } from "lucide-react";
import { basculerCrayon, rappelerOuEffacerTraits, useCrayonEcran } from "@/lib/crayonEcran";

const LIBELLE_CRAYON_SORTI = "Ranger le crayon";
const LIBELLE_CRAYON_RANGE = "Entourer quelque chose à l'écran pour le montrer à Classinus";
const LIBELLE_EFFACER = "Effacer les traits";
const LIBELLE_RAPPELER = "Faire réapparaître les traits";

const CLASSE_BASE = "flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors";

export function BoutonCrayonCanal() {
  const { actif } = useCrayonEcran();
  const libelle = actif ? LIBELLE_CRAYON_SORTI : LIBELLE_CRAYON_RANGE;
  return (
    <button
      onClick={basculerCrayon}
      aria-pressed={actif}
      aria-label={libelle}
      title={libelle}
      className={`${CLASSE_BASE} ${
        actif
          ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02]"
          : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
      }`}
    >
      <Highlighter size={18} />
    </button>
  );
}

/** À afficher seulement quand il y a des traits à effacer ou à rappeler. */
export function peutAfficherBoutonTraits(etat: { traits: unknown[]; visibles: boolean; restaurable: boolean }): boolean {
  return etat.traits.length > 0 && (etat.visibles || etat.restaurable);
}

export function BoutonTraitsCanal() {
  const { visibles } = useCrayonEcran();
  const libelle = visibles ? LIBELLE_EFFACER : LIBELLE_RAPPELER;
  return (
    <button
      onClick={rappelerOuEffacerTraits}
      aria-label={libelle}
      title={libelle}
      className={`${CLASSE_BASE} border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte`}
    >
      {visibles ? <Eraser size={18} /> : <History size={18} />}
    </button>
  );
}
