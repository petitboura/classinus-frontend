"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { APPLIS_DISPONIBLES } from "@/lib/outils";
import { statutConnexion, demarrerConnexion } from "@/lib/api";
import { JETONS, descriptionConnexion } from "@/lib/connexionsApplis";
import { messageErreur } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import { memoriserRetourConnexion } from "@/lib/retourApresConnexion";
import { CarteConnexion, type EtatConnexion } from "@/components/connexions/CarteConnexion";
import { PanneauConnexion } from "@/components/connexions/PanneauConnexion";

// Carte du bloc ```connecteur``` (26/10/2026, demande de Bourama) : l'IA propose un service que
// l'utilisateur n'a pas encore connecté. Même apparence que dans l'écran Connexions
// (components/connexions/EspaceConnexions.tsx), mêmes textes (lib/connexionsApplis.ts), même
// connexion. Une fois connecté, un bouton redonne la main à l'IA pour reprendre la tâche.

// Lit le JSON du bloc. Pendant le streaming il est incomplet : on n'affiche rien tant qu'il ne
// désigne pas un service connu ET visible dans l'écran Connexions (jamais une carte vide).
function lireService(code: string) {
  try {
    const brut = JSON.parse(code) as { service?: unknown };
    if (typeof brut.service !== "string") return null;
    return APPLIS_DISPONIBLES.find((a) => a.nom === brut.service && a.visibleDansEspaceConnexions) ?? null;
  } catch {
    return null;
  }
}

function messagePourReprendre(label: string): string {
  return obtenirLocale() === "en"
    ? `I connected ${label}. Use it for my request.`
    : `J'ai connecté ${label}. Utilise-le pour ma demande.`;
}

export function CarteConnecteur({ code, onUtiliser }: { code: string; onUtiliser?: (texte: string) => void }) {
  const app = useMemo(() => lireService(code), [code]);
  const [etat, setEtat] = useState<EtatConnexion>("chargement");
  const [message, setMessage] = useState<string | null>(null);
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [dejaUtilise, setDejaUtilise] = useState(false);
  const nom = app?.nom;

  const verifier = useCallback(async () => {
    if (!nom) return;
    try {
      const statut = await statutConnexion(nom);
      setEtat(statut.a_reconnecter ? "reconnecter" : statut.connecte ? "connecte" : "deconnecte");
      setMessage(null);
    } catch (e) {
      setEtat("erreur");
      setMessage(messageErreur(e));
    }
  }, [nom]);

  useEffect(() => { void verifier(); }, [verifier]);

  // La connexion peut se faire dans un autre onglet : on relit le statut au retour sur celui-ci.
  useEffect(() => {
    if (!nom) return;
    const auRetour = () => { if (document.visibilityState === "visible") void verifier(); };
    document.addEventListener("visibilitychange", auRetour);
    return () => document.removeEventListener("visibilitychange", auRetour);
  }, [nom, verifier]);

  if (!app) return null;

  const connecte = etat === "connecte";
  const modeJeton = app.modeConnexion === "jeton";
  const parametresJeton = JETONS[app.nom];

  // Les trois actions lèvent leur erreur : le panneau l'affiche à l'endroit où la personne agit.
  const enregistrerJeton = async (valeur: string) => {
    if (!parametresJeton) return;
    await parametresJeton.enregistrer(valeur);
    setEtat("connecte");
  };

  const lancerConnexion = async () => {
    const { url } = await demarrerConnexion(app.nom);
    // Retour dans cette même conversation après l'autorisation chez le fournisseur.
    memoriserRetourConnexion({ href: window.location.pathname + window.location.search, libelle: "à ta conversation" });
    window.location.assign(url);
  };

  const connecterDepuisCarte = async () => {
    setMessage(null);
    try {
      await lancerConnexion();
    } catch (e) {
      setMessage(messageErreur(e));
      setPanneauOuvert(true);
    }
  };

  const utiliser = () => {
    if (!onUtiliser || dejaUtilise) return;
    setDejaUtilise(true);
    onUtiliser(messagePourReprendre(app.label));
  };

  return (
    <>
      <CarteConnexion
        app={app}
        description={descriptionConnexion(app.nom)}
        etat={etat}
        onVoirPlus={() => setPanneauOuvert(true)}
        className="my-3 w-full max-w-md animate-dj-fade-up"
        actions={connecte ? (
          onUtiliser && (
            <button
              type="button"
              onClick={utiliser}
              disabled={dejaUtilise}
              className="inline-flex items-center gap-1.5 rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
            >
              <Sparkles size={14} />{dejaUtilise ? "Demande envoyée" : "Utiliser pour ça"}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => (etat === "erreur" ? void verifier() : modeJeton ? setPanneauOuvert(true) : void connecterDepuisCarte())}
            disabled={etat === "chargement"}
            className="rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
          >
            {etat === "reconnecter" ? "Reconnecter" : etat === "erreur" ? "Réessayer le statut" : "Connecter"}
          </button>
        )}
      />
      {panneauOuvert && (
        <PanneauConnexion
          app={app}
          description={descriptionConnexion(app.nom)}
          etat={etat}
          messageStatut={message ?? undefined}
          onFermer={() => setPanneauOuvert(false)}
          onJeton={modeJeton ? enregistrerJeton : undefined}
          onConnecter={lancerConnexion}
          onUtiliser={onUtiliser ? utiliser : undefined}
          dejaUtilise={dejaUtilise}
        />
      )}
    </>
  );
}
