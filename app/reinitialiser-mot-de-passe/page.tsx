"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { messageErreurAuthentification } from "@/lib/erreurs";
import { ROUTES_APP } from "@/lib/routesApp";
import {
  LONGUEUR_MINI_MOT_DE_PASSE,
  ROUTE_MOT_DE_PASSE_OUBLIE,
  lienPorteUneErreur,
  traduireErreurAuth,
} from "@/lib/reinitialisationMotDePasse";
import { EcranAutonome } from "@/components/EcranAutonome";
import { Logo } from "@/components/Logo";
import { Skeleton } from "@/components/Skeleton";
import { Bouton } from "@/components/Bouton";
import { ChampMotDePasse } from "@/components/ChampMotDePasse";

// Deuxième étape de la réinitialisation : l'utilisateur arrive ici depuis le
// lien de l'email. Supabase a déjà ouvert une session de récupération à partir
// de ce lien (le client la lit dans l'adresse au chargement), il ne reste qu'à
// enregistrer le nouveau mot de passe. Voir lib/reinitialisationMotDePasse.ts.
//
// Délai avant le retour automatique au chat, une fois le mot de passe changé.
const DELAI_RETOUR_CHAT_MS = 1800;

type Etat = "verification" | "erreur_verification" | "pret" | "lien_invalide" | "termine";

