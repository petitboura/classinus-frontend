import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText, Link as IconLien } from "lucide-react";
import { SectionPage } from "@/components/SectionPage";
import { SectionPageRetourDepuis } from "@/components/SectionPageRetourDepuis";
import { ActionsFichierPublic } from "@/components/ActionsFichierPublic";
import { SectionCommentairesCatalogue } from "@/components/SectionCommentairesCatalogue";
import { VisionneurPdf } from "@/components/VisionneurPdf";
import { LinkPreview } from "@/components/chat/LinkPreview";
import { TexteAvecLiens } from "@/components/TexteAvecLiens";
import { obtenirEntreeBibliothequePublique, type EntreeBibliothequePublique } from "@/lib/api";
import { ErreurApi } from "@/lib/erreurs";

// Chantier "Clovis ouvert" (10/09/2026, demande Bourama : chaque PDF de
// la bibliothèque publique retrouvable par son nom, indexable par
// Google, et téléchargeable via un lien propre -- jusqu'ici cette
// entrée n'existait que dans la liste côté client, aucune URL dédiée).
//
// Server Component volontairement (pas "use client") : c'est ce qui
// permet generateMetadata (titre/description lus par Google et les
// aperçus de lien partagés) et un premier rendu HTML non vide pour les
// robots d'indexation -- une page purement client ne leur montre rien.
//
// `generateStaticParams` retourne un id factice ("placeholder"), jamais
// un tableau vide : requis par Next.js dès qu'une route dynamique existe
// sous `output: "export"` (voir next.config.mjs, build:capacitor), MAIS
// un tableau vide déclenche un bug connu et toujours ouvert de Next.js
// (Page "..." is missing "generateStaticParams()" alors qu'elle existe
// bel et bien -- vercel/next.js#61213 et #71862, constaté le 11/09/2026
// sur ce dépôt). Le paramètre factice n'est jamais réellement atteint :
// l'app native affiche déjà ces fichiers via EspaceBibliotheque.tsx,
// jamais par cette URL. Le déploiement web normal (Vercel, sans
// CAPACITOR_BUILD) reste, lui, dynamique par requête comme n'importe
// quelle autre route Next : cette page continue de fonctionner pour
// n'importe quel id, y compris ceux publiés après le build.
//
// NOTE POUR BOURAMA : `app/(app)/etablissements/[id]/page.tsx` est déjà
// une route dynamique existante mais n'a ni `generateStaticParams` ni
// `generateMetadata` -- à vérifier si le build `build:capacitor` passe
// bien pour elle aujourd'hui (pas touché ici, hors périmètre du lot en
// cours, je le signale seulement).
export async function generateStaticParams() {
  return [{ id: "placeholder" }];
}

