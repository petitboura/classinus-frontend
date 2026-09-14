"use client";

import { useState } from "react";
import { Tags, X, Loader2 } from "lucide-react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { messageErreur } from "@/lib/erreurs";

// Créé le 13/09/2026, demande Bourama : les 5 filtres d'un dossier du
// catalogue public (pays, niveau, catégorie, classe, spécialité)
// n'étaient modifiables nulle part après sa création -- cette modale le
// permet, réservée au créateur du dossier (403 côté backend sinon).
// Concerne UNIQUEMENT les dossiers : un fichier garde une seule valeur
// par filtre, formulaire inchangé (ChampsFiltragePublication dans
// BibliothequePublique.tsx).

function ChampMultiValeurs({
  label,
  valeurs,
  onChange,
  suggestions,
  listeId,
}: {
  label: string;
  valeurs: string[];
  onChange: (v: string[]) => void;
  suggestions: string[];
  listeId: string;
}) {
  const [saisie, setSaisie] = useState("");

  function ajouter(v: string) {
    const nettoyee = v.trim();
    setSaisie("");
    if (!nettoyee || valeurs.includes(nettoyee)) return;
    onChange([...valeurs, nettoyee]);
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-dj-texte-muet">{label}</p>
      {valeurs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {valeurs.map((v) => (
            <span
              key={v}
              className="flex animate-dj-fade-in-rapide items-center gap-1 rounded-full border border-dj-bordure bg-dj-fond px-2 py-0.5 text-xs text-dj-texte"
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(valeurs.filter((x) => x !== v))}
                aria-label={`Retirer ${v}`}
                className="text-dj-texte-muet hover:text-dj-texte"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        list={listeId}
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            ajouter(saisie);
          }
        }}
        onBlur={() => saisie.trim() && ajouter(saisie)}
        placeholder="Ajouter une valeur…"
        className="min-w-0 rounded-cgpt-bouton border border-dj-bordure bg-dj-fond px-3 py-2 text-xs text-dj-texte outline-none focus:border-dj-bordure-forte"
      />
      <datalist id={listeId}>
        {suggestions.filter((s) => !valeurs.includes(s)).map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

export function EditionFiltresDossierModal({
  nomDossier,
  pays,
  niveau,
  categorie,
  classe,
  specialite,
  onChangePays,
  onChangeNiveau,
  onChangeCategorie,
  onChangeClasse,
  onChangeSpecialite,
  suggestionsPays,
  suggestionsNiveau,
  suggestionsCategorie,
  suggestionsClasse,
  suggestionsSpecialite,
  enregistrementEnCours,
  onEnregistrer,
  onFermer,
}: {
  nomDossier: string;
  pays: string[];
  niveau: string[];
  categorie: string[];
  classe: string[];
  specialite: string[];
  onChangePays: (v: string[]) => void;
  onChangeNiveau: (v: string[]) => void;
  onChangeCategorie: (v: string[]) => void;
  onChangeClasse: (v: string[]) => void;
  onChangeSpecialite: (v: string[]) => void;
  suggestionsPays: string[];
  suggestionsNiveau: string[];
  suggestionsCategorie: string[];
  suggestionsClasse: string[];
  suggestionsSpecialite: string[];
  enregistrementEnCours: boolean;
  onEnregistrer: () => void;
  onFermer: () => void;
}) {
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

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
          <h4 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-dj-texte">
            <Tags size={15} className="flex-shrink-0" />
            <span className="truncate">Filtres de « {nomDossier} »</span>
          </h4>
          <button onClick={fermer} className="flex-shrink-0 text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        <ChampMultiValeurs label="Pays" valeurs={pays} onChange={onChangePays} suggestions={suggestionsPays} listeId="edition-filtres-dossier-pays" />
        <ChampMultiValeurs label="Niveau" valeurs={niveau} onChange={onChangeNiveau} suggestions={suggestionsNiveau} listeId="edition-filtres-dossier-niveau" />
        <ChampMultiValeurs label="Catégorie" valeurs={categorie} onChange={onChangeCategorie} suggestions={suggestionsCategorie} listeId="edition-filtres-dossier-categorie" />
        <ChampMultiValeurs label="Classe" valeurs={classe} onChange={onChangeClasse} suggestions={suggestionsClasse} listeId="edition-filtres-dossier-classe" />
        <ChampMultiValeurs label="Spécialité" valeurs={specialite} onChange={onChangeSpecialite} suggestions={suggestionsSpecialite} listeId="edition-filtres-dossier-specialite" />

        <div className="flex items-center justify-end gap-2 pt-1">
          <button onClick={fermer} className="rounded-cgpt-bouton border border-dj-bordure px-3 py-1.5 text-xs text-dj-texte-muet hover:text-dj-texte">
            Annuler
          </button>
          <button
            onClick={onEnregistrer}
            disabled={enregistrementEnCours}
            className="flex items-center gap-1.5 rounded-cgpt-bouton bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] hover:bg-dj-accent-2 disabled:opacity-50"
          >
            {enregistrementEnCours && <Loader2 size={12} className="animate-spin" />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
