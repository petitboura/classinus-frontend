import { ChatSection } from "@/components/chat/ChatSection";
import { ROUTES_DECOUVRIR } from "@/lib/routesDecouvrir";

// 30/09/2026, demande Bourama : le chat prend la place de l'ancien
// écran d'accueil sur l'adresse de départ de l'app ("/"). On arrive donc
// directement dedans à l'ouverture, sans redirection ni éclair, et
// l'adresse affichée est juste classinus.com. Avant, cette page vivait
// sur /chat (07/09/2026, chantier "chat plein écran = vraie section") et
// "/" affichait l'accueil, déplacé depuis sur /tableau-de-bord (voir
// lib/routesApp.ts, source unique de ces adresses).
//
// 21/11/2026, demande Bourama : un lien vers la présentation publique de
// Classinus (/decouvrir) dans le HTML envoyé par le serveur, pour que les
// moteurs de recherche et les IA, qui ne voient de cette page que le chat,
// trouvent le texte de présentation. Il est invisible, sorti du clavier et
// des lecteurs d'écran : rien ne change pour la personne qui utilise l'appli.
export default function PageChat() {
  return (
    <>
      <ChatSection />
      <a href={ROUTES_DECOUVRIR.accueil} className="sr-only" tabIndex={-1} aria-hidden="true">
        Découvrir Classinus : guide des fonctionnalités
      </a>
    </>
  );
}
