"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, X } from "lucide-react";
import { finaliserConnexion } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { EcranAutonome } from "@/components/EcranAutonome";
import { Logo } from "@/components/Logo";
import { Bouton } from "@/components/Bouton";
import { Skeleton } from "@/components/Skeleton";

/**
 * Page de retour après la connexion à une application (Notion, Google Drive).
 * Le fournisseur y renvoie la personne avec ?code=...&state=... dans
 * l'adresse : c'est la valeur de URL_RETOUR_APP côté serveur, à régler sur
 * l'adresse de cette page. Elle envoie code et state au serveur, qui termine
 * la connexion, puis ramène la personne dans le chat.
 *
 * Volontairement hors du groupe (app) : pas de barre de navigation ici, comme
 * l'écran de consentement OAuth voisin. Le serveur n'exige pas de session pour
 * finaliser, le state (à usage unique) fait office de preuve d'origine.
 */

const NOMS_SERVICES: Record<string, string> = {
  notion: "Notion",
  google_drive: "Google Drive",
  github: "GitHub",
};

// Durée d'affichage de la confirmation avant de ramener la personne au chat.
const DELAI_RETOUR_MS = 1400;

export default function PageRetourConnexion() {
  return (
    <Suspense fallback={<CadreRetour><EtatEnCours /></CadreRetour>}>
      <EcranRetour />
    </Suspense>
  );
}

function CadreRetour({ children }: { children: React.ReactNode }) {
  return (
    <EcranAutonome className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm animate-dj-fade-up">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <Logo taille={32} />
          <span className="font-display text-lg font-bold tracking-tight text-dj-texte">Classinus</span>
        </div>
        <div className="rounded-2xl border border-dj-bordure bg-dj-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.35)]">
          {children}
        </div>
      </div>
    </EcranAutonome>
  );
}

function EtatEnCours() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-6 w-3/4 rounded-lg" />
      <Skeleton className="mt-1 h-3.5 w-full rounded" style={{ animationDelay: "60ms" }} />
      <Skeleton className="mt-1 h-3.5 w-2/3 rounded" style={{ animationDelay: "120ms" }} />
    </div>
  );
}

type Resultat =
  | { etat: "en_cours" }
  | { etat: "succes"; service: string | null }
  | { etat: "echec"; message: string };

function EcranRetour() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get("code");
  const state = params.get("state");
  // Le fournisseur renvoie error=access_denied quand la personne refuse.
  const refus = params.get("error");

  const [resultat, setResultat] = useState<Resultat>({ etat: "en_cours" });
  // Le code n'est utilisable qu'une fois : en développement React monte les
  // effets deux fois, le second appel échouerait et écraserait le succès.
  const dejaLance = useRef(false);

  useEffect(() => {
    if (dejaLance.current) return;
    dejaLance.current = true;

    if (refus) {
      setResultat({ etat: "echec", message: "La connexion a été annulée. Tu peux réessayer quand tu veux." });
      return;
    }
    if (!code || !state) {
      setResultat({ etat: "echec", message: "Ce lien de retour est incomplet. Relance la connexion depuis le chat." });
      return;
    }

    finaliserConnexion(code, state)
      .then((r) => {
        if (r.succes) setResultat({ etat: "succes", service: r.service });
        else setResultat({ etat: "echec", message: r.message });
      })
      .catch((e) => setResultat({ etat: "echec", message: messageErreur(e) }));
  }, [code, state, refus]);

  useEffect(() => {
    if (resultat.etat !== "succes") return;
    const minuteur = setTimeout(() => router.replace("/"), DELAI_RETOUR_MS);
    return () => clearTimeout(minuteur);
  }, [resultat, router]);

  if (resultat.etat === "en_cours") {
    return <CadreRetour><EtatEnCours /></CadreRetour>;
  }

  if (resultat.etat === "succes") {
    const nom = (resultat.service && NOMS_SERVICES[resultat.service]) || "L'application";
    return (
      <CadreRetour>
        <div className="flex flex-col items-center text-center animate-dj-fade-in-rapide">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-dj-accent-1 text-[#1a0f06]">
            <Check size={26} strokeWidth={2.5} aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-dj-texte">{nom} est connecté</h1>
          <p className="mt-2 text-sm text-dj-texte-muet">On te ramène au chat.</p>
        </div>
      </CadreRetour>
    );
  }

  return (
    <CadreRetour>
      <div className="flex flex-col items-center text-center animate-dj-fade-in-rapide">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-dj-surface-haute text-dj-texte-muet">
          <X size={26} strokeWidth={2.5} aria-hidden />
        </span>
        <h1 className="mt-4 font-display text-xl font-bold text-dj-texte">Connexion impossible</h1>
        <p className="mt-2 text-sm text-dj-texte-muet">{resultat.message}</p>
        <Bouton className="mt-6 w-full" onClick={() => router.replace("/")}>
          Retourner au chat
        </Bouton>
      </div>
    </CadreRetour>
  );
}
