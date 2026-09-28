"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appelerApi } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { clesRequetes } from "@/lib/clesRequetes";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";

// Chantier "mémoire élève" (27/09/2026), écran élève minimal : une carte
// par matière notée sous la catégorie "apprentissage" de sa mémoire
// structurée (voir api/memoire_eleve.py côté backend). Lecture seule.
// Le contenu d'une matière est libre (décidé par le modèle pour chaque
// élève), donc rendu de façon générique : les listes deviennent des
// pastilles, les textes restent des textes.

type Matiere = {
  sous_categorie: string;
  contenu: Record<string, unknown>;
  description: string;
  updated_at: string;
};

function titreDepuisChemin(chemin: string): string {
  const morceaux = chemin.split(".").map((m) => m.replace(/_/g, " "));
  const texte = morceaux.join(" : ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function libelleCle(cle: string): string {
  const texte = cle.replace(/_/g, " ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function ChampContenu({ cle, valeur }: { cle: string; valeur: unknown }) {
  if (Array.isArray(valeur)) {
    if (valeur.length === 0) return null;
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-dj-texte-muet">{libelleCle(cle)}</span>
        <div className="flex flex-wrap gap-1.5">
          {valeur.map((v, i) => (
            <span
              key={i}
              className="max-w-full break-words rounded-full border border-dj-bordure bg-dj-surface-haute px-2.5 py-1 text-xs text-dj-texte"
            >
              {typeof v === "string" ? v : JSON.stringify(v)}
            </span>
          ))}
        </div>
      </div>
    );
  }
  if (valeur === null || valeur === undefined || valeur === "") return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-dj-texte-muet">{libelleCle(cle)}</span>
      <span className="break-words text-sm text-dj-texte">
        {typeof valeur === "string" ? valeur : JSON.stringify(valeur)}
      </span>
    </div>
  );
}

export function MaProgression() {
  const [sansCompte, setSansCompte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const { data: matieres, isLoading: chargement } = useQuery({
    queryKey: clesRequetes.progressionEleve,
    queryFn: async () => {
      try {
        const r = (await appelerApi("/api/memoire-eleve/progression")) as { matieres: Matiere[] };
        return r.matieres;
      } catch (e) {
        if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
        else setErreur(messageErreur(e));
        return [] as Matiere[];
      }
    },
  });

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour suivre ta progression matière par matière." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Skeleton fidèle à la forme réelle : des cartes avec un titre, une
          ligne de description et une rangée de pastilles. */}
      {chargement && (
        <div className="flex flex-col gap-3" aria-hidden>
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4"
            >
              <Skeleton className="h-4 w-1/3 rounded" style={{ animationDelay: `${i * 80}ms` }} />
              <Skeleton className="h-3 w-3/4 rounded" style={{ animationDelay: `${i * 80 + 60}ms` }} />
              <div className="flex flex-wrap gap-1.5">
                {[70, 90, 60].map((largeur, j) => (
                  <Skeleton
                    key={j}
                    className="h-6 rounded-full"
                    style={{ width: largeur, animationDelay: `${i * 80 + 120 + j * 40}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!chargement && erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

      {!chargement && !erreur && matieres && matieres.length === 0 && (
        <div className="animate-dj-fade-in-rapide rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
          <p className="text-sm text-dj-texte-muet">
            Pas encore de suivi. Il se construit tout seul au fil de tes conversations, matière par matière.
          </p>
        </div>
      )}

      {!chargement &&
        !erreur &&
        matieres?.map((m) => (
          <div
            key={m.sous_categorie}
            className="animate-dj-fade-in-rapide flex flex-col gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4"
          >
            <div className="flex flex-col gap-1">
              <h3 className="break-words text-sm font-bold text-dj-texte">{titreDepuisChemin(m.sous_categorie)}</h3>
              <p className="break-words text-xs text-dj-texte-muet">{m.description}</p>
            </div>
            {Object.entries(m.contenu).map(([cle, valeur]) => (
              <ChampContenu key={cle} cle={cle} valeur={valeur} />
            ))}
          </div>
        ))}
    </div>
  );
}
