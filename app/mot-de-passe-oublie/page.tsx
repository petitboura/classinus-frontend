"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  DELAI_RENVOI_LIEN_SECONDES,
  demanderLienReinitialisation,
} from "@/lib/reinitialisationMotDePasse";
import { messageErreurAuthentification } from "@/lib/erreurs";
import { EcranAutonome } from "@/components/EcranAutonome";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/Skeleton";
import { Bouton } from "@/components/Bouton";

// Première étape de la réinitialisation : l'utilisateur donne son email et
// reçoit un lien. Voir lib/reinitialisationMotDePasse.ts pour le parcours
// complet. Réservé aux comptes créés avec un email : un compte créé avec un
// numéro de téléphone n'a pas d'email où envoyer le lien.

// useSearchParams() oblige à isoler le formulaire dans un composant enveloppé
// de Suspense, sinon `next build` échoue (même règle que app/connexion).
export default function PageMotDePasseOublie() {
  return (
    <Suspense
      fallback={
        <EcranAutonome className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-sm" aria-hidden>
            <div className="mb-8 flex items-center justify-center gap-2.5">
              <Logo taille={32} sansFond />
              <span className="font-display text-lg font-bold tracking-tight text-dj-texte">
                <span className="text-dj-accent-1-texte">Classinus</span>
              </span>
            </div>

            <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
              <Skeleton className="h-6 w-52 rounded-lg" />
              <Skeleton className="mt-3 h-4 w-full rounded" style={{ animationDelay: "80ms" }} />
              <Skeleton className="mt-1.5 h-4 w-3/4 rounded" style={{ animationDelay: "120ms" }} />

              <div className="mt-4 flex flex-col gap-4">
                <div>
                  <Skeleton className="h-3.5 w-16 rounded" style={{ animationDelay: "160ms" }} />
                  <Skeleton className="mt-1.5 h-10 rounded-lg" style={{ animationDelay: "200ms" }} />
                </div>
                <Skeleton className="h-11 w-full rounded-cgpt-bouton" style={{ animationDelay: "240ms" }} />
              </div>
            </div>

            <Skeleton className="mx-auto mt-5 h-3.5 w-40 rounded" style={{ animationDelay: "280ms" }} />
          </div>
        </EcranAutonome>
      }
    >
      <FormulaireMotDePasseOublie />
    </Suspense>
  );
}

function FormulaireMotDePasseOublie() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);
  const [attente, setAttente] = useState(0);

  // Compte à rebours avant de pouvoir renvoyer le lien.
  useEffect(() => {
    if (attente <= 0) return;
    const minuteur = setTimeout(() => setAttente((a) => a - 1), 1000);
    return () => clearTimeout(minuteur);
  }, [attente]);

  async function envoyerLien() {
    setErreur(null);
    setEnCours(true);

    try {
      const { erreur: erreurEnvoi } = await demanderLienReinitialisation(email);
      if (erreurEnvoi) {
        setErreur(erreurEnvoi);
        return;
      }

      setEnvoye(true);
      setAttente(DELAI_RENVOI_LIEN_SECONDES);
    } catch (e) {
      console.warn("Échec inattendu du formulaire de mot de passe oublié :", e);
      setErreur(messageErreurAuthentification(e, "reinitialisation"));
    } finally {
      setEnCours(false);
    }
  }

  function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    void envoyerLien();
  }

  return (
    <EcranAutonome className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-dj-fade-up">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Logo taille={32} sansFond />
          <span className="font-display text-lg font-bold tracking-tight text-dj-texte">
            <span className="text-dj-accent-1-texte">Classinus</span>
          </span>
        </div>

        <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          {envoye ? (
            <div className="animate-dj-fade-in-rapide">
              <h1 className="font-display text-xl font-bold text-dj-texte">Vérifie ta boîte mail</h1>
              <p className="mt-3 text-sm text-dj-texte-muet">
                Si un compte existe avec l&apos;adresse{" "}
                <span className="break-all font-medium text-dj-texte">{email.trim()}</span>, tu vas recevoir un
                lien pour choisir un nouveau mot de passe. Pense à regarder dans tes spams.
              </p>

              {erreur && <p className="mt-3 text-sm text-[var(--dj-erreur)]">{erreur}</p>}

              <Bouton
                type="button"
                variante="secondaire"
                disabled={enCours || attente > 0}
                onClick={() => void envoyerLien()}
                className="mt-4 w-full"
              >
                {enCours
                  ? "Envoi…"
                  : attente > 0
                    ? `Renvoyer le lien (${attente} s)`
                    : "Renvoyer le lien"}
              </Bouton>
            </div>
          ) : (
            <div className="animate-dj-fade-in-rapide">
              <h1 className="font-display text-xl font-bold text-dj-texte">Mot de passe oublié</h1>
              <p className="mt-3 text-sm text-dj-texte-muet">
                Donne l&apos;email de ton compte. Tu recevras un lien pour choisir un nouveau mot de passe.
              </p>

              <form onSubmit={gererSoumission} className="mt-4 space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-dj-texte-muet">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-dj-bordure bg-dj-surface-haute px-3 py-2 text-dj-texte outline-none focus:border-dj-bordure-forte"
                  />
                </div>

                {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

                <Bouton type="submit" disabled={enCours} className="w-full">
                  {enCours ? "Envoi…" : "Recevoir le lien"}
                </Bouton>
              </form>
            </div>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-dj-texte-muet">
          <Link href="/connexion" className="text-dj-texte-muet hover:text-dj-texte hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </EcranAutonome>
  );
}
