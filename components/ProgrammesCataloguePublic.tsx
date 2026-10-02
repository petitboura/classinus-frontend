"use client";

import { useEffect, useState } from "react";
import { Search, BookOpen, Download, Upload, Activity, Trash2, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import {
  rechercherProgrammesCataloguePublic,
  obtenirProgrammeCataloguePublic,
  publierProgrammeCataloguePublic,
  modifierProgrammeCataloguePublic,
  supprimerProgrammeCataloguePublic,
  copierProgrammeCataloguePublicVersPerso,
  listerMesCodes,
  analytiqueCatalogueEnLot,
  type ProgrammePublic,
  type ProgrammePublicDetail,
  type NotionPublique,
  type RegleComportementNotion,
  type CodePartage,
  type CompteursCatalogue,
} from "@/lib/api";
import { COULEURS_MATIERE, LIBELLES_REGLE } from "@/components/ProgrammeNotions";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { Skeleton } from "./Skeleton";
import { MenuActionsCarte } from "@/components/MenuActionsCarte";
import { BulleSurvol } from "@/components/BulleSurvol";
import { BoutonEtoile } from "@/components/BoutonEtoile";
import { ProfilPublicModal } from "@/components/ProfilPublicModal";
import { PanneauFlottant } from "./PanneauFlottant";
import { SelectPersonnalise, type OptionMenu } from "./SelectPersonnalise";

/**
 * Catalogue public du Programme (22/09/2026, demande Bourama : "il
 * faut un moyen de partager et de trouver des programmes publics").
 * Même esprit que ComportementsPublics.tsx : recherche publique (pas
 * de compte requis pour consulter), publication et copie vers son
 * espace gatées par un compte.
 *
 * Publier une entrée fige le Programme ENTIER d'un code (jamais une
 * branche partielle) au moment de la publication -- décision Bourama
 * du 22/09 : aucun lien gardé avec le code source après ça, ni après
 * une copie vers l'espace d'un autre prof.
 */
type NoeudNotionPublique = NotionPublique & { enfants: NoeudNotionPublique[] };

/** Même logique que construireArbre() dans ProgrammeNotions.tsx, sur le
 * type NotionPublique (pas de champ statut côté catalogue public). */
function construireArbrePublic(notions: NotionPublique[]): NoeudNotionPublique[] {
  const parId = new Map<string, NoeudNotionPublique>();
  notions.forEach((n) => parId.set(n.id, { ...n, enfants: [] }));
  const racines: NoeudNotionPublique[] = [];
  parId.forEach((n) => {
    const parent = n.notion_parent_id ? parId.get(n.notion_parent_id) : undefined;
    if (parent) parent.enfants.push(n);
    else racines.push(n);
  });
  const trier = (liste: NoeudNotionPublique[]) => {
    liste.sort((a, b) => a.ordre - b.ordre);
    liste.forEach((n) => trier(n.enfants));
  };
  trier(racines);
  return racines;
}

/** Même aplatissement que aplatirSousChapitre() dans ProgrammeNotions.tsx :
 * sous un chapitre, tout le reste (Partie/Notion/plus profond) affiché à
 * plat, avec le fil des ancêtres intermédiaires au-dessus du nom. */
type LigneAplatiePublique = { noeud: NoeudNotionPublique; chemin: string[] };

function aplatirSousChapitrePublic(noeud: NoeudNotionPublique, chemin: string[] = []): LigneAplatiePublique[] {
  const resultat: LigneAplatiePublique[] = [];
  for (const enfant of noeud.enfants) {
    resultat.push({ noeud: enfant, chemin });
    resultat.push(...aplatirSousChapitrePublic(enfant, [...chemin, enfant.nom]));
  }
  return resultat;
}

/** Pastille de règle de comportement -- lecture seule, mêmes libellés que
 * le Programme normal (LIBELLES_REGLE, importé de ProgrammeNotions.tsx). */
function BadgeRegleApercu({ regle }: { regle: RegleComportementNotion }) {
  return (
    <span className="flex-shrink-0 rounded-full border border-dj-bordure bg-dj-surface-haute px-2 py-0.5 text-[10px] font-semibold text-dj-texte-muet">
      {LIBELLES_REGLE[regle]}
    </span>
  );
}

/** Consigne IA affichée directement à la place de la notion concernée --
 * dans le Programme normal elle n'apparaît que dans le panneau d'édition,
 * mais l'aperçu du catalogue public est en lecture seule, il n'y a pas de
 * panneau à ouvrir : elle doit donc être visible en ligne. */
function ConsigneApercu({ texte }: { texte: string }) {
  return <p className="rounded-md bg-dj-surface-haute px-2 py-1 text-[11px] italic text-dj-texte-muet">{texte}</p>;
}

/** En-tête de groupe (Matière ou Chapitre) -- même structure visuelle que
 * EnteteGroupe dans ProgrammeNotions.tsx (bandeau/liseré coloré, chevron
 * de dépliage, nom), sans les boutons d'édition/ajout puisque l'aperçu
 * est en lecture seule. */
function EnteteGroupeApercu({
  noeud,
  ouvert,
  onToggle,
  style,
}: {
  noeud: NoeudNotionPublique;
  ouvert: boolean;
  onToggle: () => void;
  style: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={style}
      className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-left transition-colors"
    >
      <span className="flex-shrink-0" aria-hidden>
        {noeud.enfants.length > 0 ? (
          ouvert ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="inline-block w-3.5" />
        )}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{noeud.nom}</span>
      {noeud.regle_comportement && <BadgeRegleApercu regle={noeud.regle_comportement} />}
    </button>
  );
}

/** Ligne à plat (Partie/Notion/plus profond) -- même fil d'ancêtres en
 * petit au-dessus du nom que LigneAplatie dans ProgrammeNotions.tsx, sans
 * pastille de statut (absente côté catalogue public) ; règle et consigne
 * affichées à la place de la notion quand elles existent. */
function LigneApercu({ item }: { item: LigneAplatiePublique }) {
  const { noeud, chemin } = item;
  return (
    <div className="flex flex-col gap-1 rounded-lg px-2.5 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          {chemin.length > 0 && <div className="truncate text-[11px] text-dj-texte-muet">{chemin.join(" › ")}</div>}
          <div className="truncate text-sm text-dj-texte">{noeud.nom}</div>
        </div>
        {noeud.regle_comportement && <BadgeRegleApercu regle={noeud.regle_comportement} />}
      </div>
      {noeud.consigne_llm && <ConsigneApercu texte={noeud.consigne_llm} />}
    </div>
  );
}

function GroupeChapitreApercu({
  noeud,
  ouverts,
  onToggle,
}: {
  noeud: NoeudNotionPublique;
  ouverts: Set<string>;
  onToggle: (id: string) => void;
}) {
  const ouvert = ouverts.has(noeud.id);
  const lignes = aplatirSousChapitrePublic(noeud);
  return (
    <div className="ml-1">
      <EnteteGroupeApercu
        noeud={noeud}
        ouvert={ouvert}
        onToggle={() => onToggle(noeud.id)}
        style={{ color: "var(--dj-texte)", borderLeft: "2px solid var(--dj-bordure)" }}
      />
      {noeud.consigne_llm && (
        <div className="ml-3 mt-0.5">
          <ConsigneApercu texte={noeud.consigne_llm} />
        </div>
      )}
      {ouvert && (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-dj-bordure pl-2">
          {lignes.length === 0 && <p className="px-2.5 py-1.5 text-xs text-dj-texte-muet">Aucun élément.</p>}
          {lignes.map((item) => (
            <LigneApercu key={item.noeud.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupeMatiereApercu({
  noeud,
  index,
  ouverts,
  onToggle,
}: {
  noeud: NoeudNotionPublique;
  index: number;
  ouverts: Set<string>;
  onToggle: (id: string) => void;
}) {
  const ouvert = ouverts.has(noeud.id);
  const couleur = COULEURS_MATIERE[index % COULEURS_MATIERE.length];
  return (
    <div>
      <EnteteGroupeApercu
        noeud={noeud}
        ouvert={ouvert}
        onToggle={() => onToggle(noeud.id)}
        style={{ background: couleur.conteneur, color: couleur.texte }}
      />
      {noeud.consigne_llm && (
        <div className="mt-0.5">
          <ConsigneApercu texte={noeud.consigne_llm} />
        </div>
      )}
      {ouvert && (
        <div className="mt-1 flex flex-col gap-2">
          {noeud.enfants.map((enfant) => (
            <GroupeChapitreApercu key={enfant.id} noeud={enfant} ouverts={ouverts} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgrammesCataloguePublic({ mesCodes }: { mesCodes: CodePartage[] | undefined }) {
  const [liste, setListe] = useState<ProgrammePublic[] | undefined>(undefined);
  const [recherche, setRecherche] = useState("");
  const [sansCompte, setSansCompte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [codePublicationId, setCodePublicationId] = useState("");
  const [nomPublication, setNomPublication] = useState("");
  const [descriptionPublication, setDescriptionPublication] = useState("");
  const [reglesConsignesPublication, setReglesConsignesPublication] = useState(false);
  const [envoiPublication, setEnvoiPublication] = useState(false);
  const [erreurPublication, setErreurPublication] = useState<string | null>(null);

  const [apercu, setApercu] = useState<ProgrammePublicDetail | null>(null);
  const [ouvertsApercu, setOuvertsApercu] = useState<Set<string>>(new Set());
  const [entreeEnEdition, setEntreeEnEdition] = useState<ProgrammePublic | null>(null);
  const [formNom, setFormNom] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [erreurEdition, setErreurEdition] = useState<string | null>(null);
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);

  const [entreeACopier, setEntreeACopier] = useState<ProgrammePublicDetail | null>(null);
  const [codeCopieId, setCodeCopieId] = useState("");
  const [reglesConsignesCopie, setReglesConsignesCopie] = useState(false);
  const [envoiCopie, setEnvoiCopie] = useState(false);
  const [erreurCopie, setErreurCopie] = useState<string | null>(null);

  const [suppressionEnCours, setSuppressionEnCours] = useState<string | null>(null);
  const [analytiqueCatalogue, setAnalytiqueCatalogue] = useState<Record<string, CompteursCatalogue>>({});
  const [profilOuvert, setProfilOuvert] = useState<{
    userId: string;
    compteurs?: CompteursCatalogue;
    element: { typeElement: "programme"; elementId: string };
  } | null>(null);

  function charger(q?: string) {
    rechercherProgrammesCataloguePublic(q, 15)
      .then((r) => setListe(r.programmes))
      .catch(() => setListe([]));
  }

  useEffect(() => {
    charger();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => charger(recherche), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche]);

  // Même pattern qu'ailleurs dans le catalogue public : un seul appel en
  // lot pour toute la liste affichée, jamais un appel par carte.
  const idsAnalytique = (liste ?? []).map((p) => p.id).join(",");
  useEffect(() => {
    if (!idsAnalytique) return;
    const elements = idsAnalytique.split(",").map((id) => ({ typeElement: "programme" as const, id }));
    analytiqueCatalogueEnLot(elements)
      .then((res) => setAnalytiqueCatalogue((prev) => ({ ...prev, ...res })))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsAnalytique]);

  const optionsCodes: OptionMenu[] = (mesCodes ?? []).map((c) => ({ id: c.id, label: c.nom || c.code }));

  async function publier() {
    if (!codePublicationId || !nomPublication.trim()) return;
    setEnvoiPublication(true);
    setErreurPublication(null);
    try {
      const cree = await publierProgrammeCataloguePublic({
        codeId: codePublicationId,
        nom: nomPublication,
        description: descriptionPublication,
        inclureReglesConsignes: reglesConsignesPublication,
      });
      setListe((prec) => [cree, ...(prec || [])]);
      setCodePublicationId("");
      setNomPublication("");
      setDescriptionPublication("");
      setReglesConsignesPublication(false);
      setFormulaireOuvert(false);
    } catch (e) {
      if (e instanceof ErreurApi && e.statusCode === 401) {
        setSansCompte(true);
      } else if (e instanceof ErreurApi && e.code === "PROGRAMME_VIDE") {
        setErreurPublication("Ce code n'a pas encore de Programme, rien à publier.");
      } else {
        setErreurPublication(messageErreur(e));
      }
    } finally {
      setEnvoiPublication(false);
    }
  }

  async function ouvrirApercu(p: ProgrammePublic) {
    try {
      const detail = await obtenirProgrammeCataloguePublic(p.id);
      setApercu(detail);
      setOuvertsApercu(new Set());
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  function basculerOuvertApercu(id: string) {
    setOuvertsApercu((prec) => {
      const copie = new Set(prec);
      if (copie.has(id)) copie.delete(id);
      else copie.add(id);
      return copie;
    });
  }

  function ouvrirEdition(p: ProgrammePublic) {
    setEntreeEnEdition(p);
    setFormNom(p.nom);
    setFormDescription(p.description);
    setErreurEdition(null);
  }

  async function enregistrerEdition() {
    if (!entreeEnEdition) return;
    setEnregistrementEnCours(true);
    setErreurEdition(null);
    try {
      const modifie = await modifierProgrammeCataloguePublic(entreeEnEdition.id, {
        nom: formNom.trim() || undefined,
        description: formDescription,
      });
      setListe((prev) => prev?.map((x) => (x.id === modifie.id ? { ...x, nom: modifie.nom, description: modifie.description } : x)));
      setEntreeEnEdition(null);
    } catch (e) {
      setErreurEdition(messageErreur(e));
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function supprimer(p: ProgrammePublic) {
    if (suppressionEnCours) return;
    setSuppressionEnCours(p.id);
    setErreur(null);
    try {
      await supprimerProgrammeCataloguePublic(p.id);
      setListe((prec) => (prec || []).filter((x) => x.id !== p.id));
      if (apercu?.id === p.id) setApercu(null);
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setSuppressionEnCours(null);
    }
  }

  function ouvrirCopie(p: ProgrammePublicDetail) {
    setEntreeACopier(p);
    setCodeCopieId("");
    setReglesConsignesCopie(false);
    setErreurCopie(null);
  }

  async function copierVersPerso() {
    if (!entreeACopier) return;
    setEnvoiCopie(true);
    setErreurCopie(null);
    try {
      await copierProgrammeCataloguePublicVersPerso(entreeACopier.id, {
        codeId: codeCopieId || undefined,
        nouveauCodeNom: codeCopieId ? undefined : entreeACopier.nom,
        inclureReglesConsignes: reglesConsignesCopie,
      });
      setEntreeACopier(null);
      setApercu(null);
    } catch (e) {
      if (e instanceof ErreurApi && e.statusCode === 401) {
        setSansCompte(true);
      } else {
        setErreurCopie(messageErreur(e));
      }
    } finally {
      setEnvoiCopie(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2">
          <Search size={14} className="flex-shrink-0 text-dj-texte-muet" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher un Programme public (nom, description)…"
            className="w-full min-w-0 bg-transparent text-sm text-dj-texte outline-none placeholder:text-dj-texte-muet"
          />
        </div>
        <button
          onClick={() => setFormulaireOuvert((v) => !v)}
          className="flex flex-shrink-0 items-center gap-1.5 rounded-cgpt-bouton border border-dj-bordure px-3 py-2 text-xs font-medium text-dj-texte hover:bg-dj-surface-haute"
        >
          <Upload size={14} /> Publier mon Programme
        </button>
      </div>

      {sansCompte && <CTACompteRequis texte="Crée un compte pour publier ou récupérer un Programme public." />}

      {formulaireOuvert && (
        <div className="flex flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-dj-texte-muet">Code à publier (Programme entier)</label>
            <SelectPersonnalise
              options={optionsCodes}
              valeur={codePublicationId}
              onChange={setCodePublicationId}
              placeholder="Choisir un code…"
            />
          </div>
          <input
            value={nomPublication}
            onChange={(e) => setNomPublication(e.target.value)}
            placeholder="Nom de cette entrée dans le catalogue"
            className="w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
          />
          <textarea
            value={descriptionPublication}
            onChange={(e) => setDescriptionPublication(e.target.value)}
            placeholder="Description (optionnelle)"
            rows={2}
            className="w-full resize-none rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
          />
          <label className="flex items-center gap-2 text-xs text-dj-texte-muet">
            <input
              type="checkbox"
              checked={reglesConsignesPublication}
              onChange={(e) => setReglesConsignesPublication(e.target.checked)}
            />
            Inclure les règles de comportement et consignes IA de chaque notion
          </label>
          {erreurPublication && <p className="text-xs text-[var(--dj-erreur)]">{erreurPublication}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={publier}
              disabled={!codePublicationId || !nomPublication.trim() || envoiPublication}
              className="rounded-cgpt-bouton bg-dj-accent-1 px-4 py-1.5 text-xs font-bold text-[#1A0D02] hover:bg-dj-accent-2 disabled:opacity-50"
            >
              {envoiPublication ? "Publication…" : "Publier"}
            </button>
            <button
              onClick={() => setFormulaireOuvert(false)}
              className="rounded-cgpt-bouton border border-dj-bordure px-3 py-1.5 text-xs font-medium text-dj-texte"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

      {liste === undefined && (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
      )}

      {liste && liste.length === 0 && (
        <p className="text-sm text-dj-texte-muet">
          {recherche ? "Aucun résultat pour cette recherche." : "Rien de publié pour l'instant."}
        </p>
      )}

      {liste && liste.length > 0 && (
        <div className="flex flex-col gap-2">
          {liste.map((p) => (
            <div
              key={p.id}
              onClick={() => ouvrirApercu(p)}
              className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-xl border border-dj-bordure bg-dj-surface px-4 py-3 transition-colors hover:border-dj-bordure-forte"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <BookOpen size={16} className="mt-0.5 flex-shrink-0 self-start text-dj-texte-muet" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-dj-texte">{p.nom}</p>
                  <BulleSurvol texte={p.description} className="line-clamp-2 text-xs text-dj-texte-muet">
                    {p.description || "Sans description"}
                  </BulleSurvol>
                </div>
              </div>
              <BoutonEtoile
                typeElement="programme"
                elementId={p.id}
                count={p.etoiles_count ?? 0}
                active={p.mon_etoile ?? false}
                onBascule={(etoile, etoilesCount) =>
                  setListe((prev) => prev?.map((x) => (x.id === p.id ? { ...x, mon_etoile: etoile, etoiles_count: etoilesCount } : x)))
                }
              />
              <MenuActionsCarte
                ariaLabel={`Actions pour ${p.nom}`}
                actions={[
                  {
                    cle: "recuperer",
                    label: "Récupérer dans mon espace",
                    icone: <Download size={14} />,
                    onClick: async () => {
                      const detail = await obtenirProgrammeCataloguePublic(p.id);
                      ouvrirCopie(detail);
                    },
                  },
                  {
                    cle: "details",
                    label: "Activité",
                    icone: <Activity size={14} />,
                    onClick: () =>
                      setProfilOuvert({
                        userId: p.publie_par,
                        compteurs: analytiqueCatalogue[`programme:${p.id}`],
                        element: { typeElement: "programme", elementId: p.id },
                      }),
                  },
                  ...(p.est_a_moi
                    ? [
                        {
                          cle: "modifier",
                          label: "Modifier (nom, description)",
                          icone: <Pencil size={14} />,
                          onClick: () => ouvrirEdition(p),
                        },
                        {
                          cle: "supprimer",
                          label: "Supprimer du catalogue public",
                          icone: <Trash2 size={14} />,
                          destructif: true,
                          onClick: () => supprimer(p),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          ))}
        </div>
      )}

      {apercu && (
        <PanneauFlottant onFerme={() => setApercu(null)} entete={<h3 className="font-display text-sm font-semibold text-dj-texte">{apercu.nom}</h3>}>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-dj-texte-muet">{apercu.description || "Sans description"}</p>
            <p className="text-xs text-dj-texte-muet">
              {apercu.inclut_regles_consignes ? "Inclut les règles et consignes IA" : "Sans règles ni consignes IA"} ·{" "}
              {apercu.etoiles_count} étoile(s)
            </p>
            <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-lg border border-dj-bordure bg-dj-surface-haute p-2">
              {apercu.notions.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-dj-texte-muet">Aucune notion.</p>
              ) : (
                construireArbrePublic(apercu.notions).map((noeud, index) => (
                  <GroupeMatiereApercu
                    key={noeud.id}
                    noeud={noeud}
                    index={index}
                    ouverts={ouvertsApercu}
                    onToggle={basculerOuvertApercu}
                  />
                ))
              )}
            </div>
            <button
              onClick={() => ouvrirCopie(apercu)}
              className="flex items-center justify-center gap-1.5 rounded-cgpt-bouton bg-dj-accent-1 px-4 py-2 text-xs font-bold text-[#1A0D02] hover:bg-dj-accent-2"
            >
              <Download size={14} /> Récupérer dans mon espace
            </button>
          </div>
        </PanneauFlottant>
      )}

      {entreeACopier && (
        <PanneauFlottant onFerme={() => setEntreeACopier(null)} entete={<h3 className="font-display text-sm font-semibold text-dj-texte">Récupérer « {entreeACopier.nom} »</h3>}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-dj-texte-muet">
                Vers un code existant, ou laisse vide pour créer un nouveau code « {entreeACopier.nom} »
              </label>
              <SelectPersonnalise
                options={optionsCodes}
                valeur={codeCopieId}
                onChange={setCodeCopieId}
                placeholder="Nouveau code…"
              />
            </div>
            {entreeACopier.inclut_regles_consignes && (
              <label className="flex items-center gap-2 text-xs text-dj-texte-muet">
                <input type="checkbox" checked={reglesConsignesCopie} onChange={(e) => setReglesConsignesCopie(e.target.checked)} />
                Reprendre aussi les règles de comportement et consignes IA
              </label>
            )}
            {erreurCopie && <p className="text-xs text-[var(--dj-erreur)]">{erreurCopie}</p>}
            <button
              onClick={copierVersPerso}
              disabled={envoiCopie}
              className="rounded-cgpt-bouton bg-dj-accent-1 px-4 py-1.5 text-xs font-bold text-[#1A0D02] hover:bg-dj-accent-2 disabled:opacity-50"
            >
              {envoiCopie ? "Copie…" : "Récupérer"}
            </button>
          </div>
        </PanneauFlottant>
      )}

      {entreeEnEdition && (
        <PanneauFlottant onFerme={() => setEntreeEnEdition(null)} entete={<h3 className="font-display text-sm font-semibold text-dj-texte">Modifier</h3>}>
          <div className="flex flex-col gap-3">
            <input
              value={formNom}
              onChange={(e) => setFormNom(e.target.value)}
              className="w-full rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
            />
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
            />
            {erreurEdition && <p className="text-xs text-[var(--dj-erreur)]">{erreurEdition}</p>}
            <button
              onClick={enregistrerEdition}
              disabled={enregistrementEnCours}
              className="rounded-md bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] disabled:opacity-50"
            >
              {enregistrementEnCours ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </PanneauFlottant>
      )}

      {profilOuvert && (
        <ProfilPublicModal
          userId={profilOuvert.userId}
          compteurs={profilOuvert.compteurs}
          element={profilOuvert.element}
          onFermer={() => setProfilOuvert(null)}
        />
      )}
    </div>
  );
}
