"use client";

import { useState } from "react";
import { X, Pencil } from "lucide-react";
import { renommerDossierCataloguePublic, DossierCataloguePublic } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

/**
 * 20/09/2026, demande Bourama ("beaucoup de paramètres ne sont pas
 * éditables aujourd'hui") : nom et description d'un dossier déjà
 * publié, réservé au créateur du dossier (même vérification côté
 * backend, voir api/dossiers_catalogue_public.py::renommer). Distincte
 * de EditionFiltresDossierModal.tsx qui ne gère que les 5 filtres.
 * Même squelette visuel que ModifierEntreePubliqueModal.tsx (fichier).
 */
export function ModifierDossierPubliqueModal({
  dossier,
  onFermer,
  onModifie,
}: {
  dossier: DossierCataloguePublic;
  onFermer: () => void;
  onModifie: (nom: string, description: string) => void;
}) {
  const [nom, setNom] = useState(dossier.nom);
  const [description, setDescription] = useState(dossier.description || "");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  async function enregistrer() {
    if (!nom.trim()) {
      setErreur("Le nom ne peut pas être vide.");
      return;
    }
    setEnregistrement(true);
    setErreur(null);
    try {
      await renommerDossierCataloguePublic(dossier.id, nom.trim(), description.trim());
      onModifie(nom.trim(), description.trim());
      fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        className={`flex w-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-sm sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-dj-texte">
            <Pencil size={15} className="flex-shrink-0 text-dj-accent-1" />
            <span className="truncate">Modifier le dossier</span>
          </h4>
          <button onClick={fermer} className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-dj-texte-muet">Nom</label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="rounded-lg border border-dj-bordure bg-dj-fond px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-dj-texte-muet">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="resize-none rounded-lg border border-dj-bordure bg-dj-fond px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
        </div>

        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={fermer}
            disabled={enregistrement}
            className="flex-1 rounded-cgpt-bouton border border-dj-bordure px-4 py-2 text-sm font-medium text-dj-texte-muet transition-colors hover:bg-dj-surface-haute disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={enregistrer}
            disabled={enregistrement}
            className="flex-1 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
          >
            {enregistrement ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
