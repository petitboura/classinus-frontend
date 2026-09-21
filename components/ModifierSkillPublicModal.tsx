"use client";

import { useState } from "react";
import { X, Pencil } from "lucide-react";
import { modifierComportementPublic, ComportementPublic } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";

/**
 * 20/09/2026, demande Bourama ("pouvoir modifier le contenu réel") :
 * jusqu'ici un skill publié était figé pour toujours -- nom,
 * description, texte (contenu utilisé par les agents) et skill_md (le
 * .md d'origine, quand présent) deviennent modifiables, réservé à
 * l'auteur (même vérification côté backend, voir core/comportements_
 * etudiants.py::modifier_comportement_public). Bourama a été prévenu :
 * modifier texte/skill_md ne change que les activations FUTURES, les
 * copies déjà activées par d'autres restent inchangées.
 *
 * Plus grande que ModifierEntreePubliqueModal.tsx/
 * ModifierDossierPubliqueModal.tsx (nom+description seulement) à cause
 * du contenu, souvent long -- même largeur/hauteur que la modale de
 * EditeurComportement.tsx.
 */
export function ModifierSkillPublicModal({
  skill,
  onFermer,
  onModifie,
}: {
  skill: ComportementPublic;
  onFermer: () => void;
  onModifie: (skill: ComportementPublic) => void;
}) {
  const [nom, setNom] = useState(skill.nom);
  const [description, setDescription] = useState(skill.description || "");
  const [texte, setTexte] = useState(skill.texte);
  const [skillMd, setSkillMd] = useState(skill.skill_md || "");
  const [enregistrement, setEnregistrement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  async function enregistrer() {
    if (!nom.trim()) {
      setErreur("Le nom ne peut pas être vide.");
      return;
    }
    if (!texte.trim()) {
      setErreur("Le contenu ne peut pas être vide.");
      return;
    }
    setEnregistrement(true);
    setErreur(null);
    try {
      const misAJour = await modifierComportementPublic(skill.id, {
        nom: nom.trim(),
        description: description.trim(),
        texte: texte.trim(),
        skill_md: skillMd.trim(),
      });
      onModifie(misAJour);
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
        className={`flex h-full w-full max-h-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-dj-texte">
            <Pencil size={15} className="flex-shrink-0 text-dj-accent-1" />
            <span className="truncate">Modifier le skill</span>
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
            rows={2}
            className="resize-none rounded-lg border border-dj-bordure bg-dj-fond px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-dj-texte-muet">Contenu (utilisé par les agents qui l&apos;activent)</label>
          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            rows={8}
            className="min-h-[10rem] flex-1 resize-none rounded-lg border border-dj-bordure bg-dj-fond px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
        </div>

        {skillMd && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-dj-texte-muet">Fichier .md d&apos;origine</label>
            <textarea
              value={skillMd}
              onChange={(e) => setSkillMd(e.target.value)}
              rows={6}
              className="resize-none rounded-lg border border-dj-bordure bg-dj-fond px-3 py-2 font-mono text-xs text-dj-texte outline-none focus:border-dj-accent-1"
            />
          </div>
        )}

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
