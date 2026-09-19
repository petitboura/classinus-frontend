"use client";

import { useEffect, useState } from "react";
import { X, User } from "lucide-react";
import { lireProfilPublicContributeur, type ProfilPublicContributeur, type CompteursCatalogue } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { BlocAnalytiqueCarte } from "@/components/BlocAnalytiqueCarte";

/**
 * 18/09/2026, chantier "profil contributeur bibliotheque publique",
 * étape 8 : popup ouvert depuis le bouton "Détails" d'une carte
 * fichier/dossier public (voir BibliothequePublique.tsx), affiche
 * bio/nom/photo du contributeur -- ou un état "profil non public" si
 * la personne n'a pas activé ce réglage (étape 1/4). Même langage
 * visuel et même mécanique de fermeture animée que
 * VoirSkillRecuModal.tsx (pas de fermeture brute, demande Bourama).
 *
 * 19/09/2026 (correctif, demande Bourama) : les 4 analytiques
 * (BlocAnalytiqueCarte, jusque-là affichées en permanence sur la
 * carte) sont désormais repliées ICI, en tête de cette même modale --
 * le profil du contributeur n'est plus le seul sujet de la modale,
 * juste une section parmi d'autres. `compteurs` optionnel : peut être
 * absent si le lot d'analytiques n'a pas encore chargé, ou si
 * l'élément n'a pas encore de compteurs -- BlocAnalytiqueCarte gère
 * déjà ce cas (rend null). `userId` également optionnel désormais :
 * un élément peut avoir des analytiques sans contributeur connu --
 * dans ce cas la section profil est simplement absente, la modale
 * ne montre que les analytiques.
 */
export function ProfilPublicModal({
  userId,
  compteurs,
  onFermer,
}: {
  userId?: string;
  compteurs?: CompteursCatalogue;
  onFermer: () => void;
}) {
  const [profil, setProfil] = useState<ProfilPublicContributeur | null>(null);
  const [chargement, setChargement] = useState(!!userId);
  const [erreur, setErreur] = useState<string | null>(null);

  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  useEffect(() => {
    if (!userId) return;
    lireProfilPublicContributeur(userId)
      .then(setProfil)
      .catch((e) => setErreur(messageErreur(e)))
      .finally(() => setChargement(false));
  }, [userId]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        className={`flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-sm sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-dj-texte">
            <User size={15} className="flex-shrink-0" />
            <span className="truncate">{userId ? "Détails" : "Statistiques"}</span>
          </h4>
          <button onClick={fermer} className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        {compteurs && (
          <div className="border-b border-dj-bordure pb-3">
            <BlocAnalytiqueCarte compteurs={compteurs} />
          </div>
        )}

        {!userId ? null : chargement ? (
          <div className="flex flex-1 items-center justify-center py-8 text-dj-texte-muet">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-dj-bordure border-t-dj-accent-1" />
          </div>
        ) : erreur ? (
          <p className="py-4 text-sm text-[var(--dj-erreur)]">{erreur}</p>
        ) : !profil?.profil_public ? (
          <p className="py-4 text-sm text-dj-texte-muet">Ce profil n'est pas public.</p>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            {profil.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profil.avatar_url} alt={profil.nom_affiche} className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-dj-accent-1/20 text-dj-accent-1">
                <User size={28} />
              </div>
            )}
            <p className="text-sm font-semibold text-dj-texte">{profil.nom_affiche || "Sans nom"}</p>
            {profil.bio && <p className="whitespace-pre-wrap text-xs text-dj-texte-muet">{profil.bio}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
