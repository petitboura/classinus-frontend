import { permanentRedirect } from "next/navigation";
import { adresseOuvertureFichierPublic } from "@/lib/ouvertureParUrl";

// 18/10/2026, demande Bourama : les liens de partage des éléments publics
// n'ouvrent plus une page dédiée, ils ouvrent l'appli sur l'aperçu de
// l'élément (voir lib/ouvertureParUrl.ts). Cette ancienne adresse n'existe
// plus que pour que les liens déjà partagés (messages, favoris, moteurs de
// recherche) continuent de marcher : elle renvoie, de façon permanente, vers
// la nouvelle adresse du fichier. Le titre et la description de l'aperçu du
// lien viennent désormais de l'écran d'arrivée (lib/metadonneesOuverture.ts).
//
// generateStaticParams renvoie un id factice ("placeholder") : requis par
// Next.js pour une route dynamique sous `output: "export"` (build:capacitor),
// un tableau vide déclenchant un bug connu (vercel/next.js#61213 et #71862).
// L'id factice n'est jamais atteint pour de vrai, et ne redirige nulle part.
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function PageAncienLienFichierPublic({ params }: { params: { id: string } }) {
  if (params.id === "placeholder") return null;
  permanentRedirect(adresseOuvertureFichierPublic(params.id));
}
