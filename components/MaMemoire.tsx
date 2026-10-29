"use client";

import { ImportDepuisAutreIA } from "@/components/ImportDepuisAutreIA";
import { useState } from "react";
import { ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { appelerApi } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";
import { useInfoSection } from "./SectionPage";
import { clesRequetes } from "@/lib/clesRequetes";
import { dateRelative } from "@/lib/dateRelative";
import { modifierLigneMemoire, oublierCategorieMemoire, titreCategorieMemoire } from "@/lib/categoriesMemoire";
import { MenuActionsCarte } from "./MenuActionsCarte";
import { TRAIT_ICONE_SECTION } from "@/lib/styleLignes";
import { CaseACocher } from "./CaseACocher";

// Écran "Ma mémoire" (29/09/2026, demande Bourama : un seul système de
// mémoire). Il lit la mémoire structurée de l'élève (table memoire_eleve,
// voir api/memoire_eleve.py côté backend), classée en 4 catégories fixes.
// Chaque catégorie a une flèche (vers la droite repliée, vers le bas
// dépliée) puis un menu à trois points : Éditer (18/10/2026, demande de
// Bourama, remplace la lecture seule du 29/09) et Oublier la catégorie
// entière (comme avant, voir lib/categoriesMemoire.ts). Effacer TOUTE la
// mémoire se fait dans Paramètres (components/ParametresAccueil.tsx). Oublier
// garde la double confirmation (lib/confirmationOubliMemoire.ts).
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

// Édition d'une valeur du contenu (18/10/2026) : chaque champ garde son type
// d'origine (texte, nombre, oui/non, liste), l'élève ne voit jamais de JSON.
const CLASSE_CHAMP =
  "w-full min-w-0 resize-y rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1";

function versNombreOuTexte(texte: string, original: unknown): unknown {
  if (typeof original !== "number") return texte;
  const n = Number(texte.replace(",", "."));
  return texte.trim() !== "" && Number.isFinite(n) ? n : texte;
}

function ChampEditable({ cle, valeur, onChange }: { cle: string; valeur: unknown; onChange: (v: unknown) => void }) {
  if (estVide(valeur)) return null;
  const etiquette = <span className="text-xs font-medium text-dj-texte-muet">{libelleCle(cle)}</span>;

  if (typeof valeur === "boolean") {
    return (
      <label className="flex min-w-0 items-center gap-2 text-sm text-dj-texte">
        <CaseACocher checked={valeur} onChange={(c) => onChange(c)} />
        {libelleCle(cle)}
      </label>
    );
  }

  if (Array.isArray(valeur)) {
    const tousSimples = valeur.every((v) => typeof v !== "object" || v === null);
    if (tousSimples) {
      return (
        <label className="flex min-w-0 flex-col gap-1.5">
          {etiquette}
          <textarea
            className={CLASSE_CHAMP}
            rows={Math.min(8, Math.max(2, valeur.length))}
            value={valeur.map(texteDe).join("\n")}
            onChange={(e) =>
              onChange(
                e.target.value
                  .split("\n")
                  .filter((l) => l.trim() !== "")
                  .map((l, i) => versNombreOuTexte(l, valeur[i]))
              )
            }
          />
          <span className="text-[11px] text-dj-texte-muet">Un élément par ligne.</span>
        </label>
      );
    }
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        {etiquette}
        <div className="flex flex-col gap-3 border-l border-dj-bordure pl-3">
          {valeur.map((v, i) =>
            typeof v === "object" && v !== null && !Array.isArray(v) ? (
              <div key={i} className="flex min-w-0 flex-col gap-2">
                {Object.entries(v as Record<string, unknown>).map(([k, val]) => (
                  <ChampEditable
                    key={k}
                    cle={k}
                    valeur={val}
                    onChange={(nv) => onChange(valeur.map((x, j) => (j === i ? { ...(x as Record<string, unknown>), [k]: nv } : x)))}
                  />
                ))}
              </div>
            ) : (
              <span key={i} className="break-words text-sm text-dj-texte">
                {texteDe(v)}
              </span>
            )
          )}
        </div>
      </div>
    );
  }

  if (typeof valeur === "object") {
    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        {etiquette}
        <div className="flex flex-col gap-2 border-l border-dj-bordure pl-3">
          {Object.entries(valeur as Record<string, unknown>).map(([k, val]) => (
            <ChampEditable
              key={k}
              cle={k}
              valeur={val}
              onChange={(nv) => onChange({ ...(valeur as Record<string, unknown>), [k]: nv })}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      {etiquette}
      <textarea
        className={CLASSE_CHAMP}
        rows={typeof valeur === "string" && valeur.length > 80 ? 3 : 1}
        value={texteDe(valeur)}
        onChange={(e) => onChange(versNombreOuTexte(e.target.value, valeur))}
      />
    </label>
  );
}

function BlocLigneEditable({
  ligne,
  contenu,
  onChange,
}: {
  ligne: Ligne;
  contenu: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {ligne.sous_categorie && (
        <h4 className="break-words text-sm font-bold text-dj-texte">{titreSousCategorie(ligne.sous_categorie)}</h4>
      )}
      {Object.entries(contenu).map(([cle, valeur]) => (
        <ChampEditable key={cle} cle={cle} valeur={valeur} onChange={(nv) => onChange({ ...contenu, [cle]: nv })} />
      ))}
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
  // Catégorie en cours d'édition, brouillons par ligne, enregistrement en cours.
  const [enEdition, setEnEdition] = useState<string | null>(null);
  const [brouillons, setBrouillons] = useState<Record<string, Record<string, unknown>>>({});
  const [enregistrement, setEnregistrement] = useState(false);
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

  function cleLigne(l: Ligne) {
    return l.sous_categorie ?? "racine";
  }

  function commencerEdition(c: Categorie) {
    setBrouillons(Object.fromEntries(c.lignes.map((l) => [cleLigne(l), structuredClone(l.contenu)])));
    setEnEdition(c.categorie);
    setOuvertes((prec) => new Set(prec).add(c.categorie));
    setErreur(null);
    setMessage(null);
  }

  async function enregistrerEdition(c: Categorie) {
    if (enregistrement) return;
    setEnregistrement(true);
    setErreur(null);
    try {
      for (const l of c.lignes) {
        const nouveau = brouillons[cleLigne(l)];
        if (nouveau && JSON.stringify(nouveau) !== JSON.stringify(l.contenu)) {
          await modifierLigneMemoire(c.categorie, l.sous_categorie, nouveau, queryClient);
        }
      }
      setEnEdition(null);
      setMessage("Modifications enregistrées.");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrement(false);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour que Classinus se souvienne de toi." />;
  }

  const categories = memoire?.categories ?? [];
  const toutEstVide = categories.every((c) => c.lignes.length === 0);

  return (
    <div className="flex flex-col gap-2">
      <ImportDepuisAutreIA origine="memoire" />
      {/* Skeleton fidèle à la forme réelle : 4 catégories repliées, chacune
          avec son titre, sa date de mise à jour, puis à droite la flèche et
          le menu à trois points. */}
      {chargement && (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Skeleton className="h-4 w-1/3 rounded" style={{ animationDelay: `${i * 80}ms` }} />
                  <Skeleton className="h-3 w-1/4 rounded" style={{ animationDelay: `${i * 80 + 60}ms` }} />
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" style={{ animationDelay: `${i * 80 + 100}ms` }} />
                <Skeleton className="h-4 w-4 rounded" style={{ animationDelay: `${i * 80 + 140}ms` }} />
              </div>
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
                    className="flex w-full min-w-0 items-center text-left"
                  >
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words text-sm font-bold text-dj-texte">{titreCategorieMemoire(c.categorie)}</span>
                      {derniereMaj && (
                        <span className="text-xs font-normal text-dj-texte-muet">Mis à jour {dateRelative(derniereMaj)}</span>
                      )}
                    </span>
                  </button>
                </h3>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => basculerCategorie(c.categorie)}
                    aria-expanded={ouverte}
                    aria-label={ouverte ? "Replier" : "Déplier"}
                    className="flex flex-shrink-0 items-center rounded-full p-1.5 text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte"
                  >
                    <ChevronRight
                      size={16}
                      strokeWidth={TRAIT_ICONE_SECTION}
                      className={`transition-transform duration-300 ${ouverte ? "rotate-90" : ""}`}
                    />
                  </button>
                  {c.lignes.length > 0 && (
                    <MenuActionsCarte
                      ariaLabel={`Actions pour ${titreCategorieMemoire(c.categorie)}`}
                      desactive={efface !== null || enregistrement}
                      actions={[
                        { cle: "editer", label: "Éditer", icone: <Pencil size={14} />, onClick: () => commencerEdition(c) },
                        {
                          cle: "oublier",
                          label: efface === c.categorie ? "Suppression…" : "Oublier",
                          icone: <Trash2 size={14} />,
                          onClick: () => oublierCategorie(c.categorie),
                          destructif: true,
                        },
                      ]}
                    />
                  )}
                </div>
              </div>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                  ouverte ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="pb-2 pt-2">
                    {c.lignes.length === 0 ? (
                      <p className="text-sm text-dj-texte-muet">Rien de retenu ici pour l&apos;instant.</p>
                    ) : (
                      <div className="flex min-w-0 flex-col gap-4">
                        {c.lignes.map((ligne) =>
                          enEdition === c.categorie && brouillons[cleLigne(ligne)] ? (
                            <BlocLigneEditable
                              key={cleLigne(ligne)}
                              ligne={ligne}
                              contenu={brouillons[cleLigne(ligne)]}
                              onChange={(nc) => setBrouillons((prec) => ({ ...prec, [cleLigne(ligne)]: nc }))}
                            />
                          ) : (
                            <BlocLigne key={cleLigne(ligne)} ligne={ligne} />
                          )
                        )}
                        {enEdition === c.categorie && (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEnEdition(null)}
                              disabled={enregistrement}
                              className="rounded-cgpt-bouton border border-dj-bordure px-3 py-1.5 text-xs font-medium text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50"
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              onClick={() => enregistrerEdition(c)}
                              disabled={enregistrement}
                              className="rounded-cgpt-bouton bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
                            >
                              {enregistrement ? "Enregistrement…" : "Enregistrer"}
                            </button>
                          </div>
                        )}
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
