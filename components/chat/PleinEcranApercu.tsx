"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useFermetureAuRetour } from "@/lib/contexteRetour";

// 20/09/2026, demande Bourama : le bouton Agrandir d'un aperçu (widget,
// PDF, Word, Excel, texte) ouvrait une petite fenêtre flottante coincée
// dans le message au lieu d'un vrai plein écran.
//
// Deux causes traitées ici :
//   1. Forme : ce composant est un plein écran de bord à bord (pas de
//      marges, pas de coins arrondis, pas de plafond de hauteur), comme le
//      plein écran du visionneur de la bibliothèque, avec une barre en
//      haut (titre, Rétrécir, Fermer).
//   2. Emplacement : il est monté via un portail directement dans <body>.
//      Rendu à l'intérieur du message, un élément "position: fixed" est
//      recadré par n'importe quel parent animé (transform, filter,
//      contain) : la fenêtre de chat elle même est un PanneauFlottant
//      animé, donc tout plein écran rendu dans un message se retrouvait
//      limité à la zone du message. Sorti du message, plus rien ne peut
//      l'enfermer.
//
// z-[160] : au dessus du chat quand il est lui même dans un panneau
// flottant (z-[150], voir ChatSection.tsx et ChatFlottant.tsx). Les
// fenêtres ouvertes depuis le plein écran (modale de téléchargement)
// doivent être rendues DANS ses enfants pour rester au dessus ; l'aperçu
// de lien (VisionneurPositionGlobal) passe à z-[170] pour la même raison.
//
// L'animation d'apparition reste un simple fondu (opacity) : une
// animation avec transform garderait un transform actif après la fin
// (fill-mode both) et recadrerait à son tour les fenêtres qu'elle
// contient.
// Largeur maximale de la colonne centrée (72rem), commune à l'en-tête et au
// contenu pour qu'ils restent alignés.
const LARGEUR_COLONNE = "max-w-6xl";

export function PleinEcranApercu({
  titre,
  entete,
  onFerme,
  enSortie = false,
  pleineLargeur = false,
  children,
}: {
  titre: string;
  entete: ReactNode;
  onFerme: () => void;
  enSortie?: boolean;
  // Contenu qui doit occuper toute la largeur (aperçu en iframe : widget,
  // Office). Par défaut, l'en-tête et le contenu sont centrés dans une
  // colonne à largeur plafonnée (24/09/2026, demande Bourama : rien collé à
  // gauche sur un grand écran).
  pleineLargeur?: boolean;
  children: ReactNode;
}) {
  // document n'existe pas pendant le rendu serveur : le portail n'est
  // créé qu'une fois monté côté navigateur.
  const [monte, setMonte] = useState(false);
  useEffect(() => setMonte(true), []);

  // Bouton retour (navigateur, geste ou bouton natif) : même pile de
  // fermeture que PanneauFlottant, pour un comportement identique à avant.
  useFermetureAuRetour(true, onFerme);

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") onFerme();
    }
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [onFerme]);

  if (!monte) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      // Un clic dans le plein écran ne doit rien déclencher dans le
      // message d'origine (l'arbre React traverse le portail).
      onClick={(e) => e.stopPropagation()}
      className={`fixed inset-0 z-[160] flex flex-col bg-dj-surface pb-[var(--safe-bottom)] pt-[var(--safe-top)] text-dj-texte ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
    >
      <div className="flex-shrink-0 border-b border-dj-bordure px-4 py-3 sm:px-6">
        <div className={`mx-auto w-full ${pleineLargeur ? "" : LARGEUR_COLONNE}`}>{entete}</div>
      </div>
      {/* font-lecture : le contenu (markdown, texte) gardait la police du
          message parce qu'il était rendu dedans, ce que le portail ne
          permet plus d'hériter. */}
      <div className="flex min-h-0 flex-1 flex-col p-3 font-lecture text-[16px] leading-relaxed sm:p-4">
        {/* Colonne centrée (mx-auto) : sur un grand écran, le contenu ne colle
            plus au bord gauche. Même comportement flex que le parent
            (flex-col, flex-1, min-h-0) pour que les enfants gardent leur
            hauteur. */}
        <div className={`mx-auto flex min-h-0 w-full flex-1 flex-col ${pleineLargeur ? "" : LARGEUR_COLONNE}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
