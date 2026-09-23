"use client";

// Boutons "Se connecter" et "Créer un compte" de l'accueil, affichés
// uniquement pour un visiteur sans compte (web, web mobile et appli).
// Ajoutés le 23/09/2026 : depuis le retrait de la redirection automatique
// vers l'inscription (22/09), rien ne menait plus aux pages de connexion.
// Rien n'est affiché tant que la session n'est pas confirmée, pour ne pas
// faire clignoter les boutons chez quelqu'un de déjà connecté.
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export function BoutonsCompteVisiteur() {
  const [visiteur, setVisiteur] = useState(false);

  useEffect(() => {
    let annule = false;
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (!annule) setVisiteur(!session);
      })
      .catch(() => {
        if (!annule) setVisiteur(true);
      });
    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
      if (!annule) setVisiteur(!session);
    });
    return () => {
      annule = true;
      abonnement.subscription.unsubscribe();
    };
  }, []);

  if (!visiteur) return null;

  return (
    <div className="flex animate-dj-fade-in-rapide flex-wrap items-center justify-center gap-3">
      <Link
        href="/connexion"
        className="rounded-cgpt-bouton border border-dj-bordure bg-dj-surface-haute px-[22px] py-3 text-sm font-semibold text-dj-texte transition-colors duration-200 ease-cgpt-doux hover:border-dj-bordure-forte hover:bg-dj-surface active:scale-[.98]"
      >
        Se connecter
      </Link>
      <Link
        href="/inscription"
        className="rounded-cgpt-bouton bg-dj-accent-1 px-[22px] py-3 text-sm font-semibold text-[#1a0f06] transition-colors duration-200 ease-cgpt-doux hover:bg-dj-accent-2 active:scale-[.98]"
      >
        Créer un compte
      </Link>
    </div>
  );
}
