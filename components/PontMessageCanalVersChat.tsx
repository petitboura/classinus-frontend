"use client";

// Créé le 19/09/2026, Bourama : canal en direct. Quand un message écrit ou
// dicté par l'étudiant ne peut pas être lu par un tour de Clovis en cours
// (aucun tour, canal fermé, message arrivé trop tard), il doit partir comme
// un vrai message du chat. Ce composant, monté une fois dans AppShell sous
// ContexteChat, enregistre cette voie de repli : le message est déposé dans
// la file du chat (lib/contexteChat.tsx), consommée par ChatIA dès qu'il est
// déjà monté et ouvert.
//
// Correctif (19/09/2026, décision Bourama : "le canal n'envoie rien dans
// le chat [au sens où il ouvre le chat]") : ce repli n'ouvre plus JAMAIS
// le chat lui même -- avant, il forçait `ctx.setEtat("mini")`, ce qui
// faisait surgir le popup de chat à l'écran juste parce qu'un message
// tapé dans le canal n'avait pas pu être lu par un tour en cours. Le
// canal reste indépendant du chat visuellement : si le chat est déjà
// ouvert, le message y apparaît normalement (comportement inchangé) ;
// sinon, il patiente dans la file jusqu'à la prochaine ouverture réelle
// du chat par l'étudiant, sans jamais le faire apparaître de force.

import { useContext, useEffect, useRef } from "react";
import { enregistrerRepliMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { ContexteChat } from "@/lib/contexteChat";

export function PontMessageCanalVersChat() {
  const ctxChat = useContext(ContexteChat);
  const ctxRef = useRef(ctxChat);

  useEffect(() => {
    ctxRef.current = ctxChat;
  }, [ctxChat]);

  useEffect(() => {
    enregistrerRepliMessageEtudiant((texte) => {
      // Dépose dans la file, sans jamais ouvrir le chat de force (voir
      // le commentaire en tête de fichier). Le chat le consomme dès
      // qu'il est déjà monté (ouvert), ou à sa prochaine ouverture réelle.
      ctxRef.current?.deposerMessageEnAttente(texte);
    });
    return () => enregistrerRepliMessageEtudiant(null);
  }, []);

  return null;
}
