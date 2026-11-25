import type { Metadata } from "next";
import { PageAbonnements } from "@/components/abonnements/PageAbonnements";
import { lireConfigListeAttente, type ConfigListeAttente } from "@/lib/listeAttente";
import { RESUME_CLASSINUS } from "@/lib/usagesDecouvrir";

// Page des abonnements : choix d'un palier et bouton Payer. Visible sans compte. Voir
// components/abonnements/PageAbonnements.tsx.
//
// 25/11/2026, demande de Bourama : les robots des moteurs de recherche et des IA n'exécutent pas
// JavaScript. Quand les paliers, le tableau et les textes n'étaient chargés que par le navigateur, ils
// ne recevaient que le squelette de chargement. Le serveur lit maintenant la configuration lui-même et
// l'envoie avec la page, qui est refaite toutes les heures (même rythme que le plan du site, voir
// app/sitemap.ts). Si le serveur ne peut pas la lire, la page marche comme avant : squelette, puis
// chargement par le navigateur. La lecture de la page et celle des métadonnées partagent la même requête.
export const revalidate = 3600;

async function lireConfigServeur(): Promise<ConfigListeAttente | null> {
  try {
    return await lireConfigListeAttente();
  } catch {
    return null;
  }
}

// Titre et description de la page pour les moteurs de recherche, les IA et les aperçus de lien. Ils viennent
// de Supabase (textes_modeles_llm : attente_abo_titre et attente_abo_intro), en français, langue du HTML envoyé
// par le serveur. Sans ces textes, la page garde le titre et la description du site.
export async function generateMetadata(): Promise<Metadata> {
  const config = await lireConfigServeur();
  const titreBrut = config?.textes?.fr?.attente_abo_titre;
  if (!titreBrut) return {};
  const titre = `${titreBrut} | Classinus`;
  const description = config?.textes?.fr?.attente_abo_intro || RESUME_CLASSINUS.description;
  return {
    title: titre,
    description,
    openGraph: { title: titre, description, siteName: "Classinus", locale: "fr_FR", type: "website" },
    twitter: { card: "summary_large_image", title: titre, description },
  };
}

export default async function PageAbonnementsRoute() {
  const config = await lireConfigServeur();
  return <PageAbonnements configInitiale={config} />;
}
