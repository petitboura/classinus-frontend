import { ChatSection } from "@/components/chat/ChatSection";

// 30/09/2026, demande Bourama : le chat prend la place de l'ancien
// écran d'accueil sur l'adresse de départ de l'app ("/"). On arrive donc
// directement dedans à l'ouverture, sans redirection ni éclair, et
// l'adresse affichée est juste classinus.com. Avant, cette page vivait
// sur /chat (07/09/2026, chantier "chat plein écran = vraie section") et
// "/" affichait l'accueil, déplacé depuis sur /tableau-de-bord (voir
// lib/routesApp.ts, source unique de ces adresses).
export default function PageChat() {
  return <ChatSection />;
}
