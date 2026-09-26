"use client";

import { useRouter } from "next/navigation";
import { BoutonRetour } from "@/components/BoutonRetour";

// Chantier SEO/AEO de Classinus (26/09/2026, demande Bourama) : sur les
// pages publiques /decouvrir/..., "Retour" doit ramener exactement là où
// la personne était avant (par exemple l'écran connecté d'où elle a
// cliqué "En savoir plus"), pas juste à l'accueil de l'appli.
//
// router.back() plutôt qu'une destination fixe (href), à la différence
// du reste de l'app qui évite volontairement router.back() (voir le
// commentaire au dessus de components/SectionPage.tsx : l'app pousse de
// fausses entrées d'historique pour fermer menus et panneaux, ce qui
// rendait un vrai retour navigateur imprévisible). Ces pages /decouvrir
// sont en dehors de cette pile d'écrans internes, donc pas le même
// risque : l'entrée d'historique juste avant est une vraie page.
export function BoutonRetourDecouvrir() {
  const router = useRouter();
  return <BoutonRetour onClick={() => router.back()} avecTexte />;
}
