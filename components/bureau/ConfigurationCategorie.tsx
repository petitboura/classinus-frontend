"use client";

import { useState, type MouseEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type LucideIcon } from "lucide-react";
import { clesRequetes } from "@/lib/clesRequetes";
import {
  lireMesComportements,
  activerDesactiverComportement,
  ajouterComportement,
  type Comportement,
  type CategorieConfiguration,
} from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { texteConfiguration } from "@/lib/i18n/textesConfiguration";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { PanneauFlottant } from "@/components/PanneauFlottant";
import { EditeurConfiguration } from "@/components/bureau/configuration/EditeurConfiguration";
import {
  CarteProcedure,
  LigneRegle,
  CarteComportement,
  CarteStyle,
  AjoutProcedure,
  AjoutRegle,
  AjoutComportement,
  AjoutStyle,
  SqueletteConfiguration,
} from "@/components/bureau/configuration/AffichageConfiguration";

// 28/09/2026, demande Bourama : onglet "Configuration" de Bureau. Ce
// composant est monté une fois par onglet, avec SA catégorie fixée en
// prop, jamais un sélecteur. 01/10/2026, demande Bourama ("chacune doit
// être différente, leur éditeur, leur bouton d'ajout et leur affichage
// après création") : chaque catégorie a maintenant son propre éditeur
// (EditeurConfiguration), son propre bouton d'ajout et sa propre façon de
// s'afficher (AffichageConfiguration), au lieu de la pastille et de
// l'éditeur des skills classiques. La règle n'ouvre aucun panneau pour
// être créée : son champ est directement dans la liste.
export function ConfigurationCategorie({
  agentId,
  categorie,
  Icone,
}: {
  agentId: string;
  categorie: CategorieConfiguration;
  Icone: LucideIcon;
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
  const [erreurAjoutRegle, setErreurAjoutRegle] = useState<string | null>(null);
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
      // Silencieux : la bascule reste dans son état précédent, pas de
      // blocage de l'écran pour un aller retour réseau raté.
    } finally {
      setActifEnCours(null);
    }
  }

  async function ajouterRegle(texte: string): Promise<boolean> {
    setErreurAjoutRegle(null);
    try {
      const cree = await ajouterComportement(agentId, texte, null, undefined, undefined, "regle", null);
      queryClient.setQueryData<Comportement[]>(cle, (prec) => [...(prec || []), cree]);
      return true;
    } catch (e) {
      setErreurAjoutRegle(messageErreur(e));
      return false;
    }
  }

  if (liste === undefined) return <SqueletteConfiguration categorie={categorie} />;

  const ouvrir = (c: Comportement) => setPanneau({ type: "edition", c });
  const creer = () => setPanneau({ type: "creation" });
  const props = { onOuvrir: ouvrir, onToggleActif: toggleActif };

  return (
    <div className="flex animate-dj-fade-in-rapide flex-col gap-4">
      {categorie === "regle" && (
        <div className="flex flex-col gap-1.5">
          <AjoutRegle onAjouter={ajouterRegle} />
          {erreurAjoutRegle && <p className="text-xs text-[var(--dj-erreur)]">{erreurAjoutRegle}</p>}
        </div>
      )}
      {categorie === "comportement" && <AjoutComportement onClick={creer} />}
      {categorie === "style" && <AjoutStyle onClick={creer} />}

      {liste.length === 0 && categorie !== "procedure" && (
        <p className="text-sm text-dj-texte-muet">{texteConfiguration(`vide.${categorie}`)}</p>
      )}

      {categorie === "procedure" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {liste.map((c) => (
            <CarteProcedure key={c.id} c={c} {...props} />
          ))}
          <AjoutProcedure onClick={creer} />
        </div>
      )}
      {categorie === "regle" && liste.length > 0 && (
        <div className="flex flex-col divide-y divide-dj-bordure">
          {liste.map((c) => (
            <LigneRegle key={c.id} c={c} {...props} />
          ))}
        </div>
      )}
      {categorie === "comportement" && liste.length > 0 && (
        <div className="flex flex-col gap-3">
          {liste.map((c) => (
            <CarteComportement key={c.id} c={c} {...props} />
          ))}
        </div>
      )}
      {categorie === "style" && liste.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {liste.map((c) => (
            <CarteStyle key={c.id} c={c} {...props} />
          ))}
        </div>
      )}

      {panneau && (
        <PanneauFlottant
          large={categorie !== "regle"}
          enSortie={enSortie}
          onFerme={actionPanneauEnCours ? undefined : () => demarrerFermeture(fermer)}
        >
          <EditeurConfiguration
            agentId={agentId}
            categorie={categorie}
            comportement={panneau.type === "edition" ? panneau.c : null}
            Icone={Icone}
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
