"use client";

import { Download } from "lucide-react";
import { useDeplacable } from "@/lib/useDeplacable";
import { installerClassinus, useInstallationWeb } from "@/lib/installationWeb";

// Créé le 29/08/2026, mission Bourama. Monté une fois dans app/layout.tsx, donc visible sur toutes les pages du
// site dès l'arrivée, public ET appli connectée.
//
// Depuis le 25/11/2026 (demande de Bourama) : l'appli APK est abandonnée, le bouton installe Classinus depuis le
// navigateur (PWA), sur Android et sur iPhone, au lieu d'envoyer vers /telecharger. Il reste caché sur ordinateur,
// dans une appli native, quand Classinus est déjà installé, et après « Je n'arrive pas à l'installer »
// (voir lib/installationWeb.ts).
//
// Le bouton reste déplaçable (voir lib/useDeplacable.ts), position mémorisée via la clé de stockage ci-dessous.
const CLE_POSITION = "clovis-telecharger-apk-position";

export function BoutonFlottantTelecharger() {
  const { plateforme, ouvertCommeAppli, dejaInstalle, boutonMasque } = useInstallationWeb();

  if (!plateforme || ouvertCommeAppli || dejaInstalle || boutonMasque) return null;

  return <BoutonDeplacable />;
}

// Composant à part : la position mémorisée n'est lue qu'une fois le bouton affiché, dans le navigateur.
function BoutonDeplacable() {
  const deplacement = useDeplacable<HTMLDivElement>(CLE_POSITION);

  return (
    <div
      ref={deplacement.ref}
      style={deplacement.style}
      {...deplacement.poignee}
      className="fixed bottom-[calc(1.25rem+var(--dj-barre-onglets-web,0px))] left-5 z-40 flex touch-none select-none animate-dj-fade-in-rapide cursor-grab items-center will-change-transform rounded-cgpt-bouton border border-dj-bordure bg-dj-surface shadow-[0_4px_20px_rgba(0,0,0,0.35)] active:cursor-grabbing"
    >
      <button
        type="button"
        onClick={() => void installerClassinus()}
        className="flex items-center gap-2 rounded-cgpt-bouton bg-dj-accent-1 px-3 py-1.5 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2"
      >
        <Download size={16} />
        Télécharger l&apos;appli
      </button>
    </div>
  );
}
