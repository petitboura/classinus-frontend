"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { iconePrincipalePour, sousIconePour, useOutilsRegistre } from "@/lib/outils";
import { GalerieImagesBulle } from "./GalerieImagesBulle";
import { LigneOutil, DonneesLigneOutil } from "./LigneOutil";

// Un outil encore en train de s'exécuter (15/09/2026, demande Bourama --
// chantier "ligne connectrice") -- `id` correspond à id_appel émis par le
// backend (execution_outils.py:_traiter_appels, appel["id"], le
// tool_call_id) : nécessaire pour recoller le bon "en cours" au bon
// "terminé" quand PLUSIEURS outils tournent vraiment en parallèle et
// finissent dans le désordre (voir ChatIA.tsx) -- se fier à "le dernier
// en cours de la liste" ne suffit plus dans ce cas. `nomOutil` permet de
// retrouver la même icône que l'outil aura une fois terminé, pour que la
// transition en_cours -> terminé ne change pas d'icône sous les yeux.
//
// Étendu (18/09/2026, demande Bourama : statut d'outil incohérent) : `etat`
// distingue "en_cours" (texte "X...") de "termine" (texte "X effectuée",
// l'outil a fini mais son résultat n'est pas encore arrivé). Absent =
// "en_cours", comme avant.
//
// Étendu (24/09/2026, regroupement) : `nomLisible` et `action` viennent de
// l'événement "statut" du backend, pour fusionner les appels identiques à la
// suite et poser la petite icône d'action dès la phase "en cours".
export type OutilEnCours = { id: string; nomOutil?: string; nomLisible?: string; action?: string; texte: string; etat?: "en_cours" | "termine" };

// Affiche, pour CHAQUE outil utilisé, ce qu'il a concrètement exécuté /
// retourné -- dans sa propre section, avec l'icône de cet outil précis,
// dans l'ORDRE CHRONOLOGIQUE réel des appels (26/07, retour Bourama :
// avant, tout était regroupé par catégorie -- tout le raisonnement, PUIS
// tous les résultats d'outils, PUIS toutes les sources en bloc à la fin
// -- ça ne reflétait pas l'ordre réel "lit un fichier -> résultat ->
// recherche -> résultat -> sources -> génère un PDF -> résultat"). Les
// sources d'une recherche sont donc attachées à SON entrée précise, pas
// à un tableau global : voir ChatIA.tsx, l'événement "sources" est
// rattaché au DERNIER élément de outilsResultats plutôt qu'à un champ
// séparé du message -- fiable car le backend émet toujours
// outil_resultat puis sources pour un même appel, sans rien d'autre
// entre les deux (voir core/main.py:_traiter_appels).
//
// Distinct du raisonnement libre du modèle (RaisonnementBulle.tsx, reste
// affiché en premier/en haut) : ici c'est le VRAI contenu brut renvoyé
// par l'outil, pas ce que le modèle en a compris ou raconté.
//
// Icône reprise du registre vivant chargé depuis le backend (2026-08-15,
// voir lib/outils.ts:useOutilsRegistre -- avant : liste statique
// OUTILS_DISPONIBLES, incomplète pour ~40 outils internes qui tombaient
// donc sur ce repli générique) -- repli Wrench conservé pour tout outil
// malgré tout absent du registre (cas réseau en échec ET liste de
// secours elle-même incomplète, très rare).
//
// Fermé par défaut (26/07, retour Bourama : "il s'affiche
// automatiquement" n'était pas voulu) + glissement fluide à
// l'ouverture/fermeture (astuce grid-template-rows 0fr/1fr, même
// principe que RaisonnementBulle.tsx -- avant, c'était un
// affichage/masquage brut, sans transition).
//
// Menu "Sources" indépendant (31/07, demande Bourama) : avant, les
// sources n'étaient visibles qu'en dépliant le résultat brut complet de
// l'outil (JSON/texte technique) -- pas pratique pour juste vérifier
// d'où vient une réponse. Bouton dédié, son propre état ouvert/fermé,
// visible directement à côté du résultat de l'outil plutôt que niché
// dedans.
type ResultatOutil = {
  nomOutil: string;
  nomLisible: string;
  resultat: string;
  // Action de l'appel pour les outils à actions (24/09/2026), absente sinon.
  action?: string;
  // Ajoutés (18/09/2026) : idAppel recolle le résultat à la ligne "en cours"
  // du même outil (même clé, donc même élément, plus de remplacement) ;
  // texteTermine est le texte "effectuée" reçu juste avant le résultat.
  idAppel?: string;
  texteTermine?: string;
  sources?: { numero: number; titre: string; url: string; extrait?: string; url_extrait?: string; reperage?: string; position_type?: "page" | "timestamp"; position_valeur?: number; type_mime?: string | null }[];
  images?: { titre: string; url: string; miniature: string; credit?: string | null }[];
};

