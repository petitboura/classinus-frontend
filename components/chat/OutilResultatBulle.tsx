"use client";

import { useRef, useState } from "react";
import type { ComponentProps } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import { iconePrincipalePour, sousIconePour, useOutilsRegistre } from "@/lib/outils";
import { useLocale } from "@/lib/i18n/useLocale";
import { titreReflexion } from "@/lib/titreReflexion";
import { GalerieImagesBulle } from "./GalerieImagesBulle";
import { CartesVideosBulle } from "./CartesVideosBulle";
import { LigneOutil, DonneesLigneOutil } from "./LigneOutil";
import { LigneCommentaire } from "./LigneCommentaire";
import { LigneSourcesTour } from "./LigneSourcesTour";
import type { SourcesBulle } from "./SourcesBulle";
import { LigneReflexion } from "./LigneReflexion";
import { RoueOutils, type ElementRoue } from "./RoueOutils";
import { TexteFondu } from "./TexteFondu";
import { imagesNonPlacees, videosNonPlacees } from "./mediasNonPlaces";
import { WidgetsMcpUi } from "./WidgetMcpUi";
import type { RessourceUi } from "@/lib/mcpUi";

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
// `domaines` (21/10/2026) : sites visés par l'appel, pour afficher leur logo dès la phase "en cours".
export type OutilEnCours = { id: string; nomOutil?: string; nomLisible?: string; action?: string; domaines?: string[]; langage?: string; texte: string; etat?: "en_cours" | "termine" };

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
  // Sites visés par l'appel (21/10/2026, logo du site dans la ligne), absent sinon.
  domaines?: string[];
  // Langage lancé par l'appel (24/10/2026, logo du langage en badge sur le Play), absent sinon.
  langage?: string;
  // Ajoutés (18/09/2026) : idAppel recolle le résultat à la ligne "en cours"
  // du même outil (même clé, donc même élément, plus de remplacement) ;
  // texteTermine est le texte "effectuée" reçu juste avant le résultat.
  idAppel?: string;
  texteTermine?: string;
  sources?: { numero: number; titre: string; url: string; extrait?: string; url_extrait?: string; reperage?: string; position_type?: "page" | "timestamp"; position_valeur?: number; type_mime?: string | null }[];
  images?: { titre: string; url: string; miniature: string; credit?: string | null }[];
  videos?: { titre: string; url: string; miniature?: string | null; chaine?: string | null; duree?: string | null; id_video?: string | null }[];
  // Widgets MCP-UI (04/11/2026) : ressources ui:// renvoyées par l'outil.
  ressourcesUi?: RessourceUi[];
};

type Rangee = { cle: string; nomOutil?: string; nomLisible?: string; action?: string; domaines?: string[]; langage?: string; donnees: DonneesLigneOutil };

// Une ligne affichée = un ou plusieurs appels identiques à la suite
// (24/09/2026, demande Bourama : dix fois le même outil = une ligne "x 10").
type Ligne = { cle: string; nomOutil?: string; action?: string; domaines?: string[]; langage?: string; membres: Rangee[] };

// Deux rangées se fusionnent seulement si elles se suivent ET portent le même
// outil, le même libellé (le libellé porte déjà le verbe de l'action, voir
// core/profils_agents.py:_nom_lisible) et les mêmes sites visés : deux pages de
// sites différents ne doivent pas partager le logo de l'un, ni deux langages
// différents le badge de l'un. Sans libellé connu : jamais fusionnée.
function cleFusion(rangee: Rangee): string | null {
  return rangee.nomLisible ? `${rangee.nomOutil ?? ""}|${rangee.nomLisible}|${(rangee.domaines ?? []).join(",")}|${rangee.langage ?? ""}` : null;
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
      lignes.push({ cle: rangee.cle, nomOutil: rangee.nomOutil, action: rangee.action, domaines: rangee.domaines, langage: rangee.langage, membres: [rangee] });
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
    const videos = termines.flatMap((m) => m.donnees.videos ?? []);
    return {
      etat: "resultat",
      nomLisible: membres[0].donnees.nomLisible,
      resultat: termines.map((m, i) => `(${i + 1}/${total})\n${m.donnees.resultat ?? ""}`).join("\n\n"),
      sources: sources.length ? sources : undefined,
      images: images.length ? images : undefined,
      videos: videos.length ? videos : undefined,
      ressourcesUi: termines.flatMap((m) => m.donnees.ressourcesUi ?? []).length ? termines.flatMap((m) => m.donnees.ressourcesUi ?? []) : undefined,
    };
  }
  const courant = restants[restants.length - 1].donnees;
  const base = (courant.texteEnCours ?? courant.texteTermine ?? membres[0].nomLisible ?? "").replace(/(\.{3}|…)$/, "");
  return { etat: "en_cours", texteEnCours: `${base}, ${termines.length} sur ${total}` };
}

