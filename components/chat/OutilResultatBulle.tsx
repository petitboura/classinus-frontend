"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Wrench, Link2, Layers, Loader2 } from "lucide-react";
import { useOutilsRegistre } from "@/lib/outils";
import { SourcesBulle } from "./SourcesBulle";
import { GalerieImagesBulle } from "./GalerieImagesBulle";

// Un outil encore en train de s'exécuter (15/09/2026, demande Bourama --
// chantier "ligne connectrice") -- `id` correspond à id_appel émis par le
// backend (execution_outils.py:_traiter_appels, appel["id"], le
// tool_call_id) : nécessaire pour recoller le bon "en cours" au bon
// "terminé" quand PLUSIEURS outils tournent vraiment en parallèle et
// finissent dans le désordre (voir ChatIA.tsx) -- se fier à "le dernier
// en cours de la liste" ne suffit plus dans ce cas. `nomOutil` permet de
// retrouver la même icône que l'outil aura une fois terminé, pour que la
// transition en_cours -> terminé ne change pas d'icône sous les yeux.
export type OutilEnCours = { id: string; nomOutil?: string; texte: string };

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
function iconePourOutil(outils: ReturnType<typeof useOutilsRegistre>["outils"], nomOutil: string) {
  return outils.find((o) => o.nom === nomOutil)?.Icone ?? Wrench;
}

