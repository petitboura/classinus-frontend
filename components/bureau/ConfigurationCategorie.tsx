"use client";

import { useState, type MouseEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { clesRequetes } from "@/lib/clesRequetes";
import { lireMesComportements, activerDesactiverComportement, type Comportement, type CategorieConfiguration } from "@/lib/api";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { EditeurComportement } from "@/components/EditeurComportement";
import { ChipComportement } from "@/components/MesComportements";
import { Skeleton } from "@/components/Skeleton";

// 28/09/2026, demande Bourama : onglet "Configuration" de Bureau. Les 4
// catégories (Procédure/Règle/Comportement/Style) sont des skills
// classiques "habillés" (même table, même EditeurComportement, même
// pilule ChipComportement -- "tous suivent comme les skill") avec juste
// une étiquette categorie en plus, jamais choisie par l'utilisateur : ce
// composant est monté une fois par onglet, avec SA catégorie fixée en
// prop, jamais un sélecteur. Trimmé par rapport à MesComportements.tsx
// (pas d'onglet "Public", pas de CTA compte requis, pas de filtre
// origine/ComportementsRecus) : Bureau exige déjà un compte, et ces 4
// catégories ne sont jamais reçues par code ni importées du catalogue
// public, seulement créées ici.
export function ConfigurationCategorie({
  agentId,
  categorie,
  libelleNouveau,
  texteVide,
}: {
  agentId: string;
  categorie: CategorieConfiguration;
  /** Texte du bouton "+", propre à cet onglet (ex : "Nouvelle règle"). */
  libelleNouveau: string;
  /** Texte affiché quand la liste de cette catégorie est vide. */
  texteVide: string;
}) {
  const queryClient = useQueryClient();
  const cle = clesRequetes.configurationSkills(agentId, categorie);
  const { data: liste } = useQuery({
    queryKey: cle,
    queryFn: () => lireMesComportements(agentId, categorie),
  });

  const [panneau, setPanneau] = useState<{ type: "edition"; c: Comportement } | { type: "creation" } | null>(null);
  const [actionPanneauEnCours, setActionPanneauEnCours] = useState(false);
  const [actifEnCours, setActifEnCours] = useState<string | null>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();

  function fermer() {
    setPanneau(null);
  }

  async function toggleActif(c: Comportement, e: MouseEvent) {
    e.stopPropagation();
    if (actifEnCours) return;
    setActifEnCours(c.id);
    try {
      const maj = await activerDesactiverComportement(agentId, c.id, !c.actif);
      queryClient.setQueryData<Comportement[]>(cle, (prec) => (prec || []).map((x) => (x.id === maj.id ? maj : x)));
    } catch {
      // Silencieux comme dans MesComportements.tsx : la pilule reste
      // simplement dans son état précédent, pas de blocage de l'écran
      // pour un aller-retour réseau raté.
    } finally {
      setActifEnCours(null);
    }
  }

  if (liste === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-hidden>
        <Skeleton className="h-9 w-44 rounded-full border border-dj-bordure" />
        <div className="flex flex-wrap gap-2">
          {[128, 176, 96, 208, 144].map((largeur, i) => (
            <Skeleton key={i} className="h-9 rounded-full border border-dj-bordure" style={{ width: `${largeur}px`, animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-4">
      <button
        onClick={() => setPanneau({ type: "creation" })}
        className="flex w-fit items-center gap-1.5 rounded-full border border-dj-bordure bg-dj-surface px-3 py-1.5 text-sm font-medium text-dj-texte transition-colors hover:border-dj-bordure-forte hover:bg-dj-surface-haute"
      >
        <Plus size={14} /> {libelleNouveau}
      </button>

      {liste.length === 0 ? (
        <p className="text-sm text-dj-texte-muet">{texteVide}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {liste.map((c) => (
            <ChipComportement key={c.id} c={c} onOuvrir={(c) => setPanneau({ type: "edition", c })} onToggleActif={toggleActif} />
          ))}
        </div>
      )}

      {panneau && (
        <PanneauFlottant large enSortie={enSortie} onFerme={actionPanneauEnCours ? undefined : () => demarrerFermeture(fermer)}>
          <EditeurComportement
            agentId={agentId}
            comportement={panneau.type === "edition" ? panneau.c : null}
            categoriePreset={categorie}
            onFermer={() => demarrerFermeture(fermer)}
            onCree={(c) => queryClient.setQueryData<Comportement[]>(cle, (prec) => [...(prec || []), c])}
            onModifie={(c) => queryClient.setQueryData<Comportement[]>(cle, (prec) => (prec || []).map((x) => (x.id === c.id ? c : x)))}
            onSupprime={(id) => queryClient.setQueryData<Comportement[]>(cle, (prec) => (prec || []).filter((x) => x.id !== id))}
            onActionEnCoursChange={setActionPanneauEnCours}
          />
        </PanneauFlottant>
      )}
    </div>
  );
}
