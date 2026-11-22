"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { clesRequetes } from "@/lib/clesRequetes";
import { ErreurApi } from "@/lib/erreurs";
import { lireCodeParrainageMemorise, oublierCodeParrainage } from "@/lib/parrainage";
import { enregistrerParrainage } from "@/lib/parrainageApi";
import { supabase } from "@/lib/supabase";

/**
 * Enregistre le parrain d'un nouvel inscrit, sans rien afficher.
 *
 * La personne arrive par un lien d'invitation (app/invitation/page.tsx), qui garde le code sur l'appareil.
 * Dès qu'elle est connectée, on le donne au serveur. Le serveur répond par un statut :
 * - "valide" : l'email est confirmé et le parrain est récompensé. Le code est oublié.
 * - "refuse" ou "ignore" : le lien ne compte pas (compte trop ancien, lui même, email jetable, code inconnu).
 *   Le code est oublié : réessayer ne changerait rien.
 * - "en_attente" : l'email n'est pas encore confirmé. Le code est gardé, un nouvel essai a lieu à la prochaine
 *   connexion ou au prochain chargement de l'appli.
 * Une panne réseau ou serveur garde aussi le code, pour réessayer plus tard.
 */
export function EnregistrementParrainage() {
  const queryClient = useQueryClient();
  // Un seul essai à la fois, et un seul par compte et par chargement de page.
  const essaiPourRef = useRef<string | null>(null);

  useEffect(() => {
    let annule = false;

    async function essayer(userId: string) {
      if (essaiPourRef.current === userId) return;
      const code = lireCodeParrainageMemorise();
      if (!code) return;
      essaiPourRef.current = userId;
      try {
        const { statut } = await enregistrerParrainage(code);
        if (annule) return;
        if (statut !== "en_attente") oublierCodeParrainage();
        // Le solde de la personne ou de son parrain a pu changer.
        queryClient.invalidateQueries({ queryKey: clesRequetes.parrainageTous });
      } catch (e) {
        // Code refusé (400) : le réessayer ne changerait rien, on l'oublie.
        if (e instanceof ErreurApi && e.statusCode === 400) {
          oublierCodeParrainage();
          return;
        }
        // Réseau ou serveur indisponible : le code reste gardé, nouvel essai au prochain chargement.
        if (!annule) essaiPourRef.current = null;
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) void essayer(data.session.user.id);
      })
      .catch(() => {});

    const { data: abonnement } = supabase.auth.onAuthStateChange((evenement, session) => {
      if (evenement === "SIGNED_IN" && session) void essayer(session.user.id);
    });

    return () => {
      annule = true;
      abonnement.subscription.unsubscribe();
    };
  }, [queryClient]);

  return null;
}