export function OutilResultatBulle({
  resultats,
  enCours,
  groupe = false,
}: {
  resultats?: { nomOutil: string; nomLisible: string; resultat: string; sources?: { numero: number; titre: string; url: string; extrait?: string; url_extrait?: string; reperage?: string; position_type?: "page" | "timestamp"; position_valeur?: number; type_mime?: string | null }[]; images?: { titre: string; url: string; miniature: string; credit?: string | null }[] }[];
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
}) {
  const { outils } = useOutilsRegistre();
  const [ouverts, setOuverts] = useState<Record<number, boolean>>({});
  const [sourcesOuvertes, setSourcesOuvertes] = useState<Record<number, boolean>>({});

  // Ligne groupée : ouverte automatiquement quelques secondes puis se
  // replie seule -- même principe que RaisonnementBulle (repli
  // automatique, jamais brut), mais basé sur un délai plutôt que sur la
  // fin d'un état "en cours" : les outils du groupe sont déjà terminés
  // au moment où ce composant les reçoit. `groupeOuvertManuel` respecte
  // ensuite le choix de la personne si elle a cliqué entre-temps.
  const [groupeOuvertManuel, setGroupeOuvertManuel] = useState<boolean | null>(null);
  const [groupeOuvertAuto, setGroupeOuvertAuto] = useState(true);

  useEffect(() => {
    if (!groupe) return;
    setGroupeOuvertAuto(true);
    const minuteur = setTimeout(() => setGroupeOuvertAuto(false), 3000);
    return () => clearTimeout(minuteur);
  }, [groupe]);

  const nbResultats = resultats?.length ?? 0;
  const nbEnCours = enCours?.length ?? 0;
  if (!nbResultats && !nbEnCours) return null;

  const estGroupe = groupe && nbResultats + nbEnCours >= 2;
  const groupeOuvert = groupeOuvertManuel ?? groupeOuvertAuto;

  // Rangées unifiées, terminés puis en cours (ordre d'arrivée réel : un
  // outil encore en cours est forcément plus récent que tout outil déjà
  // terminé dans le même lot) -- une seule séquence, pour que la colonne
  // icône/ligne de gauche soit continue quel que soit le mélange d'états.
  type Rangee =
    | ({ statut: "termine"; cle: string } & NonNullable<typeof resultats>[number])
    | { statut: "en_cours"; cle: string; nomOutil?: string; texte: string };
  const rangees: Rangee[] = [
    ...(resultats ?? []).map((r, index) => ({ statut: "termine" as const, cle: `t-${index}`, ...r })),
    ...(enCours ?? []).map((e) => ({ statut: "en_cours" as const, cle: `e-${e.id}`, nomOutil: e.nomOutil, texte: e.texte })),
  ];

  const elementsResultats = rangees.map((rangee, position) => {
    const estDerniere = position === rangees.length - 1;
    // Colonne icône partagée entre les deux états -- même icône d'outil
    // dès qu'on la connaît (nomOutil transmis dès l'événement "statut"
    // par ChatIA.tsx), pour que l'icône ne change pas d'apparence au
    // passage en_cours -> terminé, seul l'anneau de chargement disparaît.
    const Icone = iconePourOutil(outils, rangee.nomOutil ?? "");
    const colonneIcone = (
      <div className="flex w-4 flex-col items-center">
        {/* Boîte de taille fixe (16x16) : le rond de chargement est
            centré dedans via inset-0 + m-auto, jamais par un décalage
            calculé à la main -- corrige le débordement/chevauchement
            avec l'icône voisine signalé par Bourama (16/09). */}
        <div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
          <Icone size={13} className={rangee.statut === "en_cours" ? "text-dj-texte-muet opacity-40" : "text-dj-texte-muet"} />
          {rangee.statut === "en_cours" && (
            <Loader2 size={16} className="absolute inset-0 m-auto animate-spin text-dj-texte-muet" />
          )}
        </div>
        {/* Ligne connectrice : se trace vers le bas (scaleY, pure CSS,
            jamais de mesure JS ni de délai) dès qu'une rangée suivante
            existe -- peu importe l'état des deux rangées qu'elle relie
            (terminé-terminé, terminé-en_cours, en_cours-en_cours). Sa
            hauteur suit celle de la rangée (stretch flex), donc elle
            rejoint toujours l'icône suivante sans calcul JS -- mais avec
            un plancher `min-h` explicite (16/09, correction) : replié, le
            contenu texte à droite est très court (juste le nom de
            l'outil), donc sans ce plancher la ligne n'avait presque
            aucune hauteur disponible et restait quasi invisible tant que
            personne ne dépliait un résultat pour donner de la hauteur au
            bloc. */}
        {!estDerniere && (
          <div className="mt-1.5 min-h-[18px] w-[2px] flex-1 origin-top animate-dj-ligne-trace bg-dj-bordure" />
        )}
      </div>
    );

    if (rangee.statut === "en_cours") {
      return (
        <div key={rangee.cle} className="flex gap-2.5 pb-3 last:pb-0 animate-dj-fade-in-rapide">
          {colonneIcone}
          <span className="pt-0.5 text-[13px] text-dj-texte-muet">{rangee.texte}</span>
        </div>
      );
    }

    const index = rangees.slice(0, position + 1).filter((x) => x.statut === "termine").length - 1;
    const ouvert = !!ouverts[index];
    const aDesSources = !!rangee.sources && rangee.sources.length > 0;
    const sourcesOuvert = !!sourcesOuvertes[index];
    return (
      <div key={rangee.cle} className="flex gap-2.5 pb-3 last:pb-0 animate-dj-fade-in">
        {colonneIcone}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              onClick={() => setOuverts((prec) => ({ ...prec, [index]: !ouvert }))}
              className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
            >
              <span>{rangee.nomLisible}</span>
              {ouvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
            {aDesSources && (
              <button
                onClick={() => setSourcesOuvertes((prec) => ({ ...prec, [index]: !sourcesOuvert }))}
                className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
              >
                <Link2 size={13} />
                <span>Sources ({rangee.sources!.length})</span>
                {sourcesOuvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            )}
          </div>
          {/* Galerie d'images (01/09) -- TOUJOURS visible, contrairement
              au résultat brut replié juste en dessous : voir
              GalerieImagesBulle.tsx pour le raisonnement. */}
          <GalerieImagesBulle images={rangee.images} />
          <div
            className={`grid transition-[grid-template-rows] duration-300 ease-out ${
              ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <pre className="mt-1.5 max-h-64 overflow-auto rounded-xl border border-dj-bordure bg-dj-surface p-2.5 text-[12px] leading-relaxed text-dj-texte-muet">
                {rangee.resultat}
              </pre>
            </div>
          </div>
          {aDesSources && (
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                sourcesOuvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <SourcesBulle sources={rangee.sources} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

  if (!estGroupe) {
    return <div className="my-1.5 flex max-w-[85%] flex-col">{elementsResultats}</div>;
  }

  return (
    <div className="my-1.5 flex max-w-[85%] flex-col gap-1 animate-dj-fade-in">
      <button
        onClick={() => setGroupeOuvertManuel(!groupeOuvert)}
        className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        <Layers size={13} />
        <span>
          {nbResultats} outil{nbResultats > 1 ? "s" : ""} utilisé{nbResultats > 1 ? "s" : ""}
          {nbEnCours > 0 ? ` (${nbEnCours} en cours)` : ""}
        </span>
        {groupeOuvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>
      {/* La ligne connectrice entre les outils individuels reste bien
          présente une fois le groupe déplié (demande Bourama, 15/09) --
          rien de spécifique à faire ici : elementsResultats porte déjà
          sa propre colonne icône/ligne, ce wrapper ne fait que
          plier/déplier l'ensemble, jamais la ligne à l'intérieur. */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          groupeOuvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden flex flex-col">{elementsResultats}</div>
      </div>
    </div>
  );
}
