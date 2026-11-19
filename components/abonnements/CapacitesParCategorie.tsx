"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Clock } from "lucide-react";
import { IconeFournisseur } from "@/components/chat/IconeFournisseur";
import { IconeEntreprise } from "@/components/abonnements/IconeEntreprise";
import type { EntrepriseModeles } from "@/lib/listeAttente";

type Traduire = (cle: string, valeurs?: Record<string, string | number>) => string;

// Ce que Classinus sait faire, par catégorie (19/11/2026, demande de Bourama). Chaque catégorie est un
// titre qu'on peut replier : dépliée par défaut, flèche vers la droite quand elle est repliée, vers le
// bas quand elle est dépliée. Chaque capacité est une ligne.
//
// Tout vient du serveur (Supabase, textes_modeles_llm), en français et en anglais, rien n'est écrit ici :
// - attente_cap_ordre : les identifiants des catégories, séparés par « | », dans l'ordre d'affichage ;
// - attente_cap_<id>_titre et attente_cap_<id>_lignes (une capacité par ligne, séparées par « | ») ;
// - une ligne qui commence par « ~ » est une capacité pas encore ouverte (étiquette attente_cap_bientot) ;
// - la ligne spéciale « @modeles » place à cet endroit le tableau des modèles.
// Voir migrations/2026_11_19_capacites_page_abonnements.sql côté backend.
const LIGNE_MODELES = "@modeles";

type Ligne = { texte: string; bientot: boolean; modeles: boolean };
type Categorie = { id: string; titre: string; lignes: Ligne[] };

function lireLignes(brut: string): Ligne[] {
  return brut
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      if (l === LIGNE_MODELES) return { texte: "", bientot: false, modeles: true };
      return l.startsWith("~")
        ? { texte: l.slice(1).trim(), bientot: true, modeles: false }
        : { texte: l, bientot: false, modeles: false };
    });
}

export function CapacitesParCategorie({
  t,
  locale,
  modeles,
}: {
  t: Traduire;
  locale: string;
  modeles: EntrepriseModeles[];
}) {
  // Une catégorie absente de ce tableau est dépliée : tout est ouvert au départ.
  const [repliees, setRepliees] = useState<Record<string, boolean>>({});

  const categories: Categorie[] = useMemo(
    () =>
      t("attente_cap_ordre")
        .split("|")
        .map((id) => id.trim())
        .filter(Boolean)
        .map((id) => ({ id, titre: t(`attente_cap_${id}_titre`), lignes: lireLignes(t(`attente_cap_${id}_lignes`)) }))
        .filter((c) => c.titre && c.lignes.length > 0),
    [t],
  );

  if (categories.length === 0) return null;
  const libelleBientot = t("attente_cap_bientot");

  return (
    <section aria-label={t("attente_cap_titre")} className="flex flex-col">
      <div className="flex flex-col border-t border-dj-bordure">
        {categories.map((categorie) => {
          const ouverte = !repliees[categorie.id];
          const idPanneau = `capacites-${categorie.id}`;
          return (
            <div key={categorie.id} className="border-b border-dj-bordure">
              <button
                type="button"
                aria-expanded={ouverte}
                aria-controls={idPanneau}
                onClick={() => setRepliees((r) => ({ ...r, [categorie.id]: ouverte }))}
                className="group flex w-full items-center gap-3 py-4 text-left transition-colors hover:text-dj-texte"
              >
                <ChevronRight
                  size={22}
                  aria-hidden
                  className={`shrink-0 text-dj-texte-muet transition-transform duration-300 ease-cgpt-doux group-hover:text-dj-texte motion-reduce:transition-none ${
                    ouverte ? "rotate-90" : "rotate-0"
                  }`}
                />
                <span className="text-lg font-bold text-dj-texte sm:text-xl">{categorie.titre}</span>
              </button>

              {/* Glissement fluide : la hauteur s'anime de 0 à son contenu (grid-template-rows 0fr / 1fr).
                  Fermé, le contenu passe en visibility hidden à la fin du glissement : le clavier n'y entre plus. */}
              <div
                id={idPanneau}
                className={`grid transition-[grid-template-rows,visibility] duration-300 ease-cgpt-doux motion-reduce:transition-none ${
                  ouverte ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <ul className="flex flex-col pb-4 pl-[34px]">
                    {categorie.lignes.map((ligne, i) =>
                      ligne.modeles ? (
                        modeles.length > 0 ? (
                          <li key={`modeles-${i}`} className="py-3">
                            <TableauModeles modeles={modeles} locale={locale} />
                          </li>
                        ) : null
                      ) : (
                        <li
                          key={`${i}-${ligne.texte}`}
                          className={`flex items-start gap-3 border-t border-dj-bordure py-3 text-base first:border-t-0 sm:text-lg ${
                            ligne.bientot ? "text-dj-texte-muet" : "text-dj-texte"
                          }`}
                        >
                          {ligne.bientot ? (
                            <Clock size={18} className="mt-1 shrink-0" aria-hidden />
                          ) : (
                            <Check size={18} className="mt-1 shrink-0 text-dj-texte-muet" aria-hidden />
                          )}
                          <span className="min-w-0">
                            {ligne.texte}
                            {ligne.bientot && libelleBientot && (
                              <span className="ml-2 inline-block rounded-full border border-dj-bordure px-2 py-0.5 align-middle text-xs font-semibold">
                                {libelleBientot}
                              </span>
                            )}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Tableau des modèles, comme dans la liste des modèles de Claude : une ligne d'en-tête par entreprise
// avec son logo, puis un modèle par ligne avec le logo de l'IA (Claude, GPT, Gemini...) juste avant son nom.
function TableauModeles({ modeles, locale }: { modeles: EntrepriseModeles[]; locale: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-dj-bordure">
      {modeles.map((entreprise, i) => (
        <div key={entreprise.distributeur} className={i > 0 ? "border-t border-dj-bordure" : ""}>
          <div className="flex items-center gap-3 bg-dj-surface-haute px-4 py-3 text-dj-texte">
            <IconeEntreprise distributeur={entreprise.distributeur} taille={24} />
            <span className="text-base font-bold sm:text-lg">{entreprise.nom}</span>
          </div>
          <ul>
            {entreprise.modeles.map((modele) => {
              const badge = modele.badge[locale] ?? modele.badge.fr ?? "";
              return (
                <li
                  key={modele.label}
                  className="flex items-center gap-3 border-t border-dj-bordure px-4 py-2.5 text-base text-dj-texte sm:text-lg"
                >
                  <IconeFournisseur distributeur={entreprise.distributeur} taille={20} />
                  <span className="min-w-0 truncate">{modele.label}</span>
                  {badge && (
                    <span className="shrink-0 rounded-full border border-dj-bordure px-2 py-0.5 text-xs font-semibold text-dj-texte-muet">
                      {badge}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
