"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { appelerApi } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";
import { useInfoSection } from "./SectionPage";
import { clesRequetes } from "@/lib/clesRequetes";
import { dateRelative } from "@/lib/dateRelative";
import { oublierCategorieMemoire, titreCategorieMemoire } from "@/lib/categoriesMemoire";
import { TRAIT_ICONE_SECTION } from "@/lib/styleLignes";

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
  // Catégories dépliées : aucune au départ, tout est replié par défaut.
  const [ouvertes, setOuvertes] = useState<Set<string>>(new Set());

  function basculerCategorie(categorie: string) {
    setOuvertes((prec) => {
      const suivant = new Set(prec);
      if (suivant.has(categorie)) suivant.delete(categorie);
      else suivant.add(categorie);
      return suivant;
    });
  }

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
    <div className="flex flex-col gap-2">
      {/* Skeleton fidèle à la forme réelle : 4 catégories repliées, chacune
          avec sa flèche, son titre, sa date de mise à jour et le bouton
          Oublier à droite. */}
      {chargement && (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Skeleton className="h-4 w-4 flex-shrink-0 rounded" style={{ animationDelay: `${i * 80}ms` }} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Skeleton className="h-4 w-1/3 rounded" style={{ animationDelay: `${i * 80}ms` }} />
                  <Skeleton className="h-3 w-1/4 rounded" style={{ animationDelay: `${i * 80 + 60}ms` }} />
                </div>
              </div>
              <Skeleton className="h-6 w-16 flex-shrink-0 rounded-cgpt-bouton" style={{ animationDelay: `${i * 80 + 100}ms` }} />
            </div>
          ))}
        </div>
      )}

      {!chargement && erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

      {!chargement && !erreur && toutEstVide && (
        <p className="animate-dj-fade-in-rapide py-2 text-sm text-dj-texte-muet">
          Rien de retenu pour l&apos;instant. Ta mémoire se construit toute seule au fil de tes conversations.
        </p>
      )}

      {!chargement &&
        categories.map((c) => {
          const ouverte = ouvertes.has(c.categorie);
          const derniereMaj = c.lignes
            .map((l) => l.updated_at)
            .filter(Boolean)
            .sort()
            .at(-1);
          return (
            <section key={c.categorie} className="animate-dj-fade-in-rapide flex min-w-0 flex-col">
              <div className="flex items-center justify-between gap-2 py-2">
                <h3 className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => basculerCategorie(c.categorie)}
                    aria-expanded={ouverte}
                    className="flex w-full min-w-0 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      size={16}
                      strokeWidth={TRAIT_ICONE_SECTION}
                      className={`flex-shrink-0 text-dj-texte-muet transition-transform duration-300 ${ouverte ? "rotate-180" : ""}`}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words text-sm font-bold text-dj-texte">{titreCategorieMemoire(c.categorie)}</span>
                      {derniereMaj && (
                        <span className="text-xs font-normal text-dj-texte-muet">Mis à jour {dateRelative(derniereMaj)}</span>
                      )}
                    </span>
                  </button>
                </h3>
                {c.lignes.length > 0 && (
                  <button
                    onClick={() => oublierCategorie(c.categorie)}
                    disabled={efface !== null}
                    className="flex-shrink-0 rounded-cgpt-bouton border border-[var(--dj-erreur)] px-3 py-1 text-xs text-[var(--dj-erreur)] transition-colors hover:bg-[var(--dj-erreur)]/10 disabled:opacity-50"
                  >
                    {efface === c.categorie ? "Suppression…" : "Oublier"}
                  </button>
                )}
              </div>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  ouverte ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="pb-2 pl-6 pt-2">
                    {c.lignes.length === 0 ? (
                      <p className="text-sm text-dj-texte-muet">Rien de retenu ici pour l&apos;instant.</p>
                    ) : (
                      <div className="flex min-w-0 flex-col gap-4">
                        {c.lignes.map((ligne) => (
                          <BlocLigne key={ligne.sous_categorie ?? "racine"} ligne={ligne} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          );
        })}

      {!chargement && message && <span className="text-sm text-dj-texte-muet">{message}</span>}
    </div>
  );
}