export default function PageReinitialisationMotDePasse() {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>("verification");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tentativeVerification, setTentativeVerification] = useState(0);

  // getSession() attend que le client ait fini de lire le lien : si une session
  // existe à ce moment, le lien était valide. Un rejet réseau doit donner une
  // action de récupération, jamais laisser le squelette tourner indéfiniment.
  useEffect(() => {
    let annule = false;
    async function verifierLien() {
      try {
        if (lienPorteUneErreur()) {
          if (!annule) setEtat("lien_invalide");
          return;
        }
        const {
          data: { session },
          error: erreurSession,
        } = await supabase.auth.getSession();
        if (erreurSession) throw erreurSession;
        if (annule) return;
        setEtat(session ? "pret" : "lien_invalide");
      } catch (e) {
        if (annule) return;
        console.warn("Échec inattendu de la vérification du lien de réinitialisation :", e);
        setErreur(messageErreurAuthentification(e, "reinitialisation"));
        setEtat("erreur_verification");
      }
    }
    void verifierLien();
    return () => {
      annule = true;
    };
  }, [tentativeVerification]);

  // Retour automatique au chat une fois le mot de passe changé.
  useEffect(() => {
    if (etat !== "termine") return;
    const minuteur = setTimeout(() => router.push(ROUTES_APP.chat), DELAI_RETOUR_CHAT_MS);
    return () => clearTimeout(minuteur);
  }, [etat, router]);

  async function gererSoumission(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    if (motDePasse.length < LONGUEUR_MINI_MOT_DE_PASSE) {
      setErreur(`Le mot de passe doit faire au moins ${LONGUEUR_MINI_MOT_DE_PASSE} caractères.`);
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnCours(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: motDePasse });
      if (error) {
        setErreur(traduireErreurAuth(error));
        return;
      }

      setMotDePasse("");
      setConfirmation("");
      setEtat("termine");
    } catch (e) {
      console.warn("Échec inattendu de la mise à jour du mot de passe :", e);
      setErreur(messageErreurAuthentification(e, "reinitialisation"));
    } finally {
      setEnCours(false);
    }
  }

  if (etat === "verification") {
    return (
      <EcranAutonome className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm" aria-hidden>
          <div className="mb-8 flex items-center justify-center gap-2.5">
            <Logo taille={32} sansFond />
            <span className="font-display text-lg font-bold tracking-tight text-dj-texte">
              <span className="text-dj-accent-1-texte">Classinus</span>
            </span>
          </div>

          <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
            <Skeleton className="h-6 w-56 rounded-lg" />

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <Skeleton className="h-3.5 w-36 rounded" style={{ animationDelay: "80ms" }} />
                <Skeleton className="mt-1.5 h-10 rounded-lg" style={{ animationDelay: "120ms" }} />
              </div>
              <div>
                <Skeleton className="h-3.5 w-40 rounded" style={{ animationDelay: "160ms" }} />
                <Skeleton className="mt-1.5 h-10 rounded-lg" style={{ animationDelay: "200ms" }} />
              </div>
              <Skeleton className="h-11 w-full rounded-cgpt-bouton" style={{ animationDelay: "240ms" }} />
            </div>
          </div>
        </div>
      </EcranAutonome>
    );
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
          {etat === "erreur_verification" && (
            <div className="animate-dj-fade-in-rapide">
              <h1 className="font-display text-xl font-bold text-dj-texte">Impossible de vérifier le lien</h1>
              <p role="alert" className="mt-3 text-sm text-dj-texte-muet">
                {erreur ?? "Vérifie ta connexion puis réessaie."}
              </p>
              <Bouton
                type="button"
                onClick={() => {
                  setErreur(null);
                  setEtat("verification");
                  setTentativeVerification((v) => v + 1);
                }}
                className="mt-4 w-full"
              >
                Réessayer
              </Bouton>
              <p className="mt-4 text-center text-sm text-dj-texte-muet">
                <Link href={ROUTE_MOT_DE_PASSE_OUBLIE} className="hover:text-dj-texte hover:underline">
                  Demander un nouveau lien
                </Link>
              </p>
            </div>
          )}

          {etat === "lien_invalide" && (
            <div className="animate-dj-fade-in-rapide">
              <h1 className="font-display text-xl font-bold text-dj-texte">Ce lien n&apos;est plus valide</h1>
              <p className="mt-3 text-sm text-dj-texte-muet">
                Il a peut-être expiré ou déjà été utilisé. Demande un nouveau lien pour choisir ton mot de passe.
              </p>
              <Bouton
                type="button"
                onClick={() => router.push(ROUTE_MOT_DE_PASSE_OUBLIE)}
                className="mt-4 w-full"
              >
                Recevoir un nouveau lien
              </Bouton>
            </div>
          )}

          {etat === "pret" && (
            <div className="animate-dj-fade-in-rapide">
              <h1 className="font-display text-xl font-bold text-dj-texte">Nouveau mot de passe</h1>

              <form onSubmit={gererSoumission} className="mt-4 space-y-4">
                <ChampMotDePasse
                  id="nouveau-mot-de-passe"
                  label="Nouveau mot de passe"
                  value={motDePasse}
                  onChange={setMotDePasse}
                  autoComplete="new-password"
                />
                <ChampMotDePasse
                  id="confirmation-mot-de-passe"
                  label="Confirme le mot de passe"
                  value={confirmation}
                  onChange={setConfirmation}
                  autoComplete="new-password"
                />

                {erreur && <p className="text-sm text-[var(--dj-erreur)]">{erreur}</p>}

                <Bouton type="submit" disabled={enCours} className="w-full">
                  {enCours ? "Enregistrement…" : "Enregistrer le mot de passe"}
                </Bouton>
              </form>
            </div>
          )}

          {etat === "termine" && (
            <div className="animate-dj-fade-in-rapide">
              <h1 className="font-display text-xl font-bold text-dj-texte">Mot de passe mis à jour</h1>
              <p className="mt-3 text-sm text-dj-texte-muet">
                Tu es connecté. Tu vas être redirigé vers Classinus.
              </p>
              <Bouton type="button" onClick={() => router.push(ROUTES_APP.chat)} className="mt-4 w-full">
                Aller sur Classinus
              </Bouton>
            </div>
          )}
        </div>

        {etat !== "termine" && (
          <p className="mt-5 text-center text-sm text-dj-texte-muet">
            <Link href="/connexion" className="text-dj-texte-muet hover:text-dj-texte hover:underline">
              Retour à la connexion
            </Link>
          </p>
        )}
      </div>
    </EcranAutonome>
  );
}
