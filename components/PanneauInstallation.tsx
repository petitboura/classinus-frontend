"use client";

import { Share } from "lucide-react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { useFermetureAuRetour } from "@/lib/contexteRetour";
import { fermerAideInstallation, masquerBoutonFlottant, useInstallationWeb } from "@/lib/installationWeb";

// Page des étapes d'installation (25/11/2026, demande de Bourama), pour l'iPhone et pour tout navigateur Android qui
// n'ouvre pas la fenêtre d'installation. Montée une seule fois (components/InteractionGlobale.tsx, pour profiter du
// bouton retour), ouverte depuis le bouton flottant, la barre latérale ou la page /telecharger.
// « Je n'arrive pas à l'installer » masque le bouton flottant pour de bon ; le bouton de la barre latérale reste.

export function EtapesInstallation({ ios }: { ios: boolean }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-dj-texte-muet">
      {ios ? (
        <>
          <li>
            <Share size={14} className="mr-1.5 inline align-text-bottom text-dj-texte" aria-hidden />
            <span>Appuie sur Partager, en bas de Safari ou derrière les trois points</span>
          </li>
          <li>Choisis « Sur l&apos;écran d&apos;accueil »</li>
        </>
      ) : (
        <>
          <li>Ouvre le menu de ton navigateur (les trois points)</li>
          <li>Choisis « Installer l&apos;application » ou « Ajouter à l&apos;écran d&apos;accueil »</li>
        </>
      )}
    </ol>
  );
}

export function PanneauInstallation() {
  const { plateforme, aideOuverte, boutonMasque } = useInstallationWeb();
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(fermerAideInstallation);
  useFermetureAuRetour(aideOuverte, fermer);

  if (!aideOuverte || !plateforme) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 pb-[calc(1rem+var(--dj-barre-onglets-web,0px))] sm:items-center sm:pb-4 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titre-installation"
        className={`max-h-full w-full max-w-sm overflow-y-auto rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5 text-sm text-dj-texte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <p id="titre-installation" className="mb-3 font-display text-base font-bold">
          Installer Classinus
        </p>
        <EtapesInstallation ios={plateforme === "ios"} />
        <button
          type="button"
          onClick={fermer}
          className="mt-4 min-h-[44px] w-full rounded-cgpt-bouton bg-dj-accent-1 py-2 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2"
        >
          Compris
        </button>
        {!boutonMasque && (
          <button
            type="button"
            onClick={() => demarrerFermeture(masquerBoutonFlottant)}
            className="mt-2 min-h-[44px] w-full text-sm text-dj-texte-muet underline underline-offset-2 transition-colors hover:text-dj-texte"
          >
            Je n&apos;arrive pas à l&apos;installer
          </button>
        )}
      </div>
    </div>
  );
}