export function OutilResultatBulle({
  resultats: resultatsBruts,
  commentaires,
  enCours,
  groupe = false,
  travailFini = true,
  texteMessage = "",
  reponseTerminee = true,
  sourcesTour,
  afficherSourcesTour = false,
}: {
  resultats?: ResultatOutil[];
  // Notes de l'IA entre deux outils (25/11/2026, demande Bourama) : des lignes à point, jamais des
  // outils. `apres` = nombre d'outils terminés qui les précèdent dans la suite, pour les remettre à
  // leur place dans l'ordre réel (voir BulleMessage.tsx).
  // Une réflexion du modèle (26/11/2026) est une note de plus dans cette suite : `texte` est son texte
  // brut, `reflexion` donne son numéro dans le message (pour le mot du titre) et dit si le modèle
  // est encore en train de réfléchir.
  commentaires?: { texte: string; apres: number; reflexion?: { numero: number; enCours: boolean } }[];
  // Texte de la réponse et fin de génération : les vidéos et images que le
  // modèle a déjà placées dans sa réponse ne sont pas répétées sous le
  // message, seules celles qu'il a oublié de placer s'affichent, une fois la
  // réponse terminée.
  texteMessage?: string;
  reponseTerminee?: boolean;
  // Toutes les sources du message (28/11/2026, demande Bourama) : la ligne « Sources » posée tout
  // en bas des outils les déplie ; `afficherSourcesTour` n'est vrai que pour le dernier bloc d'outils
  // du message, pour qu'il n'y ait qu'une seule ligne.
  sourcesTour?: ComponentProps<typeof SourcesBulle>["sources"];
  afficherSourcesTour?: boolean;
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
  // Faux tant que la réponse de ce message n'est pas finie (outils, réflexion, texte ou
  // confirmation en attente). Le résumé « X outils utilisés » n'apparaît qu'ensuite
  // (26/11/2026, demande Bourama) : avant, la dernière ligne reste affichée jusqu'à la suivante.
  travailFini?: boolean;
}) {
  const { outils, verbes, prefixes } = useOutilsRegistre();
  const locale = useLocale();

  const resultats = resultatsBruts?.map((r) => ({
    ...r,
    images: imagesNonPlacees(r.images, texteMessage, reponseTerminee),
    videos: videosNonPlacees(r.videos, texteMessage, reponseTerminee),
  }));

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
      domaines: r.domaines,
      langage: r.langage,
      donnees: {
        etat: "resultat" as const,
        nomLisible: r.nomLisible,
        resultat: r.resultat,
        sources: r.sources,
        images: r.images,
        videos: r.videos,
        ressourcesUi: r.ressourcesUi,
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
        domaines: e.domaines,
        langage: e.langage,
        donnees:
          e.etat === "termine"
            ? { etat: "termine" as const, texteTermine: e.texte }
            : { etat: "en_cours" as const, texteEnCours: e.texte },
      })),
  ];

  const nbEnCours = rangees.filter((r) => r.donnees.etat !== "resultat").length;

  // Ligne groupée (25/11/2026, la roue) : toujours repliée par défaut. Pendant que l'IA travaille,
  // la ligne est une roue qui montre une ligne à la fois ; une fois le travail fini, elle devient
  // « X outils utilisés », comme avant. Seul un clic la déplie (liste complète dans l'ordre).
  const [groupeOuvert, setGroupeOuvert] = useState(false);
  // Ligne seule montrée avant l'arrivée de la deuxième : la roue part d'elle pour tourner vers la suivante.
  const ligneSeuleRef = useRef<string | null>(null);

  if (rangees.length === 0 && !(commentaires && commentaires.length > 0)) return null;

  // Suite réelle des lignes : outils (fusionnés quand le même outil se répète à la suite) et notes
  // de l'IA, dans l'ordre. Une note remise après `apres` outils terminés ; ce qui est encore en
  // cours vient toujours après. Une note casse la fusion de deux lignes identiques.
  type ElementTimeline =
    | { genre: "ligne"; ligne: Ligne }
    | { genre: "commentaire"; cle: string; texte: string }
    | { genre: "reflexion"; cle: string; titre: string; brut: string; enCours: boolean };
  const elements: ElementTimeline[] = [];
  let paquet: Rangee[] = [];
  const viderPaquet = () => {
    for (const ligne of fusionnerRangees(paquet)) elements.push({ genre: "ligne", ligne });
    paquet = [];
  };
  let iCommentaire = 0;
  const poserCommentaires = (jusqua: number) => {
    while (commentaires && iCommentaire < commentaires.length && commentaires[iCommentaire].apres <= jusqua) {
      viderPaquet();
      const note = commentaires[iCommentaire];
      if (note.reflexion) {
        elements.push({
          genre: "reflexion",
          cle: `r-${iCommentaire}`,
          titre: titreReflexion(note.texte, note.reflexion.numero, locale),
          brut: note.texte,
          enCours: note.reflexion.enCours,
        });
      } else {
        elements.push({ genre: "commentaire", cle: `c-${iCommentaire}`, texte: note.texte });
      }
      iCommentaire++;
    }
  };
  rangees.forEach((rangee, position) => {
    poserCommentaires(position);
    paquet.push(rangee);
  });
  viderPaquet();
  poserCommentaires(Number.POSITIVE_INFINITY);

  // `estGroupe` reste décidé sur le nombre d'APPELS et de notes (deux appels identiques = une seule
  // ligne, mais sous l'en-tête « 1 outil utilisé »). Sans aucun outil (que des notes), pas de
  // groupe : les notes s'affichent simplement l'une sous l'autre.
  const nbElementsBruts = rangees.length + (commentaires?.length ?? 0);
  const estGroupe = groupe && rangees.length >= 1 && nbElementsBruts >= 2;
  const nbLignesOutils = elements.filter((e) => e.genre === "ligne").length;

  // Le travail est-il encore en cours ? Un outil tourne, ou la réponse n'est pas finie (l'IA
  // réfléchit ou écrit entre deux outils) : la roue reste là.
  const enDirect = nbEnCours > 0 || !travailFini;

  // Même icône d'outil dès qu'on la connaît (nomOutil transmis dès
  // l'événement "statut" par ChatIA.tsx). Repli Wrench pour tout outil
  // absent du registre (voir iconePourOutil).
  const sourcesTourUniques = (() => {
    const vues = new Set<string>();
    return (sourcesTour ?? []).filter((source) => {
      const cle = `${source.numero}|${source.url}`;
      if (vues.has(cle)) return false;
      vues.add(cle);
      return true;
    });
  })();
  const ligneSourcesTour =
    afficherSourcesTour && sourcesTourUniques.length > 0 ? <LigneSourcesTour key="sources-tour" sources={sourcesTourUniques} /> : null;

  const elementsResultats = elements.map((element, position) => {
    // La ligne « Sources » du bas prolonge la ligne connectrice : le dernier élément n'est plus le dernier.
    const estDerniere = position === elements.length - 1 && !ligneSourcesTour;
    if (element.genre === "commentaire") {
      return <LigneCommentaire key={element.cle} texte={element.texte} estDerniere={estDerniere} />;
    }
    if (element.genre === "reflexion") {
      return (
        <LigneReflexion
          key={element.cle}
          titre={element.titre}
          brut={element.brut}
          enCours={element.enCours}
          estDerniere={estDerniere}
        />
      );
    }
    const ligne = element.ligne;
    const { Icone, appli } = iconePrincipalePour(outils, ligne.nomOutil, ligne.action, prefixes);
    return (
      <LigneOutil
        key={ligne.cle}
        donnees={donneesDeLigne(ligne)}
        Icone={Icone}
        SousIcone={sousIconePour(ligne.action, ligne.nomOutil, appli, verbes)}
        domaines={ligne.domaines}
        langage={ligne.langage}
        nombre={ligne.membres.length}
        estDerniere={estDerniere}
        estGroupe={estGroupe}
      />
    );
  });

  if (!estGroupe) {
    const premier = elements[0];
    ligneSeuleRef.current =
      enDirect && premier?.genre === "ligne" ? premier.ligne.cle : enDirect && premier?.genre === "reflexion" ? premier.cle : null;
    return (
      <div className="my-1.5 flex max-w-[85%] flex-col">
        {elementsResultats}
        {ligneSourcesTour}
      </div>
    );
  }

  // Ce que montre la roue : une ligne par élément, avec le texte que montrerait la liste dépliée
  // (« en cours » pour un outil qui tourne, son nom une fois fini).
  const elementsRoue: ElementRoue[] = elements.map((element): ElementRoue => {
    if (element.genre === "commentaire") {
      return { cle: element.cle, membres: [element.cle], genre: "commentaire", texte: element.texte, enCours: false };
    }
    if (element.genre === "reflexion") {
      return { cle: element.cle, membres: [element.cle], genre: "reflexion", texte: element.titre, enCours: element.enCours };
    }
    const ligne = element.ligne;
    const donnees = donneesDeLigne(ligne);
    const enCoursLigne = donnees.etat === "en_cours";
    const texte = enCoursLigne
      ? donnees.texteEnCours ?? ligne.membres[0].nomLisible ?? ""
      : donnees.etat === "termine"
        ? donnees.texteTermine ?? ligne.membres[0].nomLisible ?? ""
        : donnees.nomLisible ?? ligne.membres[0].nomLisible ?? "";
    const { Icone } = iconePrincipalePour(outils, ligne.nomOutil, ligne.action, prefixes);
    return {
      cle: ligne.cle,
      membres: ligne.membres.map((m) => m.cle),
      genre: "outil",
      texte,
      enCours: enCoursLigne,
      Icone,
      domaine: ligne.domaines && ligne.domaines.length === 1 ? ligne.domaines[0] : null,
    };
  });

  // Galeries des outils du groupe, rendues hors du bloc repliable
  // juste en dessous (voir le commentaire dans LigneOutil, 17/09) -- toujours
  // visibles, peu importe que le groupe soit ouvert, fermé, ou déjà
  // replié automatiquement.
  // Toutes les images de la réponse dans UNE seule galerie : une galerie par résultat d'outil
  // empilait chaque capture du navigateur sur la précédente, une rangée par action.
  const toutesImages = (resultats ?? []).flatMap((r) => r.images ?? []);
  const galeriesExternes = [
    toutesImages.length ? <GalerieImagesBulle key="galerie-images" images={toutesImages} /> : null,
    ...(resultats ?? []).flatMap((r, index) => [
      r.videos && r.videos.length ? <CartesVideosBulle key={`videos-${index}`} videos={r.videos} /> : null,
      r.ressourcesUi && r.ressourcesUi.length ? <WidgetsMcpUi key={`widgets-${index}`} ressources={r.ressourcesUi} texteRepli={r.resultat} /> : null,
    ]),
  ].filter(Boolean);

  return (
    <div className="my-1.5 flex max-w-[85%] flex-col gap-1 animate-dj-fade-in">
      <button
        onClick={() => setGroupeOuvert((precedent) => !precedent)}
        className="flex w-full min-w-0 items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        {enDirect ? (
          <RoueOutils elements={elementsRoue} depart={ligneSeuleRef.current} />
        ) : (
          <span key="resume" className="flex min-w-0 animate-dj-fade-in-rapide items-center gap-1.5">
            <Layers size={13} className="shrink-0 text-dj-texte" />
            {/* Un seul nœud de texte (26/11/2026) : en morceaux, la traduction anglaise de
                l'interface donnait « 2Toolsuseds ». */}
            <TexteFondu texte={nbLignesOutils > 1 ? `${nbLignesOutils} outils utilisés` : `${nbLignesOutils} outil utilisé`} />
          </span>
        )}
        {groupeOuvert ? <ChevronDown size={13} className="shrink-0" /> : <ChevronRight size={13} className="shrink-0" />}
      </button>
      {/* La ligne connectrice entre les lignes individuelles reste bien
          présente une fois le groupe déplié (demande Bourama, 15/09) --
          rien de spécifique à faire ici : chaque ligne porte déjà sa
          propre colonne icône/ligne, ce wrapper ne fait que
          plier/déplier l'ensemble, jamais la ligne à l'intérieur. Les lignes restent
          montées même repliées : leur état (shimmer, résultat) continue de vivre. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          groupeOuvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden flex flex-col">
          {elementsResultats}
          {ligneSourcesTour}
        </div>
      </div>
      {galeriesExternes.length > 0 && (
        <div className="flex flex-col gap-1.5">{galeriesExternes}</div>
      )}
    </div>
  );
}