type Rangee = { cle: string; nomOutil?: string; nomLisible?: string; action?: string; donnees: DonneesLigneOutil };

// Une ligne affichée = un ou plusieurs appels identiques à la suite
// (24/09/2026, demande Bourama : dix fois le même outil = une ligne "x 10").
type Ligne = { cle: string; nomOutil?: string; action?: string; membres: Rangee[] };

// Deux rangées se fusionnent seulement si elles se suivent ET portent le même
// outil et le même libellé (le libellé porte déjà le verbe de l'action, voir
// core/profils_agents.py:_nom_lisible). Sans libellé connu : jamais fusionnée.
function cleFusion(rangee: Rangee): string | null {
  return rangee.nomLisible ? `${rangee.nomOutil ?? ""}|${rangee.nomLisible}` : null;
}

// Regroupe les rangées qui se suivent en lignes. Une série interrompue par un
// autre outil donne donc plusieurs lignes, dans l'ordre réel des appels.
function fusionnerRangees(rangees: Rangee[]): Ligne[] {
  const lignes: Ligne[] = [];
  for (const rangee of rangees) {
    const derniere = lignes[lignes.length - 1];
    const cle = cleFusion(rangee);
    if (derniere && cle && cleFusion(derniere.membres[0]) === cle) {
      derniere.membres.push(rangee);
    } else {
      lignes.push({ cle: rangee.cle, nomOutil: rangee.nomOutil, action: rangee.action, membres: [rangee] });
    }
  }
  return lignes;
}

// Ce que la ligne affiche. Un seul appel : tel quel. Plusieurs : tous
// terminés = résultats mis bout à bout (dépliables), sinon texte de
// progression "k sur N" (k terminés sur N appels connus à cet instant).
function donneesDeLigne(ligne: Ligne): DonneesLigneOutil {
  const membres = ligne.membres;
  if (membres.length === 1) return membres[0].donnees;
  const total = membres.length;
  const termines = membres.filter((m) => m.donnees.etat === "resultat");
  const restants = membres.filter((m) => m.donnees.etat !== "resultat");
  if (restants.length === 0) {
    const sources = termines.flatMap((m) => m.donnees.sources ?? []);
    const images = termines.flatMap((m) => m.donnees.images ?? []);
    return {
      etat: "resultat",
      nomLisible: membres[0].donnees.nomLisible,
      resultat: termines.map((m, i) => `(${i + 1}/${total})\n${m.donnees.resultat ?? ""}`).join("\n\n"),
      sources: sources.length ? sources : undefined,
      images: images.length ? images : undefined,
    };
  }
  const courant = restants[restants.length - 1].donnees;
  const base = (courant.texteEnCours ?? courant.texteTermine ?? membres[0].nomLisible ?? "").replace(/(\.{3}|…)$/, "");
  return { etat: "en_cours", texteEnCours: `${base}, ${termines.length} sur ${total}` };
}

