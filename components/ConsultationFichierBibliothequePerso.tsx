"use client";

import { useEffect, useState } from "react";
import { ExternalLink, FileText, Link as IconLien } from "lucide-react";
import { BoutonTelechargerFichier } from "@/components/BoutonTelechargerFichier";
import { SectionPage } from "@/components/SectionPage";
import { VisionneurPdf } from "@/components/VisionneurPdf";
import { LinkPreview } from "@/components/chat/LinkPreview";
import { ButtonPartager, lienPartage } from "@/components/ButtonPartager";
import { BoutonAvecIA } from "@/components/BoutonAvecIA";
import { SuggestionCompte } from "@/components/SuggestionCompte";
import { TexteAvecLiens } from "@/components/TexteAvecLiens";
import { Skeleton } from "@/components/Skeleton";
import { obtenirFichierBibliothequeConsultation, type FichierBibliothequeConsultation } from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";

/**
 * 11/09/2026, demande Bourama : lien de partage direct pour un fichier
 * PERSO, lecture seule, même affichage que la version publique
 * (app/(app)/bibliotheque/[id]/page.tsx). Aucune action automatique :
 * n'ajoute rien chez qui consulte.
 *
 * 17/09/2026, changement d'avis de Bourama : compte non obligatoire pour
 * consulter (l'ancien blocage dur via CTACompteRequis contredisait la
 * demande initiale, mal comprise comme "obligation" -- voir
 * api/bibliotheque_utilisateur.py::consulter côté backend, passé à
 * utilisateur_optionnel). Même traitement que la bibliothèque publique :
 * le document reste visible sans compte, seule une SuggestionCompte
 * discrète (fermable) invite à s'inscrire.
 *
 * Extrait en composant client séparé de sa page (voir
 * app/(app)/bibliotheque/perso/[id]/page.tsx) : sous build:capacitor
 * (output: "export"), generateStaticParams ne peut être exporté que
 * depuis un Server Component, jamais depuis un fichier "use client"
 * (même contrainte que app/(app)/bibliotheque/[id]/page.tsx, corrigée
 * le 11/09/2026 sur ce dépôt pour l'id "placeholder").
 */
// 16/09/2026, demande Bourama ("les pages si tu ouvres un lien de partage
// n'ont aucun CTA") : un lien perso reste en lecture seule (aucune action
// automatique, décision du 11/09 inchangée), donc pas d'ajout auto ici,
// mais la page n'offrait rien du tout pour continuer, pas même de quoi
// repasser le lien à quelqu'un d'autre. Le bouton Partager commun
// (ButtonPartager) est ajouté, comme sur les pages publiques.
export function ConsultationFichierBibliothequePerso({ id }: { id: string }) {
  const [fichier, setFichier] = useState<FichierBibliothequeConsultation | null | undefined>(undefined);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (id === "placeholder") {
      setFichier(null);
      return;
    }
    obtenirFichierBibliothequeConsultation(id)
      .then(setFichier)
      .catch((e) => {
        if (e instanceof ErreurApi && e.statusCode === 404) {
          setFichier(null);
        } else {
          setErreur(messageErreur(e));
        }
      });
  }, [id]);

  if (erreur) {
    return (
      <SectionPage title="Document partagé" retour="/bibliotheque">
        <p className="rounded-xl border border-dashed border-dj-bordure px-3 py-4 text-center text-xs text-dj-texte-muet">{erreur}</p>
      </SectionPage>
    );
  }

  if (fichier === undefined) {
    return (
      <SectionPage title="Document partagé" retour="/bibliotheque">
        <Skeleton className="h-32 w-full rounded-cgpt-carte" />
      </SectionPage>
    );
  }

  if (fichier === null) {
    return (
      <SectionPage title="Document introuvable" retour="/bibliotheque">
        <p className="rounded-xl border border-dashed border-dj-bordure px-3 py-4 text-center text-xs text-dj-texte-muet">
          Ce document est introuvable, ou a été supprimé par son propriétaire.
        </p>
      </SectionPage>
    );
  }

  const estPdf = fichier.type_mime === "application/pdf";
  // 17/09/2026, demande Bourama : même bug que côté public
  // (app/(app)/bibliotheque/[id]/page.tsx) -- un lien partagé (seul ou
  // via un dossier) s'affichait comme un fichier générique.
  const estLien = fichier.type_mime === "text/uri-list";

  return (
    <SectionPage title={fichier.nom_fichier} retour="/bibliotheque">
      <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {estLien ? (
              <IconLien size={18} className="flex-shrink-0 text-dj-accent-1" />
            ) : (
              <FileText size={18} className="flex-shrink-0 text-dj-accent-1" />
            )}
            <h2 className="font-display text-base font-semibold text-dj-texte">{fichier.nom_fichier}</h2>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {fichier.url_publique && estLien && (
              <a
                href={fichier.url_publique}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-cgpt-bouton border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte-muet transition-colors hover:border-dj-bordure-forte hover:text-dj-texte"
              >
                <ExternalLink size={13} /> Ouvrir le site
              </a>
            )}
            {fichier.url_publique && !estLien && (
              <BoutonTelechargerFichier url={fichier.url_publique} nom={fichier.nom_fichier} />
            )}
            <BoutonAvecIA
              libelle="Discuter avec l'IA"
              texte={
                `Je veux discuter du fichier id ${fichier.id}. ` +
                `Utilise l'outil gerer_document_bibliotheque (action "lire_entier") avec cet id pour voir de quoi il s'agit, ` +
                `puis discutons-en ensemble.`
              }
            />
            <ButtonPartager lien={lienPartage("fichier-perso", fichier.id)} titre={fichier.nom_fichier} />
          </div>
        </div>

        {fichier.description && <TexteAvecLiens texte={fichier.description} className="mt-2 text-sm text-dj-texte-muet" />}

        {estLien && fichier.url_publique && (
          <div className="mt-3">
            <LinkPreview href={fichier.url_publique} texteLien={fichier.nom_fichier} />
          </div>
        )}

        <div className="mt-4">
          <SuggestionCompte texte="Crée un compte Classinus pour retrouver tes propres documents." />
        </div>
      </section>

      {estPdf && fichier.url_publique && (
        <section className="h-[70vh] overflow-hidden rounded-cgpt-carte border border-dj-bordure bg-dj-surface">
          <VisionneurPdf url={fichier.url_publique} />
        </section>
      )}
    </SectionPage>
  );
}
