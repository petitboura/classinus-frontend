"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clesRequetes } from "@/lib/clesRequetes";
import dynamic from "next/dynamic";
import { MessageSquareText, Copy, Trash2, Tag, ChevronRight, ChevronDown } from "lucide-react";
import {
  listerSignalementsRecus,
  demanderVisibiliteSignalement,
  rattacherSignalementPedagogique,
  dupliquerSignalementPedagogique,
  supprimerSignalementPedagogique,
  listerMesCodes,
  listerNotions,
  type SignalementPedagogique,
  type CodePartage,
  type Notion,
} from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";
import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";
import { SelectPersonnalise } from "./SelectPersonnalise";

// Même rendu markdown que les réponses du chat (titres, listes, code, formules),
// chargé à la demande : il est lourd et ne sert qu'à l'ouverture d'un signalement.
const RenduMarkdownAutonome = dynamic(
  () => import("./chat/RenduMarkdownAutonome").then((m) => m.RenduMarkdownAutonome),
  { ssr: false }
);

function ChampMarkdown({ libelle, texte, attenue = true }: { libelle: string; texte: string; attenue?: boolean }) {
  return (
    <div className="mt-2 first:mt-0">
      <div className="text-xs font-medium text-dj-texte">{libelle}</div>
      <div className={`text-sm ${attenue ? "text-dj-texte-muet" : "text-dj-texte"}`}>
        <RenduMarkdownAutonome texte={texte} />
      </div>
    </div>
  );
}

const CHAMPS: { id: "question" | "reponse" | "conversation"; label: string }[] = [
  { id: "question", label: "la question" },
  { id: "reponse", label: "la réponse" },
  { id: "conversation", label: "le fil de conversation" },
];

/**
 * "Signalements" (Bureau) -- refonte du 10/09/2026, demande Bourama :
 * plus de type A/B, plus de génération automatique de comportement/skill,
 * plus de bouton "actif". Le traitement se fait en discutant librement
 * avec Classinus dans une conversation dédiée (voir core/outils_signalements.py) --
 * ce composant ne fait qu'ouvrir cette conversation avec l'id du
 * signalement en clair dans le message, le modèle le reprend ensuite tel
 * quel comme paramètre de ses outils (voir docstring de consulter_signalement).
 *
 * Pas de tri "par classe/élève" : même contrainte que l'ancien composant,
 * le produit n'expose nulle part le nom d'un élève à partir de son id.
 * Liste triée par date, la plus récente en premier.
 */
