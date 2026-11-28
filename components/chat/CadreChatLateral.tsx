"use client";

import type { ReactNode } from "react";
import { LARGEUR_CHAT_LATERAL_MIN } from "@/lib/chatLateral";
import type { EtatChatLateral } from "@/lib/useChatLateral";

// Cadre du chat dans ChatFlottant.tsx (28/11/2026, demande de Bourama : le chat
// se colle à droite des pages au lieu de flotter, et on l'élargit en tirant sa
// barre).
//
// Un seul élément enveloppe le chat dans les deux présentations, pour que le
// chat ne soit JAMAIS démonté en passant de l'une à l'autre (la conversation
// en cours, une réponse qui arrive, tout reste en place) :
// - collé (docke) : colonne à droite de la page, dont la largeur glisse de 0 à
//   la largeur choisie. Le chat à l'intérieur garde une largeur fixe : son
//   contenu ne se recalcule pas pendant l'animation (sauf à l'étirement plein
//   écran et à l'arrivée depuis le chat plein écran, où il suit la colonne) ;
// - flottant (paramètres, fenêtre étroite) : l'enveloppe n'a aucune boîte
//   (display: contents), la fenêtre flottante se place comme avant.

// La zone qui sert à tirer la barre est superposée au bord gauche de la colonne
// (aucune bande visible).
const LARGEUR_ZONE_TIREE = 8;

export function CadreChatLateral({
  docke,
  lateral,
  children,
}: {
  docke: boolean;
  lateral: EtatChatLateral;
  children: ReactNode;
}) {
  return (
    <div
      ref={lateral.racineRef}
      data-contenant-flottant={docke ? "" : undefined}
      className={docke ? "relative flex min-h-0 shrink-0 overflow-hidden bg-dj-fond" : "contents"}
      style={
        docke
          ? {
              // 0 fermé, la largeur choisie ouvert, toute la fenêtre pendant
              // l'étirement plein écran ou à l'arrivée depuis le chat plein écran.
              width: lateral.largeurColonne,
              // Pendant le glissement de la barre, la largeur suit le doigt sans retard.
              transition: lateral.transitionLargeur,
            }
          : undefined
      }
    >
      {children}
      {/* Barre à tirer pour élargir ou rétrécir le chat. Un double clic remet la largeur d'origine. */}
      {docke && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner le chat"
          aria-valuenow={lateral.largeur}
          aria-valuemin={LARGEUR_CHAT_LATERAL_MIN}
          tabIndex={0}
          onPointerDown={lateral.demarrerTirage}
          onKeyDown={lateral.surTouche}
          onDoubleClick={lateral.reinitialiser}
          className={`absolute inset-y-0 left-0 z-10 cursor-col-resize outline-none transition-colors duration-150 hover:bg-dj-bordure focus-visible:bg-dj-bordure ${
            lateral.glisse ? "bg-dj-bordure" : ""
          }`}
          style={{ width: LARGEUR_ZONE_TIREE, touchAction: "none" }}
        />
      )}
      {/* Pendant le glissement, un voile capte la souris : sans lui, un aperçu en iframe (Word, Excel) l'avalerait. */}
      {docke && lateral.glisse && <div className="fixed inset-0 z-[160] cursor-col-resize" />}
    </div>
  );
}
