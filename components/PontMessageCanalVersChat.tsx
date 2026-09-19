"use client";

// Créé le 19/09/2026, Bourama : canal en direct. Quand un message écrit ou
// dicté par l'étudiant ne peut pas être lu par un tour de Clovis en cours
// (aucun tour, canal fermé, message arrivé trop tard), il doit partir comme
// un vrai message du chat. Ce composant, monté une fois dans AppShell sous
// ContexteChat, enregistre cette voie de repli : le message est déposé dans
// la file du chat (lib/contexteChat.tsx), consommée par ChatIA dès qu'il est
// libre, et le chat est ouvert s'il ne l'était pas (déjà affiché sur /chat,
// sinon le petit popup).

import { usePathname } from "next/navigation";
import { useContext, useEffect, useRef } from "react";
import { enregistrerRepliMessageEtudiant } from "@/lib/canalAgentApplicatif";
import { ContexteChat } from "@/lib/contexteChat";

export function PontMessageCanalVersChat() {
  const ctxChat = useContext(ContexteChat);
  const pathname = usePathname();
  const ctxRef = useRef(ctxChat);
  const cheminRef = useRef(pathname);

  useEffect(() => {
    ctxRef.current = ctxChat;
    cheminRef.current = pathname;
  }, [ctxChat, pathname]);

  useEffect(() => {
    enregistrerRepliMessageEtudiant((texte) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.deposerMessageEnAttente(texte);
      if (!cheminRef.current.startsWith("/chat") && ctx.etat === "fermee") ctx.setEtat("mini");
    });
    return () => enregistrerRepliMessageEtudiant(null);
  }, []);

  return null;
}
