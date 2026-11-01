"use client";

import { BoutonRetour } from "./BoutonRetour";
import { BoutonInfoSection } from "./BoutonInfoSection";
import { useEnTeteApp } from "@/lib/contexteEnTete";
import { trouverRubriqueAide } from "@/lib/aideSections";
import { useSurAppliPc } from "@/lib/useSurAppliPc";

// Les 3 barres du haut (titre + sous-sections + sous-sous-sections) vivent
// AU-DESSUS du contenu qui défile, comme tes boutons notif/minuteur/découvrir
// qui sont en fixed. Elles ne bougent jamais, seule la zone main en dessous défile.
// Sur ordi les 2 rangées d'onglets gardent leur fond plein pour rester visibles
// en haut de la colonne centrale (le rail gauche est à part).
export function EnTeteApp() {
  const { titre, retour, infoId, barreSousSections, barreSousSousSections } = useEnTeteApp();
  const surAppliPc = useSurAppliPc();
  if (!titre && !barreSousSections && !barreSousSousSections) return null;
  const rubrique = infoId ? trouverRubriqueAide(infoId) : undefined;
  // Sur téléphone les barres d'onglets sont indispensables (pas de rail latéral)
  // Sur ordi le rail latéral couvre la navigation principale, mais les sous-sous-sections
  // (ex: Origine+Filtre dans Bibliothèque) doivent rester visibles en tête de colonne
  const showSous = !!barreSousSections && !surAppliPc;
  const showSousSous = !!barreSousSousSections;
  return (
    <div className="flex shrink-0 flex-col border-b border-dj-bordure bg-dj-fond">
      {titre && (
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
      )}
      {showSous && (
        <div className="flex shrink-0 items-center bg-dj-fond px-4 py-2">
          {barreSousSections}
        </div>
      )}
      {showSousSous && (
        <div className="flex shrink-0 items-center border-t border-dj-bordure bg-dj-fond px-4 py-2">
          {barreSousSousSections}
        </div>
      )}
    </div>
  );
}
