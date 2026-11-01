"use client";

import { BoutonRetour } from "./BoutonRetour";
import { BoutonInfoSection } from "./BoutonInfoSection";
import { useEnTeteApp } from "@/lib/contexteEnTete";
import { trouverRubriqueAide } from "@/lib/aideSections";

// Les 3 bandes du haut (titre + rangée1 + rangée2) vivent AU-DESSUS du
// contenu qui défile, comme tes boutons notif/minuteur/découvrir.
// Elles ne bougent jamais, seule la zone main en dessous défile.
export function EnTeteApp() {
  const { titre, retour, infoId, barreSousSections } = useEnTeteApp();
  if (!titre && !barreSousSections) return null;
  const rubrique = infoId ? trouverRubriqueAide(infoId) : undefined;
  // Rangée 1 = navigation entre pages soeurs (ex: Perso/Publique/Téléphone)
  // Téléphone : indispensable (pas de rail) -> on l'affiche en haut
  // Ordi : le rail à gauche fait déjà le job -> on ne la duplique pas en haut
  // Sur ordi on a déjà le rail à gauche (md:flex) donc on ne duplique JAMAIS la rangée 1 en haut.
  // On la montre uniquement sur téléphone via CSS md:hidden, pas via Electron check.
  const showSous = !!barreSousSections;
  return (
    <div className="flex shrink-0 flex-col bg-dj-fond">
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
        <div className="flex shrink-0 items-center bg-dj-fond px-4 py-2 md:hidden">
          {barreSousSections}
        </div>
      )}
    </div>
  );
}
