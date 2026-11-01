"use client";

import { BoutonRetour } from "./BoutonRetour";
import { BoutonInfoSection } from "./BoutonInfoSection";
import { useEnTeteApp } from "@/lib/contexteEnTete";
import { trouverRubriqueAide } from "@/lib/aideSections";
import { useSurAppliPc } from "@/lib/useSurAppliPc";

// Les 3 bandes du haut (titre + rangée1 + rangée2) vivent AU-DESSUS du
// contenu qui défile, comme tes boutons notif/minuteur/découvrir.
// Elles ne bougent jamais, seule la zone main en dessous défile.
export function EnTeteApp() {
  const { titre, retour, infoId, barreSousSections, barreSousSousSections } = useEnTeteApp();
  const surAppliPc = useSurAppliPc();
  if (!titre && !barreSousSections && !barreSousSousSections) return null;
  const rubrique = infoId ? trouverRubriqueAide(infoId) : undefined;
  // Rangée 1 = navigation entre pages soeurs (ex: Perso/Publique/Téléphone)
  // Téléphone : indispensable (pas de rail) -> on l'affiche en haut
  // Ordi : le rail à gauche fait déjà le job -> on ne la duplique pas en haut
  const showSous = !!barreSousSections && !surAppliPc;
  // Rangée 2 = filtres internes (Origine+Filtre, Mon Programme/Public, Type/Style)
  // Elle doit rester visible partout, mais sur ordi elle ne doit pas s'étaler
  // pleine largeur au-dessus du rail gauche sinon doublon visuel "à droite et en haut"
  // On la centre comme le contenu (max-w-5xl) pour qu'elle s'aligne avec la colonne droite
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
        <div className="flex shrink-0 justify-center border-t border-dj-bordure bg-dj-fond">
          <div className="flex w-full max-w-5xl items-center px-4 py-2 md:pl-[calc(12rem+1.5rem)]">
            {barreSousSousSections}
          </div>
        </div>
      )}
    </div>
  );
}
