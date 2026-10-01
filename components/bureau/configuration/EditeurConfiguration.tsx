"use client";

import { useEffect, useState } from "react";
import { Check, Link2, Trash2, X, FileText, type LucideIcon } from "lucide-react";
import {
  ajouterComportement,
  modifierComportement,
  supprimerComportement,
  type Comportement,
  type CategorieConfiguration,
} from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { texteConfiguration, type IdTexteConfiguration } from "@/lib/i18n/textesConfiguration";
import { assemblerProcedure, assemblerComportement, lireProcedure, lireComportement } from "@/lib/formatsConfiguration";
import { OngletsSegment } from "@/components/OngletsSegment";
import { CaseACocher } from "@/components/CaseACocher";
import { BoutonAvecIA } from "@/components/BoutonAvecIA";
import { SelecteurCodesPartage } from "@/components/SelecteurCodesPartage";
import {
  FormulaireProcedure,
  FormulaireRegle,
  FormulaireComportement,
  FormulaireStyle,
} from "@/components/bureau/configuration/FormulairesConfiguration";

// 01/10/2026, demande Bourama : l'éditeur propre à la section
// Configuration. Chaque catégorie y a son propre formulaire (voir
// FormulairesConfiguration.tsx), mais l'enregistrement passe par les
// mêmes appels que tout le reste : un seul texte assemblé, jamais une
// structure à part. Cet éditeur ne contient volontairement rien qui
// parle de skill (ni texte, ni vue du fichier généré, ni import, ni
// publication au catalogue public).
export function EditeurConfiguration({
  agentId,
  categorie,
  comportement,
  Icone,
  onFermer,
  onCree,
  onModifie,
  onSupprime,
  onActionEnCoursChange,
}: {
  agentId: string;
  categorie: CategorieConfiguration;
  comportement: Comportement | null;
  Icone: LucideIcon;
  onFermer: () => void;
  onCree: (c: Comportement) => void;
  onModifie: (c: Comportement) => void;
  onSupprime: (id: string) => void;
  onActionEnCoursChange?: (enCours: boolean) => void;
}) {
  const estCreation = comportement === null;
  const texteInitial = comportement?.texte || "";

  const [onglet, setOnglet] = useState<"contenu" | "codes">("contenu");
  const [etapes, setEtapes] = useState<string[]>(() => (categorie === "procedure" ? lireProcedure(texteInitial) : [""]));
  const [cas, setCas] = useState(() => (categorie === "comportement" ? lireComportement(texteInitial).cas : ""));
  const [reaction, setReaction] = useState(() => (categorie === "comportement" ? lireComportement(texteInitial).reaction : ""));
  const [texteLibre, setTexteLibre] = useState(categorie === "regle" || categorie === "style" ? texteInitial : "");
  const [nom, setNom] = useState(comportement?.nom || "");
  const [nomAuto, setNomAuto] = useState(estCreation);
  const [quandUtiliser, setQuandUtiliser] = useState(comportement?.description || "");
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const actionEnCours = enregistrementEnCours || suppressionEnCours;
  useEffect(() => {
    onActionEnCoursChange?.(actionEnCours);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionEnCours]);

  // Le comportement n'a pas le champ "quand l'utiliser" : son premier
  // champ ("dans tel cas") dit déjà quand, ce serait un doublon. La
  // règle n'a pas de nom : c'est elle même, en une ligne, qui s'affiche.
  const aChampNom = categorie !== "regle";
  const aChampQuand = categorie === "procedure" || categorie === "style" || (categorie === "regle" && !estCreation);

  function texteAssemble(): string {
    if (categorie === "procedure") return assemblerProcedure(etapes);
    if (categorie === "comportement") return cas.trim() && reaction.trim() ? assemblerComportement(cas, reaction) : "";
    return texteLibre.trim();
  }

  const texte = texteAssemble();

  async function enregistrer() {
    if (!texte || actionEnCours) return;
    const nomFinal = aChampNom && !nomAuto ? nom.trim() || null : null;
    const quandFinal = aChampQuand ? quandUtiliser.trim() || null : null;
    setEnregistrementEnCours(true);
    setErreur(null);
    try {
      if (estCreation) {
        const cree = await ajouterComportement(agentId, texte, nomFinal, undefined, undefined, categorie, quandFinal);
        onCree(cree);
        onFermer();
        return;
      }
      if (!comportement) return;
      if (texte === comportement.texte && nomFinal === (comportement.nom || null) && (!aChampQuand || quandFinal === (comportement.description || null))) {
        onFermer();
        return;
      }
      const maj = await modifierComportement(agentId, comportement.id, texte, nomFinal, quandFinal);
      onModifie(maj);
      onFermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnregistrementEnCours(false);
    }
  }

  async function supprimer() {
    if (estCreation || !comportement || actionEnCours) return;
    setSuppressionEnCours(true);
    setErreur(null);
    try {
      await supprimerComportement(agentId, comportement.id);
      onSupprime(comportement.id);
      onFermer();
    } catch (e) {
      setErreur(messageErreur(e));
      setSuppressionEnCours(false);
    }
  }

  const titre = texteConfiguration(`titre.${estCreation ? "creation" : "edition"}.${categorie}` as IdTexteConfiguration);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-shrink-0 items-center justify-between">
        <span className="flex items-center gap-2">
          <Icone size={16} className="flex-shrink-0 text-dj-texte-muet" />
          <span className="text-sm font-medium text-dj-texte">{titre}</span>
          {!estCreation && comportement && (
            <BoutonAvecIA
              variante="icone"
              libelle={texteConfiguration("action.ia")}
              texte={
                `Je veux utiliser cet élément id ${comportement.id}. ` +
                `Utilise l'outil gerer_comportement (action "consulter") avec cet id pour voir de quoi il s'agit, ` +
                `puis discutons-en ensemble.`
              }
            />
          )}
        </span>
        <button
          onClick={onFermer}
          disabled={actionEnCours}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-dj-texte-muet transition-colors hover:bg-dj-surface-haute disabled:opacity-50"
        >
          <X size={14} /> {texteConfiguration("action.fermer")}
        </button>
      </div>

      {!estCreation && (
        <div className="mb-3 flex-shrink-0">
          <OngletsSegment
            ariaLabel={texteConfiguration("editeur.ariaOnglets")}
            valeur={onglet}
            onChange={(v) => setOnglet(v as "contenu" | "codes")}
            onglets={[
              { valeur: "contenu", libelle: texteConfiguration("editeur.onglet.contenu"), icone: FileText },
              { valeur: "codes", libelle: texteConfiguration("editeur.onglet.codes"), icone: Link2 },
            ]}
          />
        </div>
      )}

      {onglet === "codes" && !estCreation && comportement && <SelecteurCodesPartage type="comportement" id={comportement.id} />}

      {onglet === "contenu" && (
        <div className="flex min-h-0 flex-1 animate-dj-fade-in-rapide flex-col">
          {aChampNom && (
            <div className="flex w-full flex-col gap-1.5 pb-3 sm:flex-row sm:items-center">
              <input
                value={nomAuto ? "" : nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={nomAuto}
                placeholder={texteConfiguration(nomAuto ? "champ.nom.auto" : "champ.nom.placeholder")}
                className="flex-1 rounded-cgpt-carte border border-dj-bordure bg-dj-surface-haute px-3 py-1.5 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte disabled:opacity-50"
              />
              <label className="flex flex-shrink-0 items-center gap-1.5 text-xs text-dj-texte-muet">
                <CaseACocher checked={nomAuto} onChange={setNomAuto} />
                {texteConfiguration("champ.nom.caseAuto")}
              </label>
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {categorie === "procedure" && <FormulaireProcedure etapes={etapes} onChange={setEtapes} />}
            {categorie === "regle" && <FormulaireRegle texte={texteLibre} onChange={setTexteLibre} onValider={enregistrer} />}
            {categorie === "comportement" && (
              <FormulaireComportement cas={cas} reaction={reaction} onChangeCas={setCas} onChangeReaction={setReaction} />
            )}
            {categorie === "style" && <FormulaireStyle texte={texteLibre} onChange={setTexteLibre} />}

            {aChampQuand && (
              <div className="flex flex-col gap-1 pt-4">
                <label className="text-xs font-medium text-dj-texte-muet">{texteConfiguration("champ.quandUtiliser.libelle")}</label>
                <input
                  value={quandUtiliser}
                  onChange={(e) => setQuandUtiliser(e.target.value)}
                  placeholder={texteConfiguration("champ.quandUtiliser.placeholder")}
                  className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface-haute px-3 py-1.5 text-sm text-dj-texte outline-none focus:border-dj-bordure-forte"
                />
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {erreur ? <p className="text-xs text-[var(--dj-erreur)]">{erreur}</p> : <span className="hidden sm:block" />}
            <div className="flex flex-wrap items-center gap-2">
              {!estCreation && (
                <button
                  onClick={supprimer}
                  disabled={actionEnCours}
                  className="flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-2 text-sm text-[var(--dj-erreur)] transition-colors hover:bg-[var(--dj-erreur)]/10 disabled:opacity-50"
                >
                  <Trash2 size={14} /> {texteConfiguration("action.supprimer")}
                </button>
              )}
              <button
                onClick={enregistrer}
                disabled={actionEnCours || !texte}
                className="flex items-center gap-1.5 rounded-lg bg-dj-accent-1 px-4 py-2 text-sm font-semibold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
              >
                <Check size={14} />{" "}
                {texteConfiguration(enregistrementEnCours ? "action.enregistrement" : estCreation ? "action.creer" : "action.enregistrer")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
