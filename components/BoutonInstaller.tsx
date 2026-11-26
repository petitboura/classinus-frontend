"use client";

import { useEffect, useState } from "react";
import { TRAIT_ICONE_SECTION } from "@/lib/styleLignes";
import { installerClassinus, useInstallationWeb } from "@/lib/installationWeb";

// Bouton d'installation de la barre latérale. Sur Android et iPhone (25/11/2026, demande de Bourama), il est toujours
// là tant que Classinus n'est pas ouvert comme une appli, même après « Je n'arrive pas à l'installer » sur le bouton
// flottant (voir lib/installationWeb.ts). Sur ordinateur, il n'apparaît que si le navigateur propose l'installation.
export function BoutonInstaller() {
  const { plateforme, ouvertCommeAppli } = useInstallationWeb();
  const [evenementOrdinateur, setEvenementOrdinateur] = useState<Event | null>(null);
  const surTelephone = plateforme !== null;

  useEffect(() => {
    // Sur téléphone, la proposition du navigateur est suivie par lib/installationWeb.ts.
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    function gererPrompt(e: Event) {
      e.preventDefault();
      setEvenementOrdinateur(e);
    }
    window.addEventListener("beforeinstallprompt", gererPrompt);
    return () => window.removeEventListener("beforeinstallprompt", gererPrompt);
  }, []);

  if (surTelephone ? ouvertCommeAppli : !evenementOrdinateur) return null;

  async function installer() {
    if (surTelephone) {
      await installerClassinus();
      return;
    }
    if (!evenementOrdinateur) return;
    // @ts-expect-error -- BeforeInstallPromptEvent n'est pas dans le typage TS standard
    await evenementOrdinateur.prompt();
    setEvenementOrdinateur(null);
  }

  return (
    <button
      type="button"
      onClick={() => void installer()}
      aria-label="Télécharger"
      className="flex animate-dj-fade-in-rapide items-center gap-1.5 rounded-cgpt-bouton px-3 py-2 text-sm font-semibold text-dj-texte-muet transition-colors hover:text-dj-texte"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={TRAIT_ICONE_SECTION}>
        <path d="M12 3v13m0 0-4-4m4 4 4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="hidden sm:inline">Télécharger</span>
    </button>
  );
}
