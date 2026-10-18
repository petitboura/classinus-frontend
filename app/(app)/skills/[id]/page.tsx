import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { PARAMETRES_OUVERTURE, adresseOuvertureSkillPublic } from "@/lib/ouvertureParUrl";
import { metadonneesSkillsPublics } from "@/lib/metadonneesOuverture";

// 18/10/2026, demande Bourama : les liens de partage des éléments publics
// n'ouvrent plus une page dédiée, ils ouvrent l'appli sur l'aperçu de
// l'élément (voir lib/ouvertureParUrl.ts). Cette ancienne adresse n'existe
// plus que pour que les liens déjà partagés (messages, favoris, moteurs de
// recherche) continuent de marcher : elle renvoie, de façon permanente, vers
// la nouvelle adresse du skill. Le titre et la description de l'aperçu du
// lien viennent de lib/metadonneesOuverture.ts, ici comme sur l'écran d'arrivée.
//
// generateStaticParams renvoie un id factice ("placeholder") : requis par
// Next.js pour une route dynamique sous `output: "export"` (build:capacitor),
// un tableau vide déclenchant un bug connu (vercel/next.js#61213 et #71862).
// L'id factice n'est jamais atteint pour de vrai, et ne redirige nulle part.
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

// Les robots d'aperçu de lien (WhatsApp, etc.) ne suivent pas la redirection :
// sans ceci, un lien déjà partagé afficherait le titre générique de l'appli
// au lieu du titre et de la description de l'élément, comme avant.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (params.id === "placeholder") return {};
  return metadonneesSkillsPublics({ [PARAMETRES_OUVERTURE.skill]: params.id });
}

export default function PageAncienLienSkillPublic({ params }: { params: { id: string } }) {
  if (params.id === "placeholder") return null;
  permanentRedirect(adresseOuvertureSkillPublic(params.id));
}
