import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { obtenirEntreeBibliothequePublique } from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";
import { PARAMETRES_OUVERTURE, adresseOuvertureFichierPublic } from "@/lib/ouvertureParUrl";
import { metadonneesBibliothequePublique } from "@/lib/metadonneesOuverture";
import { PagePubliqueFichier } from "@/components/PagePubliqueBibliotheque";

// 25/11/2026, demande de Bourama ("option 2") : cette adresse redevient une vraie page publique, rendue côté
// serveur (nom, description, contenu, bouton "Ouvrir dans Classinus"), au lieu de la redirection immédiate du
// 18/10/2026. Un moteur de recherche ou une IA lit la page ; une personne clique sur le bouton pour entrer dans
// l'appli (aperçu ouvert par lib/ouvertureParUrl.ts). Si l'API ne répond pas, on garde l'ancien comportement
// (renvoi vers l'appli) plutôt que d'afficher une page vide.
//
// generateStaticParams renvoie un id factice ("placeholder") : requis par Next.js pour une route dynamique sous
// `output: "export"` (build:capacitor), un tableau vide déclenchant un bug connu (vercel/next.js#61213 et #71862).
// L'id factice n'est jamais atteint pour de vrai : aucun appel réseau n'est fait pour lui.
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (params.id === "placeholder") return {};
  const base = await metadonneesBibliothequePublique({ [PARAMETRES_OUVERTURE.fichier]: params.id });
  return { ...base, alternates: { canonical: `/bibliotheque/${params.id}` } };
}

export default async function PageFichierPublic({ params }: { params: { id: string } }) {
  if (params.id === "placeholder") return null;
  try {
    const entree = await obtenirEntreeBibliothequePublique(params.id);
    return <PagePubliqueFichier entree={entree} />;
  } catch (e) {
    if (e instanceof ErreurApi && e.statusCode === 404) notFound();
    redirect(adresseOuvertureFichierPublic(params.id));
  }
}