// 19/09/2026, demande Bourama : Bureau fonctionne comme Personnaliser
// Clovis. Le titre et le bouton "i" ne sont plus dans la carte, ils sont
// portés par la page (app/(app)/bureau/signalements). C'était un reste de
// l'époque où Bureau était une seule page de cartes empilées.
export function ListeCorrectionsProf() {
  const queryClient = useQueryClient();
  const [ongletActif, setOngletActif] = useState<"nouveau" | "discute">("nouveau");
  // Signalements repliés par défaut, dépliés un par un au toucher.
  const [deplies, setDeplies] = useState<Set<string>>(new Set());
  function basculer(id: string) {
    setDeplies((prec) => {
      const suivant = new Set(prec);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }
  const { data: signalements } = useQuery({
    queryKey: clesRequetes.correctionsProf(ongletActif),
    queryFn: async () => {
      try {
        return await listerSignalementsRecus(ongletActif);
      } catch (e) {
        if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
        else setErreur(messageErreur(e));
        return [] as SignalementPedagogique[];
      }
    },
  });
  const [erreur, setErreur] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);
  const [rattachementOuvertPour, setRattachementOuvertPour] = useState<string | null>(null);
  // `codes` partage sa clé de cache avec MesCodes.tsx/ProgrammeNotions.tsx
  // (même appel listerMesCodes) -- déjà chargé si l'une de ces sections a
  // été visitée. `notionsParCode` reste un état local, mais alimenté via
  // queryClient.fetchQuery (clesRequetes.programmeNotions, même clé que
  // ProgrammeNotions.tsx) : si le programme de ce code a déjà été
  // consulté récemment, aucune requête réseau ici non plus.
  const { data: codes } = useQuery({
    queryKey: clesRequetes.codes,
    queryFn: () => listerMesCodes().catch((e) => {
      setErreur(messageErreur(e));
      return [] as CodePartage[];
    }),
  });
  const [notionsParCode, setNotionsParCode] = useState<Record<string, Notion[]>>({});
  const ouvrirChatAvecTexte = useOuvrirChatAvecTexte();

  // Chargement initial des signalements porté par le useQuery plus haut.
  // charger() garde ce nom pour ne pas toucher ses points d'appel plus
  // bas (bouton "réessayer" éventuel).
  function charger(statut: "nouveau" | "discute") {
    queryClient.invalidateQueries({ queryKey: clesRequetes.correctionsProf(statut) });
  }

  function discuter(s: SignalementPedagogique) {
    // L'id est repris tel quel par le modèle comme paramètre de
    // consulter_signalement/enregistrer_note_signalement (voir
    // core/outils_signalements.py) -- c'est bien le prof qui déclenche,
    // Classinus n'agit jamais de son propre chef sur un signalement.
    ouvrirChatAvecTexte(
      `Je veux discuter du signalement pédagogique id ${s.id}. ` +
        `Utilise l'outil consulter_signalement avec cet id pour voir de quoi il s'agit, ` +
        `puis discutons-en ensemble.`
    );
  }

  async function demanderCeQuiManque(s: SignalementPedagogique) {
    const manquants = CHAMPS.filter((c) => !(s as any)[`visible_${c.id}`]).map((c) => c.id);
    if (manquants.length === 0) return;
    setErreur(null);
    try {
      const maj = await demanderVisibiliteSignalement(s.id, manquants);
      queryClient.setQueryData<SignalementPedagogique[]>(clesRequetes.correctionsProf(ongletActif), (prec) =>
        (prec || []).map((x) => (x.id === s.id ? maj : x))
      );
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  function ouvrirRattachement(s: SignalementPedagogique) {
    setRattachementOuvertPour(s.id);
  }

  async function chargerNotions(codeId: string) {
    try {
      const n = await queryClient.fetchQuery({
        queryKey: clesRequetes.programmeNotions(codeId),
        queryFn: () => listerNotions(codeId),
      });
      setNotionsParCode((prec) => ({ ...prec, [codeId]: n }));
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  async function rattacher(signalementId: string, codeId: string | null, notionId: string | null) {
    setErreur(null);
    try {
      const maj = await rattacherSignalementPedagogique(signalementId, codeId, notionId);
      queryClient.setQueryData<SignalementPedagogique[]>(clesRequetes.correctionsProf(ongletActif), (prec) =>
        (prec || []).map((x) => (x.id === signalementId ? maj : x))
      );
      setRattachementOuvertPour(null);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  async function dupliquer(signalementId: string) {
    setErreur(null);
    try {
      const copie = await dupliquerSignalementPedagogique(signalementId);
      queryClient.setQueryData<SignalementPedagogique[]>(clesRequetes.correctionsProf(ongletActif), (prec) => [
        copie,
        ...(prec || []),
      ]);
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  async function supprimer(signalementId: string) {
    setErreur(null);
    try {
      await supprimerSignalementPedagogique(signalementId);
      queryClient.setQueryData<SignalementPedagogique[]>(clesRequetes.correctionsProf(ongletActif), (prec) =>
        (prec || []).filter((x) => x.id !== signalementId)
      );
    } catch (e) {
      setErreur(messageErreur(e));
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour recevoir les signalements de tes élèves." />;
  }

  return (
    <section className="rounded-cgpt-carte border border-dj-bordure bg-dj-surface px-3 py-5">
      <div className="flex gap-1 rounded-cgpt-bouton bg-dj-surface-haute p-1">
        {[
          { id: "nouveau" as const, label: "Nouveaux" },
          { id: "discute" as const, label: "En discussion" },
        ].map((o) => (
          <button
            key={o.id}
            onClick={() => setOngletActif(o.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              ongletActif === o.id ? "bg-dj-surface text-dj-texte shadow-sm" : "text-dj-texte-muet hover:text-dj-texte"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {erreur && <p className="mt-3 text-sm text-[var(--dj-erreur)]">{erreur}</p>}

      <div className="mt-3 flex flex-col gap-2">
        {signalements === undefined &&
          [0, 80, 160].map((delai) => (
            <div key={delai} className="rounded-xl border border-dj-bordure bg-dj-surface-haute p-3">
              <Skeleton className="h-3.5 w-3/4 rounded" style={{ animationDelay: `${delai}ms` }} />
              <Skeleton className="mt-2 h-3 w-1/2 rounded" style={{ animationDelay: `${delai + 40}ms` }} />
            </div>
          ))}

        {signalements !== undefined && signalements.length === 0 && (
          <p className="animate-dj-fade-in-rapide py-4 text-center text-sm text-dj-texte-muet">
            {ongletActif === "nouveau" ? "Aucun signalement en attente." : "Aucune discussion en cours."}
          </p>
        )}

        {signalements?.map((s, i) => {
          const manquants = CHAMPS.filter((c) => !(s as any)[`visible_${c.id}`]);
          const demandeEnCours = manquants.some((c) => (s as any)[`demande_prof_${c.id}`]);
          const ouvert = deplies.has(s.id);
          const apercu = s.visible_question ? (s.question_texte || "—") : "Question non partagée par l'élève";
          return (
            <div
              key={s.id}
              className="animate-dj-fade-in-rapide rounded-xl border border-dj-bordure bg-dj-surface-haute"
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <button
                type="button"
                onClick={() => basculer(s.id)}
                aria-expanded={ouvert}
                className="flex w-full items-center gap-2 px-3 py-3 text-left"
              >
                {ouvert ? (
                  <ChevronDown size={16} className="flex-shrink-0 text-dj-texte-muet" />
                ) : (
                  <ChevronRight size={16} className="flex-shrink-0 text-dj-texte-muet" />
                )}
                <span className={`min-w-0 flex-1 text-sm text-dj-texte ${ouvert ? "font-medium" : "truncate"}`}>
                  {ouvert ? "Signalement" : apercu}
                </span>
              </button>

              {ouvert && (
              <div className="px-3 pb-3">
              <ChampMarkdown libelle="Question" texte={s.visible_question ? s.question_texte || "—" : "non partagée par l'élève"} />
              <ChampMarkdown libelle="Réponse mise en cause" texte={s.visible_reponse ? s.reponse_texte || "—" : "non partagée par l'élève"} />
              {s.probleme_observe && <ChampMarkdown libelle="Problème observé" texte={s.probleme_observe} />}
              {s.correction_texte && <ChampMarkdown libelle="Note actuelle" texte={s.correction_texte} attenue={false} />}

              {manquants.length > 0 && (
                <button
                  onClick={() => demanderCeQuiManque(s)}
                  disabled={demandeEnCours}
                  className="mt-2 text-xs font-medium text-dj-accent-1-texte hover:underline disabled:opacity-50"
                >
                  {demandeEnCours
                    ? "Demande envoyée, en attente de l'élève…"
                    : `Demander à voir ${manquants.map((c) => c.label).join(", ")}`}
                </button>
              )}

              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => discuter(s)}
                  className="flex items-center gap-1.5 rounded-cgpt-bouton bg-dj-accent-1 px-3 py-1.5 text-sm font-medium text-[#1A0D02] transition-transform hover:scale-[1.02]"
                >
                  <MessageSquareText size={14} />
                  Discuter
                </button>
                <button onClick={() => ouvrirRattachement(s)} aria-label="Rattacher à une matière ou une notion" className="rounded-md p-1 text-dj-texte-muet hover:text-dj-texte">
                  <Tag size={14} />
                </button>
                <button onClick={() => dupliquer(s.id)} aria-label="Dupliquer le signalement" className="rounded-md p-1 text-dj-texte-muet hover:text-dj-texte">
                  <Copy size={14} />
                </button>
                <button onClick={() => supprimer(s.id)} aria-label="Supprimer le signalement" className="rounded-md p-1 text-dj-texte-muet hover:text-[var(--dj-erreur)]">
                  <Trash2 size={14} />
                </button>
              </div>

              {rattachementOuvertPour === s.id && (
                <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-dj-bordure bg-dj-surface p-2">
                  <SelectPersonnalise
                    options={[
                      { id: "", label: "Aucune matière" },
                      ...(codes ?? []).map((c) => ({ id: c.id, label: c.nom || c.code })),
                    ]}
                    valeur={s.code_id ?? ""}
                    onChange={(id) => {
                      const codeId = id || null;
                      if (codeId) chargerNotions(codeId);
                      rattacher(s.id, codeId, null);
                    }}
                  />
                  {s.code_id && (
                    <SelectPersonnalise
                      options={[
                        { id: "", label: "Aucune notion précise" },
                        ...(notionsParCode[s.code_id] ?? []).map((n) => ({ id: n.id, label: n.nom })),
                      ]}
                      valeur={s.notion_id ?? ""}
                      onChange={(id) => rattacher(s.id, s.code_id, id || null)}
                    />
                  )}
                </div>
              )}
              </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
