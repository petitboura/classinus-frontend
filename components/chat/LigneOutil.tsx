"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Link2, Loader2 } from "lucide-react";
import { SourcesBulle } from "./SourcesBulle";
import { GalerieImagesBulle } from "./GalerieImagesBulle";

// Une ligne d'outil (18/09/2026, demande Bourama : le statut d'un outil
// changeait de façon brutale et incohérente). Avant, l'outil en cours et
// l'outil terminé étaient deux éléments différents dans OutilResultatBulle :
// la ligne "en cours" disparaissait et une ligne "terminé" apparaissait à
// côté avec sa propre animation, d'où l'impression d'en prendre un pour en
// amener un nouveau. Ici, UNE SEULE ligne par outil, du début à la fin,
// jamais remplacée : seul son contenu change, en fondu.
//
// Trois phases visibles, dans cet ordre :
//   en_cours : le rond qui tourne (À LA PLACE de l'icône, plus par dessus
//              comme avant, ce qui causait le chevauchement) + le texte
//              "en cours" envoyé par le backend.
//   effectuee : le rond vert + le texte "effectuée" envoyé par le backend,
//              affiché au moins DUREE_EFFECTUEE_MS pour qu'on ait le temps
//              de le voir (avant, il disparaissait dans la même image que
//              l'arrivée du résultat, donc jamais visible).
//   final : l'icône de l'outil + son nom + le résultat repliable.
//
// Règle déjà demandée par Bourama et conservée : si le résultat est déjà là
// au moment où la ligne apparaît (outil fini pendant que le texte de la
// réponse s'affichait encore, ou fil rechargé depuis l'historique), la
// ligne démarre directement en phase finale, sans rond ni coche.

const DUREE_EFFECTUEE_MS = 600;

export type EtatLigneOutil = "en_cours" | "termine" | "resultat";

type Phase = "en_cours" | "effectuee" | "final";

export type DonneesLigneOutil = {
  etat: EtatLigneOutil;
  texteEnCours?: string;
  texteTermine?: string;
  nomLisible?: string;
  resultat?: string;
  sources?: ComponentProps<typeof SourcesBulle>["sources"];
  images?: ComponentProps<typeof GalerieImagesBulle>["images"];
};

function phaseInitiale(etat: EtatLigneOutil): Phase {
  if (etat === "resultat") return "final";
  if (etat === "termine") return "effectuee";
  return "en_cours";
}

