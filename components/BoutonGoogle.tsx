"use client";

// Bouton "Continuer avec Google", partagé entre les pages connexion et
// inscription. Supabase gère tout : redirige vers Google, puis ramène
// l'utilisateur sur `retour` (chemin interne, déjà validé par l'appelant)
// avec une session active. Pas de route de callback à écrire côté
// Classinus, supabase-js détecte la session dans l'URL au retour.
//
// Dans l'appli installée, le retour passe par un lien qui rouvre l'appli
// (voir lib/connexionGoogleNative.ts), sinon l'utilisateur finissait sur le
// site au lieu de revenir dans l'appli.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { connexionGoogleNative, estAppliNative } from "@/lib/connexionGoogleNative";

export function BoutonGoogle({ retour }: { retour: string }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function continuerAvecGoogle() {
    setEnCours(true);
    setErreur("");

    if (await estAppliNative()) {
      const resultat = await connexionGoogleNative();
      if (resultat.ok) {
        router.push(retour);
        return;
      }
      setEnCours(false);
      setErreur(resultat.erreur);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${retour}`,
      },
    });
    // En cas d'erreur, Supabase ne redirige pas : on redonne la main au
    // bouton. En cas de succes, la page quitte de toute facon (redirection
    // vers Google), donc pas besoin de remettre enCours a false ici.
    if (error) setEnCours(false);
  }

  return (
    <div>
    <button
      type="button"
      onClick={continuerAvecGoogle}
      disabled={enCours}
      className="flex w-full items-center justify-center gap-2.5 rounded-cgpt-bouton border border-dj-bordure bg-dj-surface-haute py-3 text-sm font-semibold text-dj-texte transition-colors duration-200 hover:bg-dj-surface hover:border-dj-bordure-forte disabled:pointer-events-none disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.71-1.57 2.68-3.88 2.68-6.64z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z"/>
        <path fill="#FBBC05" d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.95H.96C.35 6.17 0 7.55 0 9s.35 2.83.96 4.05z"/>
        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"/>
      </svg>
      {enCours ? "Redirection…" : "Continuer avec Google"}
    </button>
    {erreur && (
      <p role="alert" className="mt-2 animate-dj-fade-in-rapide text-center text-xs text-dj-texte-muet">
        {erreur}
      </p>
    )}
    </div>
  );
}
