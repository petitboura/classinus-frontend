import type { Metadata } from "next";
import { SectionPage } from "@/components/SectionPage";
import { contenuSection, titreSection } from "@/lib/contenuSections";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { groupePersonnaliser } from "@/lib/sectionsPersonnaliser";
import { metadonneesSkillsPublics } from "@/lib/metadonneesOuverture";

// 19/09/2026, demande Bourama : ancien onglet "Public" de Mes skills,
// devenu une vraie page.
// 18/10/2026, demande Bourama : un lien de partage (?skill=ID) ouvre cet
// écran avec l'aperçu du skill déjà ouvert, voir lib/ouvertureParUrl.ts.
// Le titre et la description de l'aperçu du lien partagé viennent de
// lib/metadonneesOuverture.ts.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<Metadata> {
  return metadonneesSkillsPublics(searchParams);
}

export default function PageSkillsPublics() {
  const cle = ROUTES_PERSONNALISER.skillsPublics;
  return (
    <SectionPage title={titreSection(cle)} groupe={groupePersonnaliser()}>
      {contenuSection(cle)}
    </SectionPage>
  );
}
