"use client";

import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { enregistrerMonProfil } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

/**
 * 18/09/2026, chantier "profil contributeur bibliotheque publique",
 * étape 11 : proposé une seule fois (voir
 * lib/usePremierePublicationCatalogue.ts) juste après la première
 * publication réussie d'un élément vers le catalogue public. Même
 * langage visuel que ProfilPublicModal.tsx / VoirSkillRecuModal.tsx.
 */
export function PopupProposerProfilPublic({ onFermer }: { onFermer: () => void }) {
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  async function activer() {
    setEnregistrement(true);
    setErreur(null);
    try {
      await enregistrerMonProfil({ profil_public: true });
      fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        className={`flex w-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-sm sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-dj-texte">
            <Sparkles size={15} className="flex-shrink-0 text-dj-accent-1" />
            <span className="truncate">Activer ton profil public ?</span>
          </h4>
          <button onClick={fermer} className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        <p className="text-sm text-dj-texte-muet">
          Ton nom, ta photo et ta bio pourront être vus par les personnes qui consultent ce que tu publies sur la
          bibliothèque publique. C'est aussi ce qui te permet de commenter les éléments des autres. Tu peux changer
          ça à tout moment dans Paramètres.
        </p>

        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={fermer}
            disabled={enregistrement}
            className="flex-1 rounded-cgpt-bouton border border-dj-bordure px-4 py-2 text-sm font-medium text-dj-texte-muet transition-colors hover:bg-dj-surface-haute disabled:opacity-50"
          >
            Plus tard
          </button>
          <button
            onClick={activer}
            disabled={enregistrement}
            className="flex-1 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
          >
            {enregistrement ? "…" : "Activer"}
          </button>
        </div>
      </div>
    </div>
  );
}
