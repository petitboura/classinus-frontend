import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { obtenirDossierCataloguePublic, listerBibliothequePublique } from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";
import { PARAMETRES_OUVERTURE, adresseOuvertureDossierPublic } from "@/lib/ouvertureParUrl";
import { metadonneesBibliothequePublique } from "@/lib/metadonneesOuverture";
import { PagePubliqueDossier } from "@/components/PagePubliqueBibliotheque";

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
  const base = await metadonneesBibliothequePublique({ [PARAMETRES_OUVERTURE.dossier]: params.id });
  return { ...base, alternates: { canonical: `/dossiers/${params.id}` } };
}

export default async function PageDossierPublic({ params }: { params: { id: string } }) {
  if (params.id === "placeholder") return null;
  try {
    const dossier = await obtenirDossierCataloguePublic(params.id);
    // Les 100 premiers fichiers suffisent pour la page ; la liste complète est dans l'appli.
    const fichiers = await listerBibliothequePublique(undefined, { dossierId: params.id, limite: 100 }).catch(() => []);
    return <PagePubliqueDossier dossier={dossier} fichiers={fichiers} />;
  } catch (e) {
    if (e instanceof ErreurApi && e.statusCode === 404) notFound();
    redirect(adresseOuvertureDossierPublic(params.id));
  }
}
