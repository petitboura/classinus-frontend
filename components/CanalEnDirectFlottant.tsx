"use client";

// Créé le 19/09/2026, Bourama : chantier "canal en direct" (voir
// plan-canal-agent-applicatif-v1.md), chantier L. Groupe flottant en bas
// à gauche (emplacement choisi par Bourama le 19/09/2026) :
// - en bas, le bouton d'activation du canal (ce fichier) ;
// - au dessus, quand le canal est actif, les boutons d'interaction du
//   chantier M et N (ControlesInteractionCanal.tsx).
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

import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { ControlesInteractionCanal } from "@/components/ControlesInteractionCanal";
import { ContexteCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { useDecalageRailLateral } from "@/lib/useDecalageRailLateral";

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

  if (!contexte) return null;
  const { actif, activer, desactiver } = contexte;
  const surChat = pathname === "/chat";

  return (
    <div
      data-agent-superposition="true"
      className={`fixed z-[65] flex flex-col-reverse items-start gap-2 ${surChat ? CLASSE_BAS_CHAT : CLASSE_BAS_NORMAL}`}
      style={{ left: `calc(${decalageRail}px + 1rem)` }}
    >
      <motion.button
        key="activation"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.15 }}
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
      <ControlesInteractionCanal />
    </div>
  );
}
