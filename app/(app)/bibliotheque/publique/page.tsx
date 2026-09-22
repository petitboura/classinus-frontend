import { Suspense } from "react";
import { SectionPage } from "@/components/SectionPage";
import { BibliothequePublique } from "@/components/BibliothequePublique";
import { DefinirInfoSection } from "@/components/DefinirInfoSection";
import { groupeBibliotheque } from "@/lib/sectionsBibliotheque";

// 19/09/2026, demande Bourama : ancien onglet Publique de la Bibliothèque,
// devenu une vraie page. Elle affiche BibliothequePublique directement,
// sans passer par EspaceBibliotheque, pour ne pas charger pour rien les
// fichiers perso.
//
// 22/09/2026, correctif build Vercel (échec "useSearchParams() should be
// wrapped in a suspense boundary" sur cette page) : BibliothequePublique
// lit useSearchParams() en interne. <Suspense> requis autour, même
// principe déjà en place pour SectionPageRetourDepuis (voir
// app/(app)/bibliotheque/[id]/page.tsx) -- le fallback ne s'affiche
// jamais en pratique en déploiement web normal (useSearchParams résout
// de façon synchrone, rien à attendre).
export default function PageBibliothequePublique() {
  return (
    <SectionPage title="Publique" groupe={groupeBibliotheque()}>
      <DefinirInfoSection id="bibliotheque-publique" />
      <Suspense fallback={null}>
        <BibliothequePublique />
      </Suspense>
    </SectionPage>
  );
}
