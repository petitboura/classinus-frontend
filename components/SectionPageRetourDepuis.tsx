"use client";

import { useSearchParams } from "next/navigation";
import { SectionPage } from "@/components/SectionPage";

// 18/09/2026, correctif Bourama (bouton retour d'un fichier partagé qui
// ramenait toujours à la bibliothèque de l'appli au lieu du dossier
// parcouru pour y arriver) : lit ?depuis= (posé par le lien de
// app/(app)/dossiers/[id]/page.tsx) côté client via useSearchParams,
// jamais via le prop searchParams du Server Component -- testé et
// confirmé le jour même que lire searchParams côté serveur sur cette
// route casse le build export statique mobile (build:capacitor,
// CAPACITOR_BUILD=true), même avec l'id "placeholder" jamais réellement
// visité par l'appli native. useSearchParams côté client, entouré d'un
// <Suspense> dans page.tsx, n'a pas ce problème : c'est la façon
// documentée par Next.js de lire l'URL sans empêcher l'export statique.
//
// Un fichier public peut appartenir à plusieurs dossiers à la fois
// (table de liaison côté backend), donc pas de "dossier parent" unique
// à interroger en base : on suit le chemin réellement parcouru plutôt
// qu'une règle fixe. Absent (arrivée directe depuis la racine de la
// bibliothèque publique, ou lien de partage du fichier seul) :
// retour à `routeParDefaut`, comme avant ce correctif.
export function SectionPageRetourDepuis({
  title,
  routeParDefaut,
  children,
}: {
  title: string;
  routeParDefaut: string;
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const depuis = searchParams.get("depuis");
  const retour = depuis ? `/dossiers/${depuis}` : routeParDefaut;

  return (
    <SectionPage title={title} retour={retour}>
      {children}
    </SectionPage>
  );
}
