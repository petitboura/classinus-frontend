"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, CircleAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import {
  clePermissionCategorie,
  lirePermissionsOutils,
  reglerPermissionOutil,
  type CategoriePermission,
  type EtatPermissionOutil,
  type OutilPermission,
  type VuePermissionsOutils,
} from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { useLocale } from "@/lib/i18n/useLocale";
import { Skeleton } from "@/components/Skeleton";

// Section « Permissions des outils » d'une application connectée ou d'un serveur MCP personnalisé
// (25/11/2026). Deux catégories (lecture, écriture), chacune avec trois choix : Autoriser, Demander,
// Bloquer, et une exception possible outil par outil. Le changement s'affiche tout de suite au clic ;
// l'enregistrement part en arrière-plan et, s'il échoue, on remet les vrais réglages du serveur.

const ETATS: { valeur: EtatPermissionOutil; libelle: string }[] = [
  { valeur: "autoriser", libelle: "Autoriser" },
  { valeur: "demander", libelle: "Demander" },
  { valeur: "bloquer", libelle: "Bloquer" },
];

const TEXTES_CATEGORIE = {
  lecture: {
    titre: "Outils en lecture seule",
    aide: "Consulter, chercher, lister. Rien n'est modifié.",
  },
  ecriture: {
    titre: "Outils qui écrivent ou suppriment",
    aide: "Créer, modifier, supprimer ou lancer une action.",
  },
} as const;

type Suivi = { voulu: EtatPermissionOutil | null };

function etatEffectifOutil(outil: OutilPermission, categorie: CategoriePermission): EtatPermissionOutil {
  const choisi = outil.etat ?? categorie.etat ?? categorie.par_defaut;
  // Une action qui doit toujours être confirmée ne peut pas être autorisée d'avance.
  return choisi === "autoriser" && !outil.autorisation_possible ? "demander" : choisi;
}

// Trois boutons collés, un seul choisi (pas de liste native : voir CLAUDE.md).
function ChoixEtat({
  valeur,
  onChoisir,
  libelleGroupe,
  autorisationPossible = true,
}: {
  valeur: EtatPermissionOutil;
  onChoisir: (etat: EtatPermissionOutil) => void;
  libelleGroupe: string;
  autorisationPossible?: boolean;
}) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  return (
    <div role="radiogroup" aria-label={libelleGroupe} className="inline-flex shrink-0 overflow-hidden rounded-lg border border-dj-bordure">
      {ETATS.map(({ valeur: etat, libelle }) => {
        const choisi = valeur === etat;
        const interdit = etat === "autoriser" && !autorisationPossible;
        return (
          <button
            key={etat}
            type="button"
            role="radio"
            aria-checked={choisi}
            disabled={interdit}
            title={interdit ? t("Cette action demande toujours ta confirmation.") : undefined}
            onClick={() => { if (!choisi) onChoisir(etat); }}
            className={
              "px-2.5 py-1.5 text-xs font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 " +
              (choisi
                ? etat === "bloquer"
                  ? "bg-dj-surface font-bold text-[var(--dj-erreur)] ring-1 ring-inset ring-[var(--dj-erreur)]"
                  : "bg-dj-accent-1 text-[#1A0D02]"
                : "text-dj-texte hover:bg-dj-surface-haute")
            }
          >
            {t(libelle)}
          </button>
        );
      })}
    </div>
  );
}

