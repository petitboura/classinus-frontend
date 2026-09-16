"use client";

import { useState } from "react";
import { X, SlidersHorizontal, Loader2 } from "lucide-react";
import type { EntreeBibliothequePublique, ListesFiltresBibliothequePublique } from "@/lib/api";
import { modifierFiltresFichierBibliothequePublique } from "@/lib/api";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { messageErreur } from "@/lib/erreurs";

// 15/09/2026, demande Bourama : les filtres d'un fichier/lien/texte
// déjà publié n'étaient modifiables nulle part côté UI humaine (seul
// l'outil MCP le pouvait). Composant indépendant de
// ChampMultiValeursFichier (BibliothequePublique.tsx) et de
// ChampMultiValeurs (EditionFiltresDossierModal.tsx), même logique
// "puces + datalist", dupliqué volontairement comme les autres
// (composants indépendants, pas de dépendance croisée).
function ChampMultiValeurs({
  valeurs,
  onChange,
  placeholder,
  listeId,
  suggestions,
}: {
  valeurs: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
  listeId: string;
  suggestions: string[];
}) {
  const [saisie, setSaisie] = useState("");

  function ajouter(v: string) {
    const nettoyee = v.trim();
    setSaisie("");
    if (!nettoyee || valeurs.includes(nettoyee)) return;
    onChange([...valeurs, nettoyee]);
  }

  function retirer(v: string) {
    onChange(valeurs.filter((x) => x !== v));
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {valeurs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {valeurs.map((v) => (
            <span key={v} className="flex animate-dj-fade-in-rapide items-center gap-1 rounded-full border border-dj-bordure bg-dj-fond px-2 py-0.5 text-xs text-dj-texte">
              {v}
              <button type="button" onClick={() => retirer(v)} aria-label={`Retirer ${v}`} className="text-dj-texte-muet hover:text-dj-texte">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        list={listeId}
        value={saisie}
        onChange={(e) => {
          const nouvelleValeur = e.target.value;
          setSaisie(nouvelleValeur);
          if (suggestions.includes(nouvelleValeur)) ajouter(nouvelleValeur);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            ajouter(saisie);
          }
        }}
        onBlur={() => saisie.trim() && ajouter(saisie)}
        placeholder={placeholder}
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

export function EditionFiltresFichierModal({
  entree,
  listes,
  onEnregistre,
  onFermer,
}: {
  entree: EntreeBibliothequePublique;
  listes: ListesFiltresBibliothequePublique;
  onEnregistre: (entreeModifiee: EntreeBibliothequePublique) => void;
  onFermer: () => void;
}) {
  const [pays, setPays] = useState<string[]>(entree.pays || []);
  const [niveau, setNiveau] = useState<string[]>(entree.niveau || []);
  const [categorie, setCategorie] = useState<string[]>(entree.categorie || []);
  const [classe, setClasse] = useState<string[]>(entree.classe || []);
  const [specialite, setSpecialite] = useState<string[]>(entree.specialite || []);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  async function enregistrer() {
    setEnregistrementEnCours(true);
    setErreur(null);
    try {
      const entreeModifiee = await modifierFiltresFichierBibliothequePublique(entree.id, { pays, niveau, categorie, classe, specialite });
      onEnregistre(entreeModifiee);
      fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrementEnCours(false);
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
        className={`flex max-h-[85vh] w-full flex-col gap-3 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-md sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-dj-texte">
            <SlidersHorizontal size={15} /> Modifier les filtres de ce fichier
          </h4>
          <button onClick={fermer} className="text-dj-texte-muet hover:text-dj-texte">
            <X size={16} />
          </button>
        </div>

        {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

        <div className="flex flex-col gap-2">
          <ChampMultiValeurs valeurs={pays} onChange={setPays} placeholder="Pays" listeId="edit-filtre-pays" suggestions={listes.pays} />
          <ChampMultiValeurs valeurs={niveau} onChange={setNiveau} placeholder="Niveau" listeId="edit-filtre-niveau" suggestions={listes.niveaux} />
          <ChampMultiValeurs valeurs={categorie} onChange={setCategorie} placeholder="Catégorie" listeId="edit-filtre-categorie" suggestions={listes.categories} />
          <ChampMultiValeurs valeurs={classe} onChange={setClasse} placeholder="Classe" listeId="edit-filtre-classe" suggestions={listes.classes} />
          <ChampMultiValeurs valeurs={specialite} onChange={setSpecialite} placeholder="Spécialité" listeId="edit-filtre-specialite" suggestions={listes.specialites} />
        </div>

        <button
          onClick={enregistrer}
          disabled={enregistrementEnCours}
          className="flex items-center justify-center gap-2 rounded-cgpt-bouton bg-dj-accent-1 px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        >
          {enregistrementEnCours && <Loader2 size={14} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  );
}
