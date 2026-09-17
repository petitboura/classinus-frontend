"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ecouterNotifications } from "@/lib/canalTempsReel";
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

  return null;
}
