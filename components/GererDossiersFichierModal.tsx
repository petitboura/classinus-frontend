"use client";

import { useEffect, useState } from "react";
import { X, FolderTree, Globe, Lock, Loader2 } from "lucide-react";
import type { DossierCataloguePublic } from "@/lib/api";
import {
  listerDossiersDuFichierCataloguePublic,
  rangerFichierDossierCataloguePublic,
  retirerFichierDossierCataloguePublic,
} from "@/lib/api";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { messageErreur } from "@/lib/erreurs";

// 15/09/2026, demande Bourama ("une liste à cocher quand on veut
// déplacer") : un fichier du catalogue public peut désormais être
// attaché à PLUSIEURS dossiers/sous-dossiers à la fois (voir
// fichiers_dossiers_catalogue_public côté Supabase, déjà many-to-many
// depuis le 13/09/2026, seule l'UI manquait). Remplace le choix
// "une seule destination" de DeplacerVersModal pour l'action "déplacer"
// d'un fichier précis : ici, on coche/décoche librement les dossiers
// dans lesquels le fichier doit se trouver, et on enregistre le tout
// d'un coup (calcule le delta par rapport à l'état actuel, un appel
// ranger/retirer par dossier changé).
//
// Chemin complet affiché pour chaque dossier (même logique que
// cheminDossier dans DeplacerVersModal.tsx, dupliqué volontairement :
// composants indépendants, pas de dépendance croisée).

function cheminDossier(dossier: DossierCataloguePublic, parId: Map<string, DossierCataloguePublic>): string {
  const segments: string[] = [dossier.nom];
  let courant = dossier.dossier_parent_id;
  while (courant) {
    const parent = parId.get(courant);
    if (!parent) break;
    segments.unshift(parent.nom);
    courant = parent.dossier_parent_id;
  }
  return segments.join(" › ");
}

export function GererDossiersFichierModal({
  titre,
  fichierId,
  dossiers,
  onTermine,
  onFermer,
}: {
  titre: string;
  fichierId: string;
  dossiers: DossierCataloguePublic[];
  // Appelé après enregistrement réussi. messageDemande non vide si au
  // moins un retrait a été transformé en demande (contribution_libre,
  // pas créateur), pour que l'appelant l'affiche et rafraîchisse sa liste.
  onTermine: (messageDemande: string | null) => void;
  onFermer: () => void;
}) {
  const [chargement, setChargement] = useState(true);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [initial, setInitial] = useState<Set<string>>(new Set());
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  useEffect(() => {
    listerDossiersDuFichierCataloguePublic(fichierId)
      .then((ids) => {
        setCoches(new Set(ids));
        setInitial(new Set(ids));
      })
      .catch((e) => setErreurChargement(messageErreur(e)))
      .finally(() => setChargement(false));
  }, [fichierId]);

  const parId = new Map(dossiers.map((d) => [d.id, d]));

  function basculer(dossierId: string) {
    setCoches((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(dossierId)) suivant.delete(dossierId);
      else suivant.add(dossierId);
      return suivant;
    });
  }

  async function enregistrer() {
    setEnregistrementEnCours(true);
    setErreur(null);
    try {
      const ajouts = [...coches].filter((id) => !initial.has(id));
      const retraits = [...initial].filter((id) => !coches.has(id));

      let auMoinsUneDemande = false;
      for (const dossierId of ajouts) {
        await rangerFichierDossierCataloguePublic(dossierId, fichierId);
      }
      for (const dossierId of retraits) {
        const resultat = await retirerFichierDossierCataloguePublic(dossierId, fichierId);
        if (resultat) auMoinsUneDemande = true;
      }

      onTermine(
        auMoinsUneDemande ? "Demande envoyée pour au moins un dossier : en attente de confirmation du créateur." : null,
      );
      fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  const aChange = coches.size !== initial.size || [...coches].some((id) => !initial.has(id));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        className={`flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-md sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
            <FolderTree size={15} /> {titre}
          </h4>
          <button onClick={fermer} className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-dj-texte-muet">
          Coche tous les dossiers dans lesquels ce fichier doit se trouver : un fichier peut être rangé dans plusieurs dossiers à la fois.
        </p>

        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}
        {erreurChargement && <p className="text-sm text-[var(--dj-erreur)]">{erreurChargement}</p>}

        {chargement ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={18} className="animate-spin text-dj-texte-muet" />
          </div>
        ) : dossiers.length === 0 ? (
          <p className="text-sm text-dj-texte-muet">Aucun dossier disponible pour l&apos;instant.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {dossiers.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-left text-sm text-dj-texte transition-colors hover:border-dj-bordure-forte"
              >
                <input
                  type="checkbox"
                  checked={coches.has(d.id)}
                  onChange={() => basculer(d.id)}
                  className="flex-shrink-0 accent-dj-accent-1"
                />
                {d.statut === "contribution_libre" ? (
                  <Globe size={14} className="flex-shrink-0 text-dj-texte-muet" />
                ) : (
                  <Lock size={14} className="flex-shrink-0 text-dj-texte-muet" />
                )}
                <span className="min-w-0 flex-1 truncate">{cheminDossier(d, parId)}</span>
              </label>
            ))}
          </div>
        )}

        <button
          onClick={enregistrer}
          disabled={chargement || enregistrementEnCours || !aChange}
          className="flex items-center justify-center gap-2 rounded-cgpt-bouton bg-dj-accent-1 px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {enregistrementEnCours && <Loader2 size={14} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
