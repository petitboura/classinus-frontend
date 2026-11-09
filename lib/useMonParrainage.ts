"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clesRequetes } from "@/lib/clesRequetes";
import { lireMonParrainage, type ResumeParrainage } from "@/lib/parrainageApi";
import { supabase } from "@/lib/supabase";

const FRAICHEUR_MS = 15 * 1000;

/**
 * Le parrainage du compte connecté : son code, ses crédits d'images restants et ses filleuls.
 * Partagé entre tous les écrans qui en ont besoin (une seule requête, un seul cache). Rien n'est demandé
 * tant que la personne n'est pas connectée. Après une génération d'image, rafraichir() relit le solde.
 */
export function useMonParrainage(): {
  resume: ResumeParrainage | null;
  /** Vrai tant que la première lecture n'est pas arrivée. */
  charge: boolean;
  /** Vrai si la lecture a échoué et qu'aucune valeur n'est connue. */
  enErreur: boolean;
  connecte: boolean;
  rafraichir: () => void;
} {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!annule) setUserId(data.session?.user.id ?? null);
      })
      .catch(() => {});
    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      annule = true;
      abonnement.subscription.unsubscribe();
    };
  }, []);

  const requete = useQuery({
    queryKey: clesRequetes.monParrainage(userId ?? ""),
    queryFn: lireMonParrainage,
    enabled: !!userId,
    staleTime: FRAICHEUR_MS,
    retry: false,
  });

  const rafraichir = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: clesRequetes.parrainageTous });
  }, [queryClient]);

  return {
    resume: requete.data ?? null,
    charge: !!userId && requete.isPending,
    enErreur: requete.isError && !requete.data,
    connecte: !!userId,
    rafraichir,
  };
}
