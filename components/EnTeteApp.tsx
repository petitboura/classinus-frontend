"use client";

import { BoutonRetour } from "./BoutonRetour";
import { BoutonInfoSection } from "./BoutonInfoSection";
import { useEnTeteApp } from "@/lib/contexteEnTete";
import { trouverRubriqueAide } from "@/lib/aideSections";

// Barre du haut : comme tes boutons notif/minuteur/découvrir.
// Elle ne défile jamais, seule la page en dessous défile.
export function EnTeteApp() {
  const { titre, retour, infoId } = useEnTeteApp();
  if (!titre) return null;
  const rubrique = infoId ? trouverRubriqueAide(infoId) : undefined;
  return (
    <div className="flex shrink-0 flex-col bg-dj-fond">
      <header className="flex h-[calc(2.5rem_+_var(--safe-top,0px))] shrink-0 items-center gap-1.5 px-4 pb-1 pt-[calc(0.5rem_+_var(--safe-top,0px))] pl-8 pr-20 md:pl-4">
        {retour && <BoutonRetour href={retour} padding="p-1" className="-ml-1" />}
        <h1 className="truncate font-display text-xl font-bold text-dj-texte">{titre}</h1>
        {rubrique && (
          <BoutonInfoSection
            rubriqueId={rubrique.id}
            texteCourt={rubrique.texteCourt}
            hrefEnSavoirPlus={rubrique.lienDecouvrir}
          />
        )}
      </header>
    </div>
  );
}