export function OutilResultatBulle({
  resultats,
  enCours,
  groupe = false,
  peutSeReplier = true,
}: {
  resultats?: ResultatOutil[];
  // Outils encore en train de s'exécuter, à afficher DANS la même colonne
  // icône/ligne que les outils déjà terminés (15/09/2026, demande
  // Bourama) -- peu importe le mélange (que des en cours, que des
  // terminés, ou les deux), reliés par la même ligne connectrice. Voir
  // OutilEnCours plus haut.
  enCours?: OutilEnCours[];
  // Ajouté (12/09/2026, demande Bourama) : quand plusieurs outils s'enchaînent
  // sans texte de réponse entre eux dans la timeline en direct (voir le
  // regroupement dans BulleMessage.tsx), ils se replient en une seule
  // ligne "X outils utilisés" au lieu d'une ligne par outil. Sans effet
  // si un seul outil au total (affichage simple inchangé). Depuis le
  // 15/09/2026, s'applique aussi à un fil rechargé depuis l'historique
  // QUAND message.segments est présent (voir BulleMessage.tsx) -- seul un
  // message antérieur à ce chantier (pas de rétro-remplissage) retombe
  // encore sur l'ancien affichage groupé, qui ne passe jamais cette prop.
  groupe?: boolean;
  // Ajouté (18/09/2026, demande Bourama : après deux ou trois outils, le
  // groupe se repliait tout seul alors que d'autres outils tournaient
  // encore, et l'utilisateur ne voyait plus rien). Le repli automatique
  // n'a lieu que si aucun outil ne tourne ET si le groupe est terminé pour
  // de bon (du texte de réponse suit déjà, ou message plus ancien). Tant
  // que la réponse n'a pas commencé, le groupe reste ouvert : il peut
  // encore recevoir un nouvel outil au tour suivant du modèle.
  peutSeReplier?: boolean;
}) {
  const { outils, verbes } = useOutilsRegistre();

  // Rangées unifiées, terminés puis en cours (ordre d'arrivée réel : un
  // outil encore en cours est forcément plus récent que tout outil déjà
  // terminé dans le même lot) -- une seule séquence, pour que la colonne
  // icône/ligne de gauche soit continue quel que soit le mélange d'états.
  //
  // Clé stable par outil (18/09/2026) : `o-<id_appel>` pour le résultat ET
  // pour l'entrée en cours du même appel, donc React garde la même ligne
  // quand l'outil passe de "en cours" à "terminé" au lieu d'en démonter une
  // pour en monter une autre. Sans id_appel (fil rechargé depuis
  // l'historique), repli sur la position, comme avant.
  const clesVues = new Map<string, number>();
  const cleUnique = (base: string) => {
    const n = clesVues.get(base) ?? 0;
    clesVues.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
  const idsAvecResultat = new Set((resultats ?? []).map((r) => r.idAppel).filter(Boolean) as string[]);
  const rangees: Rangee[] = [
    ...(resultats ?? []).map((r, index) => ({
      cle: cleUnique(r.idAppel ? `o-${r.idAppel}` : `t-${index}`),
      nomOutil: r.nomOutil,
      nomLisible: r.nomLisible,
      action: r.action,
      donnees: {
        etat: "resultat" as const,
        nomLisible: r.nomLisible,
        resultat: r.resultat,
        sources: r.sources,
        images: r.images,
        texteTermine: r.texteTermine,
      },
    })),
    ...(enCours ?? [])
      .filter((e) => !idsAvecResultat.has(e.id))
      .map((e) => ({
        cle: cleUnique(`o-${e.id}`),
        nomOutil: e.nomOutil,
        nomLisible: e.nomLisible,
        action: e.action,
        donnees:
          e.etat === "termine"
            ? { etat: "termine" as const, texteTermine: e.texte }
            : { etat: "en_cours" as const, texteEnCours: e.texte },
      })),
  ];

  const nbEnCours = rangees.filter((r) => r.donnees.etat !== "resultat").length;

  // Ligne groupée : ouverte automatiquement, se replie seule quelques
  // secondes après la fin de TOUS les outils (voir peutSeReplier plus haut),
  // même principe que RaisonnementBulle (repli automatique, jamais brut).
  // `groupeOuvertManuel` respecte ensuite le choix de la personne si elle a
  // cliqué entre-temps. Un nouvel outil qui démarre rouvre le groupe.
  const [groupeOuvertManuel, setGroupeOuvertManuel] = useState<boolean | null>(null);
  const [groupeOuvertAuto, setGroupeOuvertAuto] = useState(true);

  useEffect(() => {
    if (!groupe) return;
    if (!peutSeReplier || nbEnCours > 0) {
      setGroupeOuvertAuto(true);
      return;
    }
    const minuteur = setTimeout(() => setGroupeOuvertAuto(false), 3000);
    return () => clearTimeout(minuteur);
  }, [groupe, peutSeReplier, nbEnCours]);

  if (rangees.length === 0) return null;

  // `estGroupe` reste décidé sur le nombre d'APPELS (deux appels identiques
  // = une seule ligne, mais sous l'en-tête "1 outil utilisé"), le compteur de
  // l'en-tête compte les LIGNES affichées.
  const estGroupe = groupe && rangees.length >= 2;
  const lignes = fusionnerRangees(rangees);
  const groupeOuvert = groupeOuvertManuel ?? groupeOuvertAuto;

  // Même icône d'outil dès qu'on la connaît (nomOutil transmis dès
  // l'événement "statut" par ChatIA.tsx). Repli Wrench pour tout outil
  // absent du registre (voir iconePourOutil).
  const elementsResultats = lignes.map((ligne, position) => {
    const { Icone, appli } = iconePrincipalePour(outils, ligne.nomOutil, ligne.action);
    return (
      <LigneOutil
        key={ligne.cle}
        donnees={donneesDeLigne(ligne)}
        Icone={Icone}
        SousIcone={sousIconePour(ligne.action, ligne.nomOutil, appli, verbes)}
        nombre={ligne.membres.length}
        estDerniere={position === lignes.length - 1}
        estGroupe={estGroupe}
      />
    );
  });

  if (!estGroupe) {
    return <div className="my-1.5 flex max-w-[85%] flex-col">{elementsResultats}</div>;
  }

  // Galeries des outils du groupe, rendues hors du bloc repliable
  // juste en dessous (voir le commentaire dans LigneOutil, 17/09) -- toujours
  // visibles, peu importe que le groupe soit ouvert, fermé, ou déjà
  // replié automatiquement.
  const galeriesExternes = (resultats ?? [])
    .map((r, index) =>
      r.images && r.images.length ? <GalerieImagesBulle key={`galerie-${index}`} images={r.images} /> : null,
    )
    .filter(Boolean);

  return (
    <div className="my-1.5 flex max-w-[85%] flex-col gap-1 animate-dj-fade-in">
      <button
        onClick={() => setGroupeOuvertManuel(!groupeOuvert)}
        className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        <Layers size={13} />
        <span>
          {lignes.length} outil{lignes.length > 1 ? "s" : ""} utilisé{lignes.length > 1 ? "s" : ""}
        </span>
        {groupeOuvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {/* La ligne connectrice entre les outils individuels reste bien
          présente une fois le groupe déplié (demande Bourama, 15/09) --
          rien de spécifique à faire ici : chaque ligne porte déjà sa
          propre colonne icône/ligne, ce wrapper ne fait que
          plier/déplier l'ensemble, jamais la ligne à l'intérieur. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          groupeOuvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden flex flex-col">{elementsResultats}</div>
      </div>
      {galeriesExternes.length > 0 && (
        <div className="flex flex-col gap-1.5">{galeriesExternes}</div>
      )}
    </div>
  );
}
