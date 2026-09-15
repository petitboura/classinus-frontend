"use client";

import { useState } from "react";
import { Tags, X, Loader2, FolderTree, FileText } from "lucide-react";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import type { FiltresDossierCataloguePublic, ValeursFiltreDossier, ListesFiltresBibliothequePublique } from "@/lib/api";

// Créé le 13/09/2026, demande Bourama : les 5 filtres d'un dossier du
// catalogue public (pays, niveau, catégorie, classe, spécialité)
// n'étaient modifiables nulle part après sa création -- cette modale le
// permet, réservée au créateur du dossier (403 côté backend sinon).
// Concerne UNIQUEMENT les dossiers : un fichier garde une seule valeur
// par filtre, formulaire inchangé (ChampsFiltragePublication dans
// BibliothequePublique.tsx).
//
// 13/09/2026 (suite) : + réglage d'héritage par valeur (descend
// automatiquement aux sous-dossiers et/ou aux fichiers, à n'importe
// quelle profondeur, en plus des valeurs propres du descendant --
// jamais de remplacement). Même composant ChampMultiValeurs que celui
// de BibliothequePublique.tsx (dupliqué ici pour rester un fichier
// autonome, même pattern que les autres modales du dossier).

function ChampMultiValeurs({
  label,
  valeurs,
  heritageSousDossiers,
  heritageFichiers,
  onChange,
  suggestions,
  listeId,
}: {
  label: string;
  valeurs: string[];
  heritageSousDossiers: string[];
  heritageFichiers: string[];
  onChange: (v: ValeursFiltreDossier) => void;
  suggestions: string[];
  listeId: string;
}) {
  const [saisie, setSaisie] = useState("");

  function ajouter(v: string) {
    const nettoyee = v.trim();
    setSaisie("");
    if (!nettoyee || valeurs.includes(nettoyee)) return;
    onChange({ valeurs: [...valeurs, nettoyee], heritageSousDossiers, heritageFichiers });
  }

  function retirer(v: string) {
    onChange({
      valeurs: valeurs.filter((x) => x !== v),
      heritageSousDossiers: heritageSousDossiers.filter((x) => x !== v),
      heritageFichiers: heritageFichiers.filter((x) => x !== v),
    });
  }

  function basculerHeritage(v: string, camp: "sousDossiers" | "fichiers") {
    const liste = camp === "sousDossiers" ? heritageSousDossiers : heritageFichiers;
    const nouvelleListe = liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v];
    onChange({
      valeurs,
      heritageSousDossiers: camp === "sousDossiers" ? nouvelleListe : heritageSousDossiers,
      heritageFichiers: camp === "fichiers" ? nouvelleListe : heritageFichiers,
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-dj-texte-muet">{label}</p>
      {valeurs.length > 0 && (
        <div className="flex flex-col gap-1">
          {valeurs.map((v) => (
            <div key={v} className="flex animate-dj-fade-in-rapide flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full border border-dj-bordure bg-dj-fond px-2 py-0.5 text-xs text-dj-texte">
                {v}
                <button type="button" onClick={() => retirer(v)} aria-label={`Retirer ${v}`} className="text-dj-texte-muet hover:text-dj-texte">
                  <X size={11} />
                </button>
              </span>
              <button
                type="button"
                onClick={() => basculerHeritage(v, "sousDossiers")}
                title="Faire descendre cette valeur à tous les sous-dossiers"
                className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${
                  heritageSousDossiers.includes(v)
                    ? "border-dj-accent-1 bg-dj-accent-1/15 text-dj-accent-1"
                    : "border-dj-bordure text-dj-texte-muet hover:text-dj-texte"
                }`}
              >
                <FolderTree size={11} /> Sous-dossiers
              </button>
              <button
                type="button"
                onClick={() => basculerHeritage(v, "fichiers")}
                title="Faire descendre cette valeur à tous les fichiers"
                className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${
                  heritageFichiers.includes(v)
                    ? "border-dj-accent-1 bg-dj-accent-1/15 text-dj-accent-1"
                    : "border-dj-bordure text-dj-texte-muet hover:text-dj-texte"
                }`}
              >
                <FileText size={11} /> Fichiers
              </button>
            </div>
          ))}
        </div>
      )}
      <input
        list={listeId}
        value={saisie}
        onChange={(e) => {
          const nouvelleValeur = e.target.value;
          setSaisie(nouvelleValeur);
          // 15/09/2026, correction bug Bourama : choisir une suggestion
          // dans le <datalist> ne fait que remplir le champ texte (pas
          // d'événement natif "sélection" côté datalist), donc l'ajout
          // n'arrivait qu'au blur (cliquer sur un autre filtre). On
          // ajoute immédiatement dès que le texte tapé correspond
          // exactement à une suggestion existante.
          if (suggestions.includes(nouvelleValeur)) {
            ajouter(nouvelleValeur);
          }
        }}
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
  valeurs,
  onChange,
  listes,
  enregistrementEnCours,
  onEnregistrer,
  onFermer,
}: {
  nomDossier: string;
  valeurs: FiltresDossierCataloguePublic;
  onChange: (v: FiltresDossierCataloguePublic) => void;
  listes: ListesFiltresBibliothequePublique;
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
        <p className="text-[11px] text-dj-texte-muet">
          « Sous-dossiers » et « Fichiers » font descendre une valeur à tous les descendants (à n'importe quelle profondeur), en plus de leurs propres valeurs.
        </p>

        <ChampMultiValeurs
          label="Pays"
          valeurs={valeurs.pays.valeurs}
          heritageSousDossiers={valeurs.pays.heritageSousDossiers}
          heritageFichiers={valeurs.pays.heritageFichiers}
          onChange={(v) => onChange({ ...valeurs, pays: v })}
          suggestions={listes.pays}
          listeId="edition-filtres-dossier-pays"
        />
        <ChampMultiValeurs
          label="Niveau"
          valeurs={valeurs.niveau.valeurs}
          heritageSousDossiers={valeurs.niveau.heritageSousDossiers}
          heritageFichiers={valeurs.niveau.heritageFichiers}
          onChange={(v) => onChange({ ...valeurs, niveau: v })}
          suggestions={listes.niveaux}
          listeId="edition-filtres-dossier-niveau"
        />
        <ChampMultiValeurs
          label="Catégorie"
          valeurs={valeurs.categorie.valeurs}
          heritageSousDossiers={valeurs.categorie.heritageSousDossiers}
          heritageFichiers={valeurs.categorie.heritageFichiers}
          onChange={(v) => onChange({ ...valeurs, categorie: v })}
          suggestions={listes.categories}
          listeId="edition-filtres-dossier-categorie"
        />
        <ChampMultiValeurs
          label="Classe"
          valeurs={valeurs.classe.valeurs}
          heritageSousDossiers={valeurs.classe.heritageSousDossiers}
          heritageFichiers={valeurs.classe.heritageFichiers}
          onChange={(v) => onChange({ ...valeurs, classe: v })}
          suggestions={listes.classes}
          listeId="edition-filtres-dossier-classe"
        />
        <ChampMultiValeurs
          label="Spécialité"
          valeurs={valeurs.specialite.valeurs}
          heritageSousDossiers={valeurs.specialite.heritageSousDossiers}
          heritageFichiers={valeurs.specialite.heritageFichiers}
          onChange={(v) => onChange({ ...valeurs, specialite: v })}
          suggestions={listes.specialites}
          listeId="edition-filtres-dossier-specialite"
        />

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
