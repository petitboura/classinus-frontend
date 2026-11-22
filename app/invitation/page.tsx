"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";
import { Bouton } from "@/components/Bouton";
import { EcranAutonome } from "@/components/EcranAutonome";
import { Skeleton } from "@/components/Skeleton";
import { MESSAGES } from "@/lib/erreurs";
import { useLocale } from "@/lib/i18n/useLocale";
import { codeParrainageValide, memoriserCodeParrainage, PARAMETRE_CODE_PARRAINAGE } from "@/lib/parrainage";
import { supabase } from "@/lib/supabase";

// Page d'arrivée d'un lien de parrainage (/invitation?code=ABCD2345).
// Elle garde le code sur l'appareil, puis amène la personne vers l'inscription. Le code est enregistré côté
// serveur plus tard, une fois la personne connectée (components/EnregistrementParrainage.tsx), et le parrain
// n'est récompensé qu'après la confirmation de l'email du nouvel inscrit.

type Session = "inconnue" | "connecte" | "visiteur";

function ContenuInvitation() {
  const router = useRouter();
  const locale = useLocale();
  const params = useSearchParams();
  const brut = params.get(PARAMETRE_CODE_PARRAINAGE);
  const codeValide = codeParrainageValide(brut);
  const [session, setSession] = useState<Session>("inconnue");

  useEffect(() => {
    if (codeValide) memoriserCodeParrainage(brut);
  }, [codeValide, brut]);

  useEffect(() => {
    let annule = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!annule) setSession(data.session ? "connecte" : "visiteur");
      })
      .catch(() => {
        if (!annule) setSession("visiteur");
      });
    return () => {
      annule = true;
    };
  }, []);

  return (
    <EcranAutonome>
      <div className="w-full max-w-sm">
        <div className="animate-dj-fade-in-rapide rounded-2xl border border-dj-bordure bg-dj-surface p-6 text-center shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          {session === "inconnue" ? (
            // Même forme que le contenu final, pour qu'il n'y ait aucun saut à l'arrivée.
            <div className="flex flex-col items-center gap-3" aria-busy="true">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-11 w-full rounded-cgpt-bouton" />
            </div>
          ) : (
            <div className="flex animate-dj-fade-in-rapide flex-col items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-dj-surface-haute text-dj-texte">
                <Gift className="h-6 w-6" aria-hidden />
              </span>
              {session === "connecte" ? (
                <>
                  <h1 className="text-lg font-semibold text-dj-texte">Tu es déjà connecté</h1>
                  <p className="text-sm leading-relaxed text-dj-texte-muet">
                    Ce lien invite de nouvelles personnes sur Classinus. Retourne à l&apos;accueil pour continuer.
                  </p>
                  <Bouton onClick={() => router.push("/")} className="w-full">
                    Aller à l&apos;accueil
                  </Bouton>
                </>
              ) : (
                <>
                  <h1 className="text-lg font-semibold text-dj-texte">{codeValide ? "Un ami t'invite sur Classinus" : "Bienvenue sur Classinus"}</h1>
                  <p className="text-sm leading-relaxed text-dj-texte-muet">
                    Crée ton compte gratuitement et génère tes propres images. Pense à confirmer ton email après l&apos;inscription : c&apos;est ce qui permet à ton ami d&apos;être récompensé.
                  </p>
                  {!codeValide && brut !== null && (
                    <p className="text-xs text-[var(--dj-erreur)]">{MESSAGES[locale].PARRAINAGE_CODE_INVALIDE}</p>
                  )}
                  <Bouton onClick={() => router.push("/inscription")} className="w-full">
                    Créer mon compte
                  </Bouton>
                  <button
                    type="button"
                    onClick={() => router.push("/connexion")}
                    className="text-sm text-dj-texte-muet transition-colors hover:text-dj-texte hover:underline"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </EcranAutonome>
  );
}

export default function PageInvitation() {
  // useSearchParams demande une frontière Suspense pour l'export statique de l'appli mobile.
  return (
    <Suspense fallback={null}>
      <ContenuInvitation />
    </Suspense>
  );
}