export function PermissionsOutils({ groupe }: { groupe: string }) {
  const locale = useLocale();
  const t = (texte: string) => traduireTexteInterface(texte, locale);
  const [vue, setVue] = useState<VuePermissionsOutils | null>(null);
  const [chargement, setChargement] = useState(true);
  const [introuvable, setIntrouvable] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvertes, setOuvertes] = useState<Record<string, boolean>>({});
  const [avertissement, setAvertissement] = useState(false);
  const envois = useRef<Map<string, Suivi>>(new Map());

  const charger = useCallback(async () => {
    try {
      setVue(await lirePermissionsOutils(groupe));
      setIntrouvable(false);
    } catch (e) {
      // Application sans réglages d'outils : la section n'apparaît simplement pas.
      if (e instanceof ErreurApi && e.statusCode === 404) setIntrouvable(true);
      else setErreur(messageErreur(e));
    } finally {
      setChargement(false);
    }
  }, [groupe]);

  useEffect(() => { void charger(); }, [charger]);

  function afficher(cle: string, etat: EtatPermissionOutil | null) {
    setVue((avant) => {
      if (!avant) return avant;
      return {
        ...avant,
        categories: avant.categories.map((categorie) => {
          if (clePermissionCategorie(groupe, categorie.type) === cle) {
            const nouvelle = { ...categorie, etat };
            return { ...nouvelle, etat_effectif: etat ?? categorie.par_defaut };
          }
          return { ...categorie, outils: categorie.outils.map((o) => (o.cle === cle ? { ...o, etat } : o)) };
        }),
      };
    });
  }

  async function envoyer(cle: string, suivi: Suivi) {
    let envoye = suivi.voulu;
    try {
      do {
        envoye = suivi.voulu;
        await reglerPermissionOutil(groupe, cle, envoye);
      } while (suivi.voulu !== envoye);
    } catch (e) {
      // L'enregistrement a échoué : on remet les vrais réglages, puis on affiche l'erreur.
      await charger();
      setErreur(messageErreur(e));
    } finally {
      envois.current.delete(cle);
    }
  }

  // Plusieurs clics rapides : une seule requête à la fois par réglage, la dernière valeur voulue gagne.
  function regler(cle: string, etat: EtatPermissionOutil | null) {
    setErreur(null);
    afficher(cle, etat);
    const enCours = envois.current.get(cle);
    if (enCours) {
      enCours.voulu = etat;
      return;
    }
    const suivi: Suivi = { voulu: etat };
    envois.current.set(cle, suivi);
    void envoyer(cle, suivi);
  }

  function choisirCategorie(categorie: CategoriePermission, etat: EtatPermissionOutil) {
    // Autoriser d'un coup tout ce qui écrit ou supprime : avertissement avant d'activer.
    if (categorie.type === "ecriture" && etat === "autoriser") {
      setAvertissement(true);
      return;
    }
    setAvertissement(false);
    regler(clePermissionCategorie(groupe, categorie.type), etat);
  }

  if (introuvable) return null;

  if (chargement) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-dj-bordure p-3" aria-busy="true">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dj-bordure p-3">
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-dj-texte"><ShieldCheck size={14} />{t("Permissions des outils")}</p>
        <p className="mt-1 text-xs leading-5 text-dj-texte-muet">
          {t("Choisis ce que Classinus peut faire avec cette application. Tu peux régler une catégorie entière, puis faire une exception outil par outil.")}
        </p>
      </div>

      {erreur && (
        <div role="alert" className="flex items-start gap-2 text-xs text-[var(--dj-erreur)]">
          <CircleAlert size={14} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1 break-words">{erreur}</span>
          {!vue && <button type="button" onClick={() => { setErreur(null); setChargement(true); void charger(); }} className="shrink-0 font-semibold underline">{t("Réessayer")}</button>}
        </div>
      )}

      {vue?.categories.map((categorie) => {
        const textes = TEXTES_CATEGORIE[categorie.type];
        const ouverte = !!ouvertes[categorie.type];
        const effectifCategorie = categorie.etat ?? categorie.par_defaut;
        return (
          <section key={categorie.type} className="flex flex-col gap-2 rounded-lg bg-dj-surface-haute p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <h5 className="text-sm font-semibold text-dj-texte">{t(textes.titre)} ({categorie.outils.length})</h5>
                <p className="text-xs leading-5 text-dj-texte-muet">{t(textes.aide)}</p>
              </div>
              <ChoixEtat valeur={effectifCategorie} onChoisir={(etat) => choisirCategorie(categorie, etat)} libelleGroupe={t(textes.titre)} />
            </div>

            {categorie.type === "ecriture" && avertissement && (
              <div role="alertdialog" aria-label={t("Autoriser tous les outils qui écrivent ?")} className="animate-dj-fade-in-rapide motion-reduce:animate-none flex flex-col gap-2 rounded-lg border border-[var(--dj-erreur)]/40 p-3">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-dj-texte"><TriangleAlert size={15} className="text-[var(--dj-erreur)]" />{t("Autoriser tous les outils qui écrivent ?")}</p>
                <p className="text-xs leading-5 text-dj-texte-muet">
                  {t("Ils pourront créer, modifier ou supprimer des données sans te demander. Une erreur de l'IA pourrait avoir des effets difficiles à annuler. Les actions qui exigent toujours ta confirmation te la demanderont quand même.")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { setAvertissement(false); regler(clePermissionCategorie(groupe, "ecriture"), "autoriser"); }}
                    className="inline-flex items-center justify-center rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2"
                  >
                    {t("Autoriser quand même")}
                  </button>
                  <button type="button" onClick={() => setAvertissement(false)} className="inline-flex items-center justify-center rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-fond">
                    {t("Annuler")}
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-dj-texte-muet">
              {categorie.etat === null ? `${t("Par défaut")} : ${t(ETATS.find((e) => e.valeur === categorie.par_defaut)?.libelle ?? "")}` : t("Réglage choisi par toi")}
              {categorie.etat !== null && (
                <button type="button" onClick={() => regler(clePermissionCategorie(groupe, categorie.type), null)} className="ml-2 font-semibold underline">{t("Revenir au réglage par défaut")}</button>
              )}
            </p>

            {categorie.outils.length > 0 && (
              <>
                <button
                  type="button"
                  aria-expanded={ouverte}
                  onClick={() => setOuvertes((avant) => ({ ...avant, [categorie.type]: !avant[categorie.type] }))}
                  className="inline-flex items-center gap-1 self-start text-xs font-semibold text-dj-texte"
                >
                  <ChevronDown size={14} className={"transition-transform duration-200 motion-reduce:transition-none " + (ouverte ? "rotate-180" : "")} />
                  {ouverte ? t("Masquer les outils") : t("Afficher les outils")}
                </button>
                {ouverte && (
                  <ul className="animate-dj-fade-in-rapide motion-reduce:animate-none flex flex-col gap-2">
                    {categorie.outils.map((outil) => (
                      <li key={outil.cle} className="flex flex-col gap-1.5 border-t border-dj-bordure pt-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-sm text-dj-texte">{outil.nom_lisible}</p>
                          {outil.etat !== null && (
                            <button type="button" onClick={() => regler(outil.cle, null)} className="text-xs font-semibold text-dj-texte-muet underline">{t("Suivre la catégorie")}</button>
                          )}
                        </div>
                        <ChoixEtat
                          valeur={etatEffectifOutil(outil, categorie)}
                          onChoisir={(etat) => regler(outil.cle, etat)}
                          libelleGroupe={outil.nom_lisible}
                          autorisationPossible={outil.autorisation_possible}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {categorie.outils.length === 0 && (
              <p className="text-xs text-dj-texte-muet">{t("Aucun outil de ce type pour le moment. Ouvre le panneau après avoir testé le serveur pour les voir.")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
