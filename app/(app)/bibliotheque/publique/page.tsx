import type { Metadata } from "next";
import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";
import { groupeBibliotheque } from "@/lib/sectionsBibliotheque";
import { metadonneesBibliothequePublique } from "@/lib/metadonneesOuverture";

// 19/09/2026, demande Bourama : ancien onglet Publique de la Bibliothèque,
// devenu une vraie page. Elle affiche BibliothequePublique directement,
// sans passer par EspaceBibliotheque, pour ne pas charger pour rien les
// fichiers perso.
//
// 22/09/2026 (le <Suspense> vit maintenant dans lib/contenuSections.tsx),
// correctif build Vercel (échec "useSearchParams() should be
// wrapped in a suspense boundary" sur cette page) : BibliothequePublique
// lit useSearchParams() en interne. <Suspense> requis autour, même
// principe déjà en place pour SectionPageRetourDepuis (voir
// app/(app)/bibliotheque/[id]/page.tsx) -- le fallback ne s'affiche
// jamais en pratique en déploiement web normal (useSearchParams résout
// de façon synchrone, rien à attendre).
// 18/10/2026, demande Bourama : un lien de partage (?fichier=ID ou
// ?dossier=ID) ouvre cet écran avec l'aperçu déjà ouvert, voir
// lib/ouvertureParUrl.ts. Le titre et la description de l'aperçu du lien
// partagé viennent de lib/metadonneesOuverture.ts.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  return metadonneesBibliothequePublique(searchParams);
}

export default function PageBibliothequePublique() {
  const cle = ROUTES_BIBLIOTHEQUE.publique;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupeBibliotheque()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
