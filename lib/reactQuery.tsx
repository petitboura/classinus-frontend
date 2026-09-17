"use client";

import { useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

// Créé le 17/09/2026, demande Bourama : cache/état partagé pour toutes
// les sections de l'app (Bibliothèque, Dossiers, Comportements,
// Mémoire...). Avant ce fichier, chaque section stockait ses données
// dans un useState local à son propre composant de page -- Next.js
// démonte ce composant à chaque changement de route (voir
// app/(app)/layout.tsx, seul AppShell reste monté en permanence), donc
// tout repartait de zéro à chaque navigation, ET rien ne survivait à un
// rafraîchissement de page.
//
// Ce module règle les deux à la fois :
// - QueryClient unique, créé une seule fois par session d'app (jamais
//   recréé au fil des re-renders, voir useState(() => ...) plus bas) :
//   toute section qui demande la même clé de requête pendant qu'une
//   autre l'a déjà chargée récupère la donnée déjà en mémoire, sans
//   nouvel appel réseau, y compris après un démontage/remontage de la
//   page (changement de route).
// - Persistance en sessionStorage (PAS localStorage : la donnée ne doit
//   pas survivre à la fermeture complète du navigateur, seulement à une
//   navigation ou un F5) : au rechargement de page, le cache est relu
//   immédiatement depuis sessionStorage et réaffiché tel quel, PENDANT
//   qu'une requête de fraîcheur repart en arrière-plan (staleTime ci-
//   dessous) -- l'utilisateur ne revoit donc plus jamais un écran vide
//   ni un skeleton juste après F5 si la donnée était déjà connue.
//
// staleTime à 60s (pas 0, pas Infinity) : une donnée revisitée dans la
// minute est servie telle quelle sans reguêter (c'est exactement le cas
// "j'ouvre un sous-dossier, je ressors, je re-rentre" signalé par
// Bourama) ; au-delà, React Query revalide seul en arrière-plan dès
// qu'un composant redemande la clé, sans jamais bloquer l'affichage
// (affichage progressif, standards-dev #7 : les anciennes données
// restent visibles pendant la revalidation, jamais de flash vide).
const UNE_MINUTE_EN_MS = 60 * 1000;
const VINGT_QUATRE_HEURES_EN_MS = 24 * 60 * 60 * 1000;

function creerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: UNE_MINUTE_EN_MS,
        // gcTime long (24h) : une donnée mise de côté (section quittée)
        // reste éligible à la persistance sessionStorage tant que la
        // session dure, plutôt que d'être évincée du cache après les 5
        // minutes par défaut de React Query.
        gcTime: VINGT_QUATRE_HEURES_EN_MS,
        // Un retour d'onglet ne doit jamais déclencher un rechargement
        // brut visible : la revalidation se fait silencieusement derrière
        // les données déjà affichées (staleTime ci-dessus régit déjà le
        // rythme réel des requêtes).
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}

/**
 * À placer une seule fois, à la racine de l'app (voir app/layout.tsx).
 * Rendu côté client uniquement ("use client") : sessionStorage n'existe
 * pas côté serveur, et le cache lui-même n'a aucun sens à persister
 * entre deux requêtes serveur de toute façon.
 */
export function FournisseurRequetes({ children }: { children: React.ReactNode }) {
  // useState(() => ...), jamais `new QueryClient()` en ligne : sinon un
  // re-render du composant parent recréerait un client (et donc un
  // cache) neuf à chaque fois, ce qui viderait tout le travail de ce
  // fichier.
  const [queryClient] = useState(creerQueryClient);
  const [persister] = useState(() => {
    if (typeof window === "undefined") return undefined;
    return createSyncStoragePersister({ storage: window.sessionStorage });
  });

  // Pas de sessionStorage disponible (rendu serveur, ou navigateur qui
  // le bloque) : on retombe sur un QueryClientProvider simple, sans
  // persistance -- l'app fonctionne quand même, juste sans survie au F5
  // (dégradation silencieuse, standards-dev #9 : jamais un plantage pour
  // un stockage indisponible).
  if (!persister) {
    return (
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: NEANT }}>
        {children}
      </PersistQueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
      {children}
    </PersistQueryClientProvider>
  );
}

// Persister neutre (aucune opération) pour le repli côté serveur ou
// sans sessionStorage : évite de dupliquer la structure du Provider
// pour un cas qui ne devrait de toute façon jamais tourner côté client
// dans un navigateur normal.
const NEANT = {
  persistClient: async () => {},
  restoreClient: async () => undefined,
  removeClient: async () => {},
};
