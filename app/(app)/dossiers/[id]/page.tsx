import type { Metadata } from "next";
import Link from "next/link";
import { Folder, FileText, Link as IconLien } from "lucide-react";
import { SectionPage } from "@/components/SectionPage";
import { ActionsDossierPublic } from "@/components/ActionsDossierPublic";
import { SectionCommentairesCatalogue } from "@/components/SectionCommentairesCatalogue";
import { StatistiquesContenuDossier } from "@/components/StatistiquesContenuDossier";
import { obtenirDossierCataloguePublic, listerBibliothequePublique } from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";
import { ROUTES_BIBLIOTHEQUE } from "@/lib/routesBibliotheque";

// Chantier "Classinus ouvert" (10/09/2026, Lot E) : même principe que les
// lots précédents. Server Component pour generateMetadata + premier
// rendu HTML non vide.
//
// generateStaticParams renvoie un id factice ("placeholder"), jamais un
// tableau vide : même raisonnement que les autres routes dynamiques de
// ce chantier (voir app/(app)/bibliotheque/[id]/page.tsx -- bug Next.js
// vercel/next.js#61213 et #71862, un tableau vide fait échouer le
// build:capacitor).
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

async function chargerDossier(id: string) {
  // Voir chargerEntree dans app/(app)/bibliotheque/[id]/page.tsx : même
  // raisonnement, l'id "placeholder" ne doit jamais taper le backend.
  if (id === "placeholder") return null;
  try {
    return await obtenirDossierCataloguePublic(id);
  } catch (e) {
    if (e instanceof ErreurApi && e.statusCode === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const dossier = await chargerDossier(params.id);
  if (!dossier) {
    return { title: "Dossier introuvable · Bibliothèque Classinus" };
  }
  return {
    title: `${dossier.nom} · Bibliothèque Classinus`,
    description: dossier.description || `Dossier de la bibliothèque publique Classinus : ${dossier.nom}.`,
    openGraph: {
      title: dossier.nom,
      description: dossier.description || undefined,
      type: "article",
    },
  };
}

export default async function PageDossierCataloguePublic({ params }: { params: { id: string } }) {
  const dossier = await chargerDossier(params.id);

  if (!dossier) {
    return (
      <SectionPage title="Dossier introuvable" retour={ROUTES_BIBLIOTHEQUE.publique}>
        <p className="rounded-xl border border-dashed border-dj-bordure px-3 py-4 text-center text-xs text-dj-texte-muet">
          Ce dossier est introuvable sur la bibliothèque publique.
        </p>
      </SectionPage>
    );
  }

  // La liste des fichiers réutilise l'endpoint déjà public du Lot A
  // (GET /api/bibliotheque-publique?dossier_id=...) -- aucune nouvelle
  // route nécessaire pour ça, best-effort si l'appel échoue (mieux vaut
  // afficher le dossier sans son contenu qu'une page en erreur).
  let entrees: Awaited<ReturnType<typeof listerBibliothequePublique>> = [];
  try {
    entrees = await listerBibliothequePublique(undefined, { dossierId: dossier.id, limite: 100 });
  } catch {
    entrees = [];
  }

  return (
    <SectionPage title={dossier.nom} retour={dossier.dossier_parent_id ? `/dossiers/${dossier.dossier_parent_id}` : ROUTES_BIBLIOTHEQUE.publique}>
      <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5">
        <div className="flex items-center gap-2">
          <Folder size={18} className="flex-shrink-0 text-dj-accent-1" />
          <h2 className="font-display text-base font-semibold text-dj-texte">{dossier.nom}</h2>
        </div>
        {dossier.description && <p className="mt-2 text-sm text-dj-texte-muet">{dossier.description}</p>}

        <div className="mt-4">
          <ActionsDossierPublic dossierId={dossier.id} nom={dossier.nom} />
        </div>
      </section>

      {dossier.contenu && (
        <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5">
          <StatistiquesContenuDossier contenu={dossier.contenu} />
        </section>
      )}

      {dossier.sous_dossiers.length > 0 && (
        <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <ul className="divide-y divide-dj-bordure">
            {dossier.sous_dossiers.map((sousDossier) => (
              <li key={sousDossier.id}>
                <Link
                  href={`/dossiers/${sousDossier.id}`}
                  className="flex items-center gap-2.5 px-5 py-3 transition-colors duration-200 ease-cgpt-doux hover:bg-dj-surface-haute"
                >
                  <Folder size={16} className="flex-shrink-0 text-dj-accent-1" />
                  <p className="min-w-0 truncate text-sm text-dj-texte">{sousDossier.nom}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(entrees.length > 0 || dossier.sous_dossiers.length === 0) && (
        <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          {entrees.length === 0 ? (
            <p className="px-5 py-4 text-center text-xs text-dj-texte-muet">Ce dossier est vide pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-dj-bordure">
              {/* 18/09/2026, correctif Bourama (bouton retour d'un fichier
                 partagé qui ramenait toujours à la bibliothèque de l'appli
                 au lieu du dossier parcouru pour y arriver) : ?depuis=
                 transporte ce dossier jusqu'à la page du fichier, voir
                 app/(app)/bibliotheque/[id]/page.tsx. Un fichier public
                 peut appartenir à plusieurs dossiers à la fois (table de
                 liaison côté backend), donc pas de "dossier parent" unique
                 en base : on suit le chemin réel parcouru plutôt qu'une
                 règle fixe. */}
              {entrees.map((entree) => (
                <li key={entree.id}>
                  <Link
                    href={`/bibliotheque/${entree.id}?depuis=${dossier.id}`}
                    className="flex items-center gap-2.5 px-5 py-3 transition-colors duration-200 ease-cgpt-doux hover:bg-dj-surface-haute"
                  >
                    {entree.type_mime === "text/uri-list" ? (
                      <IconLien size={16} className="flex-shrink-0 text-dj-texte-muet" />
                    ) : (
                      <FileText size={16} className="flex-shrink-0 text-dj-texte-muet" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-dj-texte">{entree.nom}</p>
                      {entree.description && (
                        <p className="truncate text-xs text-dj-texte-muet">{entree.description}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <SectionCommentairesCatalogue typeElement="dossier" elementId={dossier.id} />
    </SectionPage>
  );
}
