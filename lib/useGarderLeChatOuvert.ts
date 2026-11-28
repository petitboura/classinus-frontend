"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useOuvrirChat } from "@/lib/contexteChat";
import { marquerArriveeDepuisChat, pageAccepteChatLateral, useGrandEcranChat } from "@/lib/chatLateral";
import { estPageChat } from "@/lib/routesApp";

// Le chat ne se ferme que par son bouton Fermer (28/11/2026, demande de
// Bourama). Depuis le chat plein écran, un clic sur une section ou une
// sous-section ouvre donc le chat collé à droite (la même conversation, le
// chat est un seul et même contexte) et la page à gauche : le chat est repoussé
// vers la droite pendant que la page s'ouvre.
//
// Appeler la fonction renvoyée juste avant de naviguer, depuis un point
// d'entrée de navigation du chat plein écran (barre latérale, palette de
// commandes). Elle ne fait rien hors du chat plein écran, ni sur téléphone ou
// dans une fenêtre étroite (moins de 768 px) : là, la navigation reste celle
// d'avant.
//
// Elle lit la page et la taille d'écran dans des refs : une commande mémorisée
// (palette de commandes) garde cette fonction longtemps, elle ne doit jamais
// raisonner sur la page où elle a été créée.
export function useGarderLeChatOuvert(): (destination: string) => void {
  const pathname = usePathname();
  const grandEcran = useGrandEcranChat();
  const ouvrirChat = useOuvrirChat();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const grandEcranRef = useRef(grandEcran);
  grandEcranRef.current = grandEcran;
  const ouvrirChatRef = useRef(ouvrirChat);
  ouvrirChatRef.current = ouvrirChat;

  return (destination: string) => {
    if (!estPageChat(pathnameRef.current) || !grandEcranRef.current) return;
    // Dans les paramètres le chat reste flottant : il n'y a pas de colonne à
    // faire rétrécir, donc aucun repère d'arrivée à poser.
    if (pageAccepteChatLateral(destination)) marquerArriveeDepuisChat();
    ouvrirChatRef.current("mini");
  };
}
