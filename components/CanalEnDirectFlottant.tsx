"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier L. Groupe flottant en bas
// à gauche (emplacement choisi par Bourama le 19/09/2026) :
// - en bas, le bouton d'activation du canal (ce fichier) ;
// - au dessus, quand le canal est actif, les boutons d'interaction du
//   chantier M et N (ControlesInteractionCanal.tsx).
//
// Bouton permanent (01/10/2026, demande Bourama) : dans la superposition
// Electron, ce bouton est le seul élément affiché en permanence (les autres
// n'apparaissent qu'à l'activation du canal), même fenêtre de Classinus
// fermée. Au repos (canal inactif, souris ailleurs) son opacité est celle
// choisie par l'étudiant, jamais en dessous du minimum de
// lib/opaciteBoutonCanal.ts ; elle revient à 100 % au survol et dès que le
// canal est actif. Le réglage se fait depuis le bouton, une fois le canal
// activé (ReglageOpaciteBoutonCanal.tsx). Rien de tout cela ne s'applique sur
// web et mobile : l'opacité y reste à 100 %.
//
// Correctif (19/09/2026, decision Bourama : "on ne désactive rien de
// son fonctionnement parce qu'il est dans le chat, [le canal] doit être
// tellement indépendant que...") : plus AUCUNE condition liée à /chat
// ici. Le canal (bouton d'activation compris) se comporte exactement de
// la même façon partout, chat plein écran inclus -- ce n'est pas le
// même point d'entrée que le chat, avoir les deux visibles en même
// temps sur /chat est voulu, pas un doublon à masquer.
//
// Placement : l'écart du bas suit la convention des autres éléments
// fixed ancrés en bas (ChatFlottant.tsx) : barre d'onglets web via
// --dj-barre-onglets-web et barre native via
// --cap-native-navigation-bottom, toutes deux à 0px quand elles ne
// s'appliquent pas. Sur /chat mobile, la barre de saisie occupe toute la
// largeur en bas : le groupe est relevé pour ne pas la recouvrir.
// Le côté gauche suit le rail latéral sur ordinateur, voir
// lib/useDecalageRailLateral.ts.

import { AnimatePresence, motion } from "framer-motion";
import { Radio } from "lucide-react";
import { usePathname } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { ControlesInteractionCanal } from "@/components/ControlesInteractionCanal";
import { ReglageOpaciteBoutonCanal } from "@/components/ReglageOpaciteBoutonCanal";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import {
  OPACITE_REPOS_DEFAUT,
  ecrireOpaciteRepos,
  lireOpaciteRepos,
} from "@/lib/opaciteBoutonCanal";
import { estDansFenetreSuperposition } from "@/lib/superpositionElectron";
import { useDecalageRailLateral } from "@/lib/useDecalageRailLateral";
import { useDeplacable } from "@/lib/useDeplacable";

// Classes écrites en toutes lettres : Tailwind ne génère que les classes
// qu'il trouve telles quelles dans le code, jamais celles assemblées par
// interpolation.
const CLASSE_BAS_NORMAL = "bottom-[calc(1.25rem+var(--dj-barre-onglets-web,0px)+var(--cap-native-navigation-bottom,0px))]";
const CLASSE_BAS_CHAT =
  "bottom-[calc(7rem+var(--dj-barre-onglets-web,0px)+var(--cap-native-navigation-bottom,0px))] md:bottom-[calc(1.25rem+var(--dj-barre-onglets-web,0px)+var(--cap-native-navigation-bottom,0px))]";

export function CanalEnDirectFlottant() {
  const contexte = useContext(ContexteCanalEnDirect);
  const pathname = usePathname();
  const decalageRail = useDecalageRailLateral();
  // Déplaçable (20/09/2026, demande Bourama) : le groupe entier (bouton du
  // canal, dictée, écriture) se déplace ensemble, voir lib/useDeplacable.ts.
  const deplacement = useDeplacable<HTMLDivElement>();

  // Opacité au repos : uniquement dans la superposition Electron. Lue après
  // le premier rendu (pas pendant), pour que la page statique et le premier
  // rendu côté client restent identiques.
  const [dansSuperposition, setDansSuperposition] = useState(false);
  const [opaciteRepos, setOpaciteRepos] = useState(OPACITE_REPOS_DEFAUT);
  const [survol, setSurvol] = useState(false);
  const [reglageOuvert, setReglageOuvert] = useState(false);
  useEffect(() => {
    if (!estDansFenetreSuperposition()) return;
    setDansSuperposition(true);
    setOpaciteRepos(lireOpaciteRepos());
  }, []);

  function changerOpaciteRepos(valeur: number) {
    setOpaciteRepos(valeur);
    ecrireOpaciteRepos(valeur);
  }

  if (!contexte) return null;
  const { actif, activer, desactiver } = contexte;
  const surChat = pathname === "/chat";

  return (
    <div
      ref={deplacement.ref}
      data-agent-superposition="true"
      {...deplacement.poignee}
      className={`fixed z-[65] flex touch-none flex-col-reverse items-start gap-2 ${surChat ? CLASSE_BAS_CHAT : CLASSE_BAS_NORMAL}`}
      style={{ left: `calc(${decalageRail}px + 1rem)`, ...deplacement.style }}
    >
      <div className="flex items-center gap-2">
        <motion.button
          key="activation"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: dansSuperposition && (reglageOuvert || (!actif && !survol)) ? opaciteRepos : 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          onMouseEnter={() => setSurvol(true)}
          onMouseLeave={() => setSurvol(false)}
          onClick={() => (actif ? desactiver() : activer())}
          aria-pressed={actif}
          aria-label={actif ? "Désactiver le canal en direct" : "Activer le canal en direct"}
          title={actif ? "Désactiver le canal en direct" : "Activer le canal en direct"}
          className={`flex h-10 w-10 items-center justify-center rounded-full border shadow-lg transition-colors ${
            actif
              ? "border-dj-accent-1 bg-dj-accent-1 text-[#1A0D02] hover:bg-dj-accent-2"
              : "border-dj-bordure bg-dj-surface text-dj-texte-muet hover:text-dj-texte"
          }`}
        >
          <Radio size={18} />
        </motion.button>
        <AnimatePresence>
          {actif && dansSuperposition && (
            <motion.div
              key="reglage-opacite"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.15 }}
            >
              <ReglageOpaciteBoutonCanal valeur={opaciteRepos} surChangement={changerOpaciteRepos} surOuverture={setReglageOuvert} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ControlesInteractionCanal />
    </div>
  );
}