async function chargerEntree(id: string): Promise<EntreeBibliothequePublique | null> {
  // L'id "placeholder" (voir generateStaticParams ci-dessus) n'existe
  // jamais réellement côté backend -- ne pas l'appeler du tout : le
  // backend renvoie une 500 (pas une 404 propre) sur un id hors format
  // UUID, ce qui ferait planter tout l'export statique. Constaté le
  // 11/09/2026 sur ce dépôt.
  if (id === "placeholder") return null;
  try {
    return await obtenirEntreeBibliothequePublique(id);
  } catch (e) {
    if (e instanceof ErreurApi && e.statusCode === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const entree = await chargerEntree(params.id);
  if (!entree) {
    return { title: "Document introuvable · Bibliothèque Clovis" };
  }
  return {
    title: `${entree.nom} · Bibliothèque Clovis`,
    description: entree.description || `Document partagé sur la bibliothèque publique de Clovis : ${entree.nom}.`,
    openGraph: {
      title: entree.nom,
      description: entree.description || undefined,
      type: "article",
    },
  };
}

function Etiquette({ valeur }: { valeur: string | null | undefined }) {
  if (!valeur) return null;
  return (
    <span className="rounded-full border border-dj-bordure bg-dj-surface-haute px-2.5 py-1 text-xs text-dj-texte-muet">
      {valeur}
    </span>
  );
}

// 15/09/2026, demande Bourama : un fichier peut désormais avoir
// plusieurs valeurs par filtre (colonnes passées en tableau côté
// Supabase), donc une étiquette par valeur au lieu d'une seule.
function Etiquettes({ valeurs }: { valeurs: string[] | null | undefined }) {
  if (!valeurs || valeurs.length === 0) return null;
  return (
    <>
      {valeurs.map((v) => (
        <Etiquette key={v} valeur={v} />
      ))}
    </>
  );
}

export default async function PageEntreeBibliothequePublique({ params }: { params: { id: string } }) {
  const entree = await chargerEntree(params.id);

  // 18/09/2026, correctif Bourama (bouton retour d'un fichier partagé qui
  // ramenait toujours à la bibliothèque de l'appli au lieu du dossier
  // parcouru pour y arriver) : le calcul du retour (lecture de ?depuis=)
  // se fait dans SectionPageRetourDepuis (client, useSearchParams), pas
  // ici -- lire searchParams directement dans ce Server Component casse
  // le build export statique mobile (build:capacitor), vérifié le jour
  // même. <Suspense> requis autour : c'est la façon documentée par
  // Next.js de garder l'export statique valide malgré useSearchParams ;
  // le fallback ne s'affiche jamais en pratique en déploiement web normal
  // (useSearchParams résout de façon synchrone, rien à attendre), il ne
  // sert qu'à la génération de la page statique factice "placeholder" que
  // l'appli native n'ouvre jamais (voir generateStaticParams ci-dessus).
  if (!entree) {
    const messageIntrouvable = (
      <p className="rounded-xl border border-dashed border-dj-bordure px-3 py-4 text-center text-xs text-dj-texte-muet">
        Ce document est introuvable, ou n'est plus publié sur la bibliothèque publique.
      </p>
    );
    return (
      <Suspense fallback={<SectionPage title="Document introuvable" retour="/bibliotheque">{messageIntrouvable}</SectionPage>}>
        <SectionPageRetourDepuis title="Document introuvable" routeParDefaut="/bibliotheque">
          {messageIntrouvable}
        </SectionPageRetourDepuis>
      </Suspense>
    );
  }

  const estPdf = entree.type_mime === "application/pdf";
  // 17/09/2026, demande Bourama : un lien partagé (seul ou via un
  // dossier) s'affichait comme un fichier générique sur cette page --
  // icône fichier, aucun aperçu, bouton "Télécharger" pointant sur
  // l'URL du site comme si c'était un fichier. Même détection que
  // VisionneuseBibliotheque.tsx (viewer interne, jamais eu ce bug).
  const estLien = entree.type_mime === "text/uri-list";

  // Contenu identique dans les deux branches ci-dessous (fallback à
  // retour par défaut pendant la génération statique factice, rendu réel
  // à retour dynamique une fois useSearchParams résolu) -- voir le
  // commentaire plus haut sur pourquoi ce calcul passe par un Suspense.
  const contenu = (
    <>
      <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {estLien ? (
              <IconLien size={18} className="flex-shrink-0 text-dj-accent-1" />
            ) : (
              <FileText size={18} className="flex-shrink-0 text-dj-accent-1" />
            )}
            <h2 className="font-display text-base font-semibold text-dj-texte">{entree.nom}</h2>
          </div>
        </div>

        {entree.description && <TexteAvecLiens texte={entree.description} className="mt-2 text-sm text-dj-texte-muet" />}

        {estLien && entree.url_publique && (
          <div className="mt-3">
            <LinkPreview href={entree.url_publique} texteLien={entree.nom} />
          </div>
        )}

        <div className="mt-4">
          <ActionsFichierPublic
            entreeId={entree.id}
            nom={entree.nom}
            urlPublique={entree.url_publique}
            nomFichier={entree.nom_fichier}
            estLien={estLien}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Etiquettes valeurs={entree.pays} />
          <Etiquettes valeurs={entree.niveau} />
          <Etiquettes valeurs={entree.categorie} />
          <Etiquettes valeurs={entree.classe} />
          <Etiquettes valeurs={entree.specialite} />
        </div>
      </section>

      {estPdf && entree.url_publique && (
        <section className="h-[70vh] overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <VisionneurPdf url={entree.url_publique} />
        </section>
      )}

      <SectionCommentairesCatalogue typeElement="fichier" elementId={entree.id} />
    </>
  );

  return (
    <Suspense fallback={<SectionPage title={entree.nom} retour="/bibliotheque">{contenu}</SectionPage>}>
      <SectionPageRetourDepuis title={entree.nom} routeParDefaut="/bibliotheque">
        {contenu}
      </SectionPageRetourDepuis>
    </Suspense>
  );
}
