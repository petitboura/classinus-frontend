"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ecouterNotifications } from "@/lib/canalTempsReel";
import { ecouterDonneesModifiees } from "@/lib/evenementsDonnees";
import { clesRequetes } from "@/lib/clesRequetes";
import type { NotificationClovis } from "@/lib/api";

// Créé le 17/09/2026, chantier persistance/cache (demande Bourama) :
// avant ce composant, le canal WebSocket temps réel (lib/canalTempsReel.ts)
// ne servait qu'à alimenter la cloche de notifications (BoutonNotifications.tsx)
// -- une notification "document_recu_code" arrivait bien en direct, mais
// rien ne prévenait la Bibliothèque que sa liste de fichiers était
// périmée : il fallait changer de section ou recharger la page pour
// forcer un nouveau fetch.
//
// Ce composant ne rend rien à l'écran : il se contente d'écouter le même
// canal que la cloche et d'invalider la clé de cache React Query
// concernée dès qu'un événement pertinent arrive, où que l'utilisateur
// se trouve dans l'app. React Query se charge ensuite seul de
// reguêter en arrière-plan et de mettre à jour tout composant qui
// observe cette clé (Bibliothèque ouverte ou non).
//
// Table de correspondance notification -> clé(s) à invalider : à
// étendre au fur et à mesure que d'autres sections migrent vers React
// Query (ex: comportements, rappels...), voir clesRequetes.ts.
function invaliderPourNotification(
  queryClient: ReturnType<typeof useQueryClient>,
  notification: NotificationClovis
) {
  if (notification.type === "document_recu_code") {
    queryClient.invalidateQueries({ queryKey: clesRequetes.bibliothequeFichiers });
    queryClient.invalidateQueries({ queryKey: clesRequetes.bibliothequeDossiers });
  }
}

export function SyncTempsReelCache({ connecte }: { connecte: boolean }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!connecte) return;
    return ecouterNotifications((notification) => invaliderPourNotification(queryClient, notification));
  }, [connecte, queryClient]);

  // 17/09/2026 (chantier persistance/cache) : le bus lib/evenementsDonnees.ts
  // existait déjà pour rafraîchir "Mes comportements" quand l'IA modifie un
  // comportement depuis le chat, mais seulement si cette section était
  // déjà montée (voir sa propre note). Monté ici en permanence (AppShell),
  // ça invalide le cache même si l'utilisateur n'est pas sur la section --
  // en y revenant, la donnée est déjà à jour, sans nouveau fetch.
  // AGENT_ID "clovis" en dur : c'est la seule valeur utilisée partout dans
  // l'app pour "Mes comportements" (voir MesComportements.tsx, MesCodes.tsx).
  useEffect(() => {
    return ecouterDonneesModifiees("comportements", () => {
      queryClient.invalidateQueries({ queryKey: clesRequetes.comportements("clovis") });
    });
  }, [queryClient]);

  return null;
}
