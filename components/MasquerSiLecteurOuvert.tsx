"use client";

import type { ReactNode } from "react";
import { useContenuLecteur } from "@/lib/lecteurLateral";

// 27/11/2026, demande Bourama : le lecteur (volet à côté du chat) recouvre le
// coin en haut à droite, donc la cloche des notifications et les minuteurs
// y étaient cachés à moitié. Tant que le lecteur est ouvert, on les masque.
// Masquage par CSS (display: none) et non par démontage : la cloche garde ses
// abonnements et les minuteurs continuent de tourner. Fermé, le conteneur
// n'a aucun effet sur la mise en page (display: contents).
export function MasquerSiLecteurOuvert({ children }: { children: ReactNode }) {
  const ouvert = useContenuLecteur() !== null;
  return <div className={ouvert ? "hidden" : "contents"}>{children}</div>;
}
