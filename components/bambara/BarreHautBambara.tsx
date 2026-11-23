"use client";

// Page bambara (18/11/2026, demande de Bourama) : la rangée de boutons en haut à gauche, qui flotte par dessus
// la conversation comme la bulle à droite. Dans l'ordre : paramètres (23/11/2026, demande de Bourama : à la place du
// bouton profil), nouvelle conversation (un simple « + »), historique, éléments gardés. Seules des icônes : la personne
// ne lit pas. Les paramètres, l'historique et les gardés
// ouvrent un petit panneau sous la rangée (un seul à la fois, un second toucher ou un toucher à côté le referme) ;
// le « + » ne ferme rien d'autre que ces panneaux, il repart d'une conversation vide.
// Noir et blanc seulement (couleurs de .bb-page).

import { AnimatePresence, motion } from "framer-motion";
import { History, Heart, Menu, Plus, Settings, X, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ConversationBambara } from "@/lib/bambaraEspace";
import type { EspaceBambara } from "@/lib/useBambaraEspace";
import type { GardeUiBambara } from "./BoutonCoeurBambara";
import { PanneauGardesBambara } from "./PanneauGardesBambara";
import { PanneauHistoriqueBambara } from "./PanneauHistoriqueBambara";
import { PanneauParametresBambara } from "./PanneauParametresBambara";
import type { ReglagesBambara } from "@/lib/reglagesBambara";

export type TextesBarreBambara = {
  parametres: string;
  afficherTexteReponse: string;
  nouvelleConversation: string;
  historique: string;
  gardes: string;
  videos: string;
  images: string;
  ecouter: string;
  mettreEnPause: string;
  lire: string;
  fermerVideo: string;
  ouvrirImage: string;
  ouvrirMenu: string;
  fermerMenu: string;
  ouvrirConversation: string;
};

type Panneau = "parametres" | "historique" | "gardes";

type Props = {
  espace: EspaceBambara;
  reglages: ReglagesBambara;
  garde: GardeUiBambara;
  textes: TextesBarreBambara;
  surNouvelleConversation: () => void;
  /** Une conversation de l'historique est touchée : la page la rouvre en entier. */
  surOuvrirConversation: (conversation: ConversationBambara) => void;
  messageEnLecture: string | null;
  changerMessageEnLecture: (id: string | null) => void;
  videoEnLecture: string | null;
  changerVideoEnLecture: (id: string | null) => void;
};

const CLASSE_BOUTON = "flex h-11 w-11 items-center justify-center rounded-full border transition-[transform,background-color,color] active:scale-95";

