"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Folder, FileText, Link as IconLien } from "lucide-react";
import { SectionPage } from "@/components/SectionPage";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { ButtonPartager, lienPartage } from "@/components/ButtonPartager";
import { Skeleton } from "@/components/Skeleton";
import { obtenirDossierBibliothequeConsultation, type DossierBibliothequeConsultation } from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";

/**
 * 11/09/2026, demande Bourama : lien de partage direct pour un dossier
 * PERSO (et ses sous-dossiers), lecture seule, même affichage que la
 * version publique (app/(app)/dossiers/[id]/page.tsx), compte
 * obligatoire pour consulter. Aucune action automatique.
 *
 * Extrait en composant client séparé de sa page, même raisonnement que
 * ConsultationFichierBibliothequePerso.tsx (contrainte generateStaticParams
 * / build:capacitor).
 *
 * 13/09/2026, demande Bourama : les sous-dossiers ne remontaient pas
 * dans ce lien de partage (seulement les fichiers directs). Ajout de
 * la section sous-dossiers, cliquable vers la même route récursivement.
 */
// 16/09/2026, demande Bourama ("les pages si tu ouvres un lien de partage
// n'ont aucun CTA") : un lien perso reste en lecture seule (aucune action
// automatique, décision du 11/09 inchangée), donc pas d'ajout auto ici,
// mais la page n'offrait rien du tout pour continuer, pas même de quoi
// repasser le lien à quelqu'un d'autre. Le bouton Partager commun
// (ButtonPartager) est ajouté, comme sur les pages publiques.
export function ConsultationDossierBibliothequePerso({ id }: { id: string }) {
  const [dossier, setDossier] = useState<DossierBibliothequeConsultation | null | undefined>(undefined);
  const [sansCompte, setSansCompte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (id === "placeholder") {
      setDossier(null);
      return;
    }
    obtenirDossierBibliothequeConsultation(id)
      .then(setDossier)
      .catch((e) => {
        if (e instanceof ErreurApi && e.statusCode === 401) {
          setSansCompte(true);
        } else if (e instanceof ErreurApi && e.statusCode === 404) {
          setDossier(null);
        } else {
          setErreur(messageErreur(e));
        }
      });
  }, [id]);

  if (sansCompte) {
    return (
      <SectionPage title="Dossier partagé" retour="/bibliotheque">
        <CTACompteRequis texte="Crée un compte pour consulter ce dossier." />
      </SectionPage>
    );
  }

  if (erreur) {
    return (
      <SectionPage title="Dossier partagé" retour="/bibliotheque">
        <p className="rounded-xl border border-dashed border-dj-bordure px-3 py-4 text-center text-xs text-dj-texte-muet">{erreur}</p>
      </SectionPage>
    );
  }

  if (dossier === undefined) {
    return (
      <SectionPage title="Dossier partagé" retour="/bibliotheque">
        <Skeleton className="h-16 w-full rounded-cgpt-carte" />
        <Skeleton className="h-32 w-full rounded-cgpt-carte" />
      </SectionPage>
    );
  }

  if (dossier === null) {
    return (
      <SectionPage title="Dossier introuvable" retour="/bibliotheque">
        <p className="rounded-xl border border-dashed border-dj-bordure px-3 py-4 text-center text-xs text-dj-texte-muet">
          Ce dossier est introuvable, ou a été supprimé par son propriétaire.
        </p>
      </SectionPage>
    );
  }

  return (
    <SectionPage title={dossier.nom} retour="/bibliotheque">
      <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Folder size={18} className="flex-shrink-0 text-dj-accent-1" />
            <h2 className="font-display text-base font-semibold text-dj-texte">{dossier.nom}</h2>
          </div>
          <ButtonPartager lien={lienPartage("dossier-perso", dossier.id)} titre={dossier.nom} />
        </div>
      </section>

      {dossier.sous_dossiers.length > 0 && (
        <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <ul className="divide-y divide-dj-bordure">
            {dossier.sous_dossiers.map((sousDossier) => (
              <li key={sousDossier.id}>
                <Link
                  href={`/dossiers/perso/${sousDossier.id}`}
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

      {(dossier.fichiers.length > 0 || dossier.sous_dossiers.length === 0) && (
        <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          {dossier.fichiers.length === 0 ? (
            <p className="px-5 py-4 text-center text-xs text-dj-texte-muet">Ce dossier est vide pour l'instant.</p>
          ) : (
            <ul className="divide-y divide-dj-bordure">
              {dossier.fichiers.map((fichier) => (
                <li key={fichier.id}>
                  <Link
                    href={`/bibliotheque/perso/${fichier.id}`}
                    className="flex items-center gap-2.5 px-5 py-3 transition-colors duration-200 ease-cgpt-doux hover:bg-dj-surface-haute"
                  >
                    {fichier.type_mime === "text/uri-list" ? (
                      <IconLien size={16} className="flex-shrink-0 text-dj-texte-muet" />
                    ) : (
                      <FileText size={16} className="flex-shrink-0 text-dj-texte-muet" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm text-dj-texte">{fichier.nom_fichier}</p>
                      {fichier.description && (
                        <p className="truncate text-xs text-dj-texte-muet">{fichier.description}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </SectionPage>
  );
}
