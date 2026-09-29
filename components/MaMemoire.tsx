"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { appelerApi } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";
import { useInfoSection } from "./SectionPage";
import { clesRequetes } from "@/lib/clesRequetes";
import { dateRelative } from "@/lib/dateRelative";
import { oublierCategorieMemoire, titreCategorieMemoire } from "@/lib/categoriesMemoire";

// Écran "Ma mémoire" (29/09/2026, demande Bourama : un seul système de
// mémoire). Il lit la mémoire structurée de l'élève (table memoire_eleve,
// voir api/memoire_eleve.py côté backend), classée en 4 catégories fixes.
// Lecture seule : le contenu est un JSON libre écrit par le modèle, pas un
// texte pensé pour être édité à la main. On peut en revanche oublier une
// catégorie entière ici (comme dans Paramètres, voir
// lib/categoriesMemoire.ts) ; effacer TOUTE la mémoire se fait dans
// Paramètres (components/ParametresAccueil.tsx). Dans tous les cas,
// double confirmation (lib/confirmationOubliMemoire.ts).
//
// Le contenu d'une ligne est libre (décidé par le modèle pour chaque élève),
// donc rendu de façon générique : les listes deviennent des pastilles, les
// objets imbriqués des blocs, les textes restent des textes.

type Ligne = {
  sous_categorie: string | null;
  contenu: Record<string, unknown>;
  description: string;
  updated_at: string;
};

type Categorie = {
  categorie: string;
  lignes: Ligne[];
};

type Memoire = { categories: Categorie[] };

