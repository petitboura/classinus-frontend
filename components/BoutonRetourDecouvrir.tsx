"use client";

import { BoutonRetour } from "@/components/BoutonRetour";
import { useDepuisDecouvrir } from "@/lib/depuisDecouvrir";

// Chantier SEO/AEO de Classinus (26/09/2026, retour de Bourama : "ce
// retour là il doit te ramener de là où tu viens de l'appli, pas dans
// le découvrir"). ?depuis= posé par BoutonInfoSection.tsx et reporté de
// page /decouvrir en page /decouvrir par MiseEnPageDecouvrirGroupe, lu
// ici pour construire la vraie destination. Absent (visiteur arrivé
// directement depuis Google, ou depuis la page générale /decouvrir) :
// repli sur l'accueil de l'appli, comme avant ce correctif.
//
// href (vraie navigation), pas onClick/router.back() : router.back()
// recule seulement d'un cran dans les pages /decouvrir déjà visitées,
// pas jusqu'à l'écran d'origine dans l'appli -- exactement le bug
// signalé par Bourama.
//
// À utiliser entouré d'un <Suspense> (useSearchParams l'exige, voir
// app/decouvrir/layout.tsx) avec un repli identique mais href="/" fixe.
export function BoutonRetourDecouvrir() {
  const { depuis } = useDepuisDecouvrir();
  return <BoutonRetour href={depuis ?? "/"} avecTexte />;
}
