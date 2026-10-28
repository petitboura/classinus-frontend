"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, LogIn, RotateCw } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import type { CodeErreurTour } from "@/lib/erreurTour";

const TEXTES = {
  fr: {
    message: {
      delai: "La réponse a pris trop de temps.",
      forte_demande: "Beaucoup de monde en ce moment, la réponse n'a pas pu aboutir.",
      serveur: "Un souci technique a interrompu la réponse.",
      reseau: "La connexion a été perdue.",
      session: "Ta session a expiré.",
      connexion: "Connecte-toi ou crée un compte pour continuer.",
      requete: "Cette demande n'a pas pu être traitée. Modifie ton message et réessaie.",
    },
    continuer: "Continuer",
    reessayer: "Réessayer",
    seConnecter: "Se connecter",
  },
  en: {
    message: {
      delai: "The reply took too long.",
      forte_demande: "Lots of people are using Classinus right now, the reply could not finish.",
      serveur: "A technical problem interrupted the reply.",
      reseau: "The connection was lost.",
      session: "Your session has expired.",
      connexion: "Sign in or create an account to continue.",
      requete: "This request could not be processed. Edit your message and try again.",
    },
    continuer: "Continue",
    reessayer: "Try again",
    seConnecter: "Sign in",
  },
} as const;

const CLASSE_BOUTON =
  "flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface disabled:opacity-50";

// Bandeau sous une réponse coupée par une erreur. Le message dit ce qui s'est passé et les
// boutons dépendent de la situation : « Continuer » seulement quand il reste quelque chose à
// poursuivre (texte déjà écrit ou résultats d'outils gardés), « Réessayer » qui repart de la
// question, « Se connecter » quand c'est la session qui est en cause, aucun bouton quand la
// demande elle-même est refusée (le même envoi échouerait de nouveau).
export function BandeauErreurReponse({
  code,
  peutContinuer,
  enAttente,
  onContinuer,
  onReessayer,
}: {
  code: CodeErreurTour;
  peutContinuer: boolean;
  enAttente: boolean;
  onContinuer: () => void;
  onReessayer: () => void;
}) {
  const textes = TEXTES[useLocale()];
  const router = useRouter();
  const [enLigne, setEnLigne] = useState(true);

  useEffect(() => {
    setEnLigne(navigator.onLine);
    const maj = () => setEnLigne(navigator.onLine);
    window.addEventListener("online", maj);
    window.addEventListener("offline", maj);
    return () => {
      window.removeEventListener("online", maj);
      window.removeEventListener("offline", maj);
    };
  }, []);

  const doitSeConnecter = code === "session" || code === "connexion";
  const peutRelancer = !doitSeConnecter && code !== "requete";
  const bloque = enAttente || !enLigne;

  return (
    <div className="my-1.5 flex w-fit max-w-full animate-dj-fade-in flex-wrap items-center gap-2 rounded-lg border border-dj-accent-2/40 bg-dj-accent-2/10 px-3 py-2 text-[13px] text-dj-texte">
      <span className="flex items-center gap-1.5">
        <AlertCircle size={16} className="shrink-0 text-dj-accent-2" />
        {textes.message[code]}
      </span>
      {doitSeConnecter && (
        <button onClick={() => router.push("/connexion")} className={CLASSE_BOUTON}>
          <LogIn size={13} />
          {textes.seConnecter}
        </button>
      )}
      {peutRelancer && peutContinuer && (
        <button onClick={onContinuer} disabled={bloque} className={CLASSE_BOUTON}>
          <ArrowRight size={13} />
          {textes.continuer}
        </button>
      )}
      {peutRelancer && (
        <button onClick={onReessayer} disabled={bloque} className={CLASSE_BOUTON}>
          <RotateCw size={13} />
          {textes.reessayer}
        </button>
      )}
    </div>
  );
}