function libelleCle(cle: string): string {
  const texte = cle.replace(/_/g, " ");
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function titreSousCategorie(chemin: string): string {
  return libelleCle(chemin.split(".").join(" : "));
}

function texteDe(valeur: unknown): string {
  if (typeof valeur === "string") return valeur;
  if (typeof valeur === "number" || typeof valeur === "boolean") return String(valeur);
  return JSON.stringify(valeur);
}

function estVide(valeur: unknown): boolean {
  if (valeur === null || valeur === undefined || valeur === "") return true;
  if (Array.isArray(valeur)) return valeur.length === 0;
  if (typeof valeur === "object") return Object.keys(valeur as object).length === 0;
  return false;
}

function ChampContenu({ cle, valeur }: { cle: string; valeur: unknown }) {
  if (estVide(valeur)) return null;

  if (Array.isArray(valeur)) {
    const tousSimples = valeur.every((v) => typeof v !== "object" || v === null);
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs font-medium text-dj-texte-muet">{libelleCle(cle)}</span>
        {tousSimples ? (
          <div className="flex flex-wrap gap-1.5">
            {valeur.map((v, i) => (
              <span
                key={i}
                className="max-w-full break-words rounded-full border border-dj-bordure bg-dj-surface-haute px-2.5 py-1 text-xs text-dj-texte"
              >
                {texteDe(v)}
              </span>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2 border-l border-dj-bordure pl-3">
            {valeur.map((v, i) =>
              typeof v === "object" && v !== null ? (
                <div key={i} className="flex min-w-0 flex-col gap-2">
                  {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
                    <ChampContenu key={k} cle={k} valeur={val} />
                  ))}
                </div>
              ) : (
                <span key={i} className="break-words text-sm text-dj-texte">
                  {texteDe(v)}
                </span>
              )
            )}
          </div>
        )}
      </div>
    );
  }

  if (typeof valeur === "object") {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="text-xs font-medium text-dj-texte-muet">{libelleCle(cle)}</span>
        <div className="flex flex-col gap-2 border-l border-dj-bordure pl-3">
          {Object.entries(valeur as Record<string, unknown>).map(([k, val]) => (
            <ChampContenu key={k} cle={k} valeur={val} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-dj-texte-muet">{libelleCle(cle)}</span>
      <span className="break-words text-sm text-dj-texte">{texteDe(valeur)}</span>
    </div>
  );
}

function BlocLigne({ ligne }: { ligne: Ligne }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {ligne.sous_categorie && (
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 className="break-words text-sm font-bold text-dj-texte">{titreSousCategorie(ligne.sous_categorie)}</h4>
          {ligne.description && <p className="break-words text-xs text-dj-texte-muet">{ligne.description}</p>}
        </div>
      )}
      {Object.entries(ligne.contenu).map(([cle, valeur]) => (
        <ChampContenu key={cle} cle={cle} valeur={valeur} />
      ))}
    </div>
  );
}

export function MaMemoire() {
  const queryClient = useQueryClient();
  const [sansCompte, setSansCompte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // Catégorie en cours d'effacement, ou null.
  const [efface, setEfface] = useState<string | null>(null);

  // Description fixe remplacée par le bouton "i" du titre de page (voir
  // lib/aideSections.tsx, rubrique "memoire").
  useInfoSection("memoire");

  const { data: memoire, isLoading: chargement } = useQuery({
    queryKey: clesRequetes.memoire,
    queryFn: async () => {
      try {
        return (await appelerApi("/api/memoire-eleve")) as Memoire;
      } catch (e) {
        if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
        else setErreur(messageErreur(e));
        return { categories: [] } as Memoire;
      }
    },
  });

  async function oublierCategorie(categorie: string) {
    if (efface !== null) return;
    setEfface(categorie);
    setErreur(null);
    setMessage(null);
    try {
      const confirmation = await oublierCategorieMemoire(categorie, queryClient);
      if (confirmation) setMessage(confirmation);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEfface(null);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour que Classinus se souvienne de toi." />;
  }

  const categories = memoire?.categories ?? [];
  const toutEstVide = categories.every((c) => c.lignes.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Skeleton fidèle à la forme réelle : 4 cartes avec un titre, puis un
          champ (libellé court + valeur) et une rangée de pastilles. */}
      {chargement && (
        <div className="flex flex-col gap-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4"
            >
              <Skeleton className="h-4 w-1/3 rounded" style={{ animationDelay: `${i * 80}ms` }} />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-1/4 rounded" style={{ animationDelay: `${i * 80 + 60}ms` }} />
                <Skeleton className="h-3.5 w-3/4 rounded" style={{ animationDelay: `${i * 80 + 100}ms` }} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[70, 90, 60].map((largeur, j) => (
                  <Skeleton
                    key={j}
                    className="h-6 rounded-full"
                    style={{ width: largeur, animationDelay: `${i * 80 + 140 + j * 40}ms` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!chargement && erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

      {!chargement && !erreur && toutEstVide && (
        <div className="animate-dj-fade-in-rapide rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
          <p className="text-sm text-dj-texte-muet">
            Rien de retenu pour l&apos;instant. Ta mémoire se construit toute seule au fil de tes conversations.
          </p>
        </div>
      )}

      {!chargement &&
        categories.map((c) => {
          const derniereMaj = c.lignes
            .map((l) => l.updated_at)
            .filter(Boolean)
            .sort()
            .at(-1);
          return (
            <section
              key={c.categorie}
              className="animate-dj-fade-in-rapide flex min-w-0 flex-col gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="break-words text-sm font-bold text-dj-texte">{titreCategorieMemoire(c.categorie)}</h3>
                  {derniereMaj && (
                    <span className="text-xs text-dj-texte-muet">Mis à jour {dateRelative(derniereMaj)}</span>
                  )}
                </div>
                {c.lignes.length > 0 && (
                  <button
                    onClick={() => oublierCategorie(c.categorie)}
                    disabled={efface !== null}
                    className="rounded-cgpt-bouton border border-[var(--dj-erreur)] px-3 py-1 text-xs text-[var(--dj-erreur)] transition-colors hover:bg-[var(--dj-erreur)]/10 disabled:opacity-50"
                  >
                    {efface === c.categorie ? "Suppression…" : "Oublier"}
                  </button>
                )}
              </div>

              {c.lignes.length === 0 ? (
                <p className="text-sm text-dj-texte-muet">Rien de retenu ici pour l&apos;instant.</p>
              ) : (
                <div className="flex min-w-0 flex-col gap-4">
                  {c.lignes.map((ligne) => (
                    <BlocLigne key={ligne.sous_categorie ?? "racine"} ligne={ligne} />
                  ))}
                </div>
              )}
            </section>
          );
        })}

      {!chargement && message && <span className="text-sm text-dj-texte-muet">{message}</span>}
    </div>
  );
}