export function LigneOutil({
  donnees,
  Icone,
  estDerniere,
  estGroupe,
}: {
  donnees: DonneesLigneOutil;
  Icone: typeof Loader2;
  estDerniere: boolean;
  estGroupe: boolean;
}) {
  const { etat, texteEnCours, texteTermine, nomLisible, resultat, sources, images } = donnees;

  const [phase, setPhase] = useState<Phase>(() => phaseInitiale(etat));
  const phaseRef = useRef<Phase>(phase);
  const debutEffecteeRef = useRef<number | null>(phase === "effectuee" ? Date.now() : null);
  const [demarreEnFinal] = useState(() => phaseInitiale(etat) === "final");
  const [ouvert, setOuvert] = useState(false);
  const [sourcesOuvert, setSourcesOuvert] = useState(false);

  // Les textes reçus une fois restent disponibles : au moment où le
  // résultat arrive, l'entrée "en cours" n'existe plus côté parent, mais la
  // ligne doit continuer à afficher son texte le temps de la transition.
  const dernierTexteEnCours = useRef("");
  const dernierTexteTermine = useRef("");
  if (texteEnCours) dernierTexteEnCours.current = texteEnCours;
  if (texteTermine) dernierTexteTermine.current = texteTermine;

  function changerPhase(prochaine: Phase) {
    phaseRef.current = prochaine;
    setPhase(prochaine);
  }

  useEffect(() => {
    if (etat === "en_cours") return;

    if (etat === "termine") {
      if (phaseRef.current === "en_cours") {
        debutEffecteeRef.current = Date.now();
        changerPhase("effectuee");
      }
      return;
    }

    // etat === "resultat"
    if (phaseRef.current === "final") return;
    if (phaseRef.current === "en_cours") {
      // Pas de texte "effectuée" connu (échec, ou événement ignoré) : on
      // passe directement à la phase finale, sans coche verte inventée.
      if (!dernierTexteTermine.current) {
        changerPhase("final");
        return;
      }
      debutEffecteeRef.current = Date.now();
      changerPhase("effectuee");
    }
    const ecoule = Date.now() - (debutEffecteeRef.current ?? Date.now());
    const minuteur = setTimeout(() => changerPhase("final"), Math.max(0, DUREE_EFFECTUEE_MS - ecoule));
    return () => clearTimeout(minuteur);
  }, [etat]);

  const aDesSources = !!sources && sources.length > 0;

  // Une couche par phase, superposées dans la même boîte fixe de 16x16 :
  // la couche visible s'affiche, les autres s'effacent en fondu. Aucune ne
  // change de place ni ne se superpose visuellement à une autre.
  const couche = (visible: boolean) =>
    `absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out ${
      visible ? "scale-100 opacity-100" : "pointer-events-none scale-75 opacity-0"
    }`;

  const texteAffiche =
    phase === "en_cours" ? texteEnCours ?? dernierTexteEnCours.current : texteTermine ?? dernierTexteTermine.current;

  return (
    <div className={`flex gap-2.5 ${demarreEnFinal ? "animate-dj-fade-in" : "animate-dj-fade-in-rapide"}`}>
      <div className="flex w-4 flex-col items-center">
        <div className="relative mt-0.5 h-4 w-4 shrink-0">
          <span className={couche(phase === "en_cours")} aria-hidden={phase !== "en_cours"}>
            <Loader2 size={16} className="animate-spin text-dj-texte-muet" />
          </span>
          <span className={couche(phase === "effectuee")} aria-hidden={phase !== "effectuee"}>
            <CheckCircle2 size={16} className="text-dj-succes" />
          </span>
          <span className={couche(phase === "final")} aria-hidden={phase !== "final"}>
            <Icone size={13} className="text-dj-texte-muet" />
          </span>
        </div>
        {/* Ligne connectrice (chantier du 15/09/2026, demande Bourama) : se
            trace vers le bas dès qu'une rangée suivante existe, quel que
            soit l'état des deux rangées reliées. Sa hauteur suit celle de
            la rangée via stretch flex : le pb-3 est dans le bloc de contenu
            plus bas (correction du 17/09), donc la ligne rejoint toujours
            l'icône suivante bout à bout, sans vide. min-h est un simple
            filet de sécurité. */}
        {!estDerniere && (
          <div className="mt-1 min-h-[6px] w-[2px] flex-1 origin-top animate-dj-ligne-trace bg-dj-bordure" />
        )}
      </div>

      <div className={`min-w-0 flex-1 ${estDerniere ? "" : "pb-3"}`}>
        {phase !== "final" ? (
          <span key={phase} className="block animate-dj-fade-in-rapide text-[13px] text-dj-texte-muet">
            {texteAffiche}
          </span>
        ) : (
          <div className={demarreEnFinal ? "" : "animate-dj-fade-in-rapide"}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                onClick={() => setOuvert((precedent) => !precedent)}
                className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
              >
                <span>{nomLisible}</span>
                {ouvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
              {aDesSources && (
                <button
                  onClick={() => setSourcesOuvert((precedent) => !precedent)}
                  className="flex items-center gap-1.5 text-[13px] text-dj-texte-muet transition-colors hover:text-dj-texte"
                >
                  <Link2 size={13} />
                  <span>Sources ({sources!.length})</span>
                  {sourcesOuvert ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
              )}
            </div>
            {/* Galerie d'images (01/09) : TOUJOURS visible, contrairement au
                résultat brut replié juste en dessous. Rendue ici seulement
                quand la ligne N'EST PAS dans un groupe (17/09, correction
                Bourama) : en groupe, elle est rendue à part par le parent,
                hors du repli automatique du groupe. */}
            {!estGroupe && <GalerieImagesBulle images={images} />}
            <div
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                ouvert ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <pre className="mt-1.5 max-h-64 overflow-auto rounded-xl border border-dj-bordure bg-dj-surface p-2.5 text-[12px] leading-relaxed text-dj-texte-muet">
                  {resultat}
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
                  <SourcesBulle sources={sources} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