export function BarreHautBambara({ espace, reglages, garde, textes, surNouvelleConversation, surOuvrirConversation, messageEnLecture, changerMessageEnLecture, videoEnLecture, changerVideoEnLecture }: Props) {
  const [panneau, setPanneau] = useState<Panneau | null>(null);
  // Demande de Bourama du 22/11/2026 : un seul bouton ouvre et ferme la rangée des quatre boutons.
  const [rangeeOuverte, setRangeeOuverte] = useState(false);

  const fermer = useCallback(() => setPanneau(null), []);
  const basculerRangee = () => {
    if (rangeeOuverte) setPanneau(null);
    setRangeeOuverte((ouverte) => !ouverte);
  };
  const basculer = (cible: Panneau) => setPanneau((courant) => (courant === cible ? null : cible));

  useEffect(() => {
    if (!panneau) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanneau(null);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [panneau]);

  const boutons: Array<{ id: string; libelle: string; Icone: LucideIcon; actif: boolean; surClic: () => void }> = [
    { id: "parametres", libelle: textes.parametres, Icone: Settings, actif: panneau === "parametres", surClic: () => basculer("parametres") },
    {
      id: "nouvelle",
      libelle: textes.nouvelleConversation,
      Icone: Plus,
      actif: false,
      surClic: () => {
        fermer();
        surNouvelleConversation();
      },
    },
    { id: "historique", libelle: textes.historique, Icone: History, actif: panneau === "historique", surClic: () => basculer("historique") },
    { id: "gardes", libelle: textes.gardes, Icone: Heart, actif: panneau === "gardes", surClic: () => basculer("gardes") },
  ];

  return (
    <>
      {/* Un toucher à côté du panneau le referme, sans rien faire d'autre. */}
      {panneau && <div className="absolute inset-0 z-10" onClick={fermer} aria-hidden />}

      <div className="absolute left-3 z-20 flex items-center gap-2" style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}>
        <button
          type="button"
          onClick={basculerRangee}
          aria-label={rangeeOuverte ? textes.fermerMenu : textes.ouvrirMenu}
          aria-expanded={rangeeOuverte}
          className={CLASSE_BOUTON}
          style={{
            borderColor: rangeeOuverte ? "var(--bb-encre)" : "var(--bb-trait-fort)",
            backgroundColor: rangeeOuverte ? "var(--bb-encre)" : "var(--bb-fond)",
            color: rangeeOuverte ? "var(--bb-fond)" : "var(--bb-encre)",
          }}
        >
          {rangeeOuverte ? <X size={20} /> : <Menu size={20} />}
        </button>
        <AnimatePresence initial={false}>
          {rangeeOuverte &&
            boutons.map(({ id, libelle, Icone, actif, surClic }, i) => (
              <motion.button
                key={id}
                type="button"
                onClick={surClic}
                aria-label={libelle}
                aria-pressed={id === "nouvelle" ? undefined : actif}
                initial={{ opacity: 0, x: -12, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1, transition: { duration: 0.2, ease: "easeOut", delay: i * 0.04 } }}
                exit={{ opacity: 0, x: -12, scale: 0.8, transition: { duration: 0.15 } }}
                className={CLASSE_BOUTON}
                style={{
                  borderColor: actif ? "var(--bb-encre)" : "var(--bb-trait-fort)",
                  backgroundColor: actif ? "var(--bb-encre)" : "var(--bb-fond)",
                  color: actif ? "var(--bb-fond)" : "var(--bb-encre)",
                }}
              >
                <Icone size={20} />
              </motion.button>
            ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {panneau && (
          <motion.div
            key={panneau}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="absolute left-3 right-3 z-20 overflow-y-auto overscroll-contain rounded-3xl border p-4 sm:right-auto sm:w-[26rem]"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 4.25rem)",
              maxHeight: "min(60vh, 28rem)",
              backgroundColor: "var(--bb-fond)",
              borderColor: "var(--bb-trait-fort)",
            }}
          >
            {panneau === "parametres" && (
              <PanneauParametresBambara
                afficherTexteReponse={reglages.afficherTexteReponse}
                changerAfficherTexteReponse={reglages.changerAfficherTexteReponse}
                libelleAfficherTexte={textes.afficherTexteReponse}
              />
            )}
            {panneau === "historique" && (
              <PanneauHistoriqueBambara
                conversations={espace.conversations}
                charger={espace.chargerConversations}
                idEnLecture={messageEnLecture}
                surChangerLecture={changerMessageEnLecture}
                libelleEcouter={textes.ecouter}
                libelleMettreEnPause={textes.mettreEnPause}
                surOuvrir={(conversation) => {
                  fermer();
                  surOuvrirConversation(conversation);
                }}
                libelleOuvrir={textes.ouvrirConversation}
              />
            )}
            {panneau === "gardes" && (
              <PanneauGardesBambara
                gardes={espace.gardes}
                garde={garde}
                idEnLecture={videoEnLecture}
                surChangerLecture={changerVideoEnLecture}
                libelleVideos={textes.videos}
                libelleImages={textes.images}
                libelleLire={textes.lire}
                libelleFermerVideo={textes.fermerVideo}
                libelleOuvrirImage={textes.ouvrirImage}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
