"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Unplug } from "lucide-react";
import { APPLIS_DISPONIBLES } from "@/lib/outils";
import { statutConnexion, demarrerConnexion, deconnecterApplication } from "@/lib/api";
import { JETONS, descriptionConnexion } from "@/lib/connexionsApplis";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { memoriserRetourConnexion, oublierRetourConnexion } from "@/lib/retourApresConnexion";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { McpPersonnalises } from "@/components/connexions/McpPersonnalises";
import { CarteConnexion, type EtatConnexion } from "@/components/connexions/CarteConnexion";
import { PanneauConnexion } from "@/components/connexions/PanneauConnexion";

type Ligne = { etat: EtatConnexion; message?: string };

// La liste des applications affichées est centralisée dans lib/outils.ts.
// Google Drive, Microsoft, Netlify et Cloudflare y restent masqués (décisions de Bourama) ; Vercel reste visible pour les tests.
// Les services Google Workspace en préversion y sont masqués tant que Google n'a pas donné son accord.
const APPLIS_AFFICHEES = APPLIS_DISPONIBLES.filter((app) => app.visibleDansEspaceConnexions);

export function EspaceConnexions() {
  const [lignes, setLignes] = useState<Record<string, Ligne>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);
  const [panneau, setPanneau] = useState<string | null>(null);

  const recharger = useCallback(async () => {
    oublierRetourConnexion();
    setErreur(null);
    setLignes(Object.fromEntries(APPLIS_AFFICHEES.map((app) => [app.nom, { etat: "chargement" as const }])));
    const resultats = await Promise.all(APPLIS_AFFICHEES.map(async (app) => {
      try {
        const statut = await statutConnexion(app.nom);
        const etat: EtatConnexion = statut.a_reconnecter ? "reconnecter" : statut.connecte ? "connecte" : "deconnecte";
        return [app.nom, { etat } as Ligne] as const;
      } catch (e) {
        if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
        return [app.nom, { etat: "erreur", message: messageErreur(e) } as Ligne] as const;
      }
    }));
    setLignes(Object.fromEntries(resultats));
  }, []);

  useEffect(() => { void recharger(); }, [recharger]);

  // Les trois actions lèvent leur erreur : le panneau l'affiche, la carte la remonte dans le bandeau.
  const enregistrerJeton = async (service: string, valeur: string) => {
    const jeton = JETONS[service];
    if (!jeton) return;
    await jeton.enregistrer(valeur);
    setLignes((avant) => ({ ...avant, [service]: { etat: "connecte" } }));
  };

  const lancerConnexion = async (service: string) => {
    const { url } = await demarrerConnexion(service);
    memoriserRetourConnexion({ href: ROUTES_PERSONNALISER.connexions, libelle: "à tes applications connectées" });
    window.location.assign(url);
  };

  const deconnecter = async (service: string) => {
    await deconnecterApplication(service);
    setLignes((avant) => ({ ...avant, [service]: { etat: "deconnecte" } }));
  };

  const depuisCarte = async (service: string, action: () => Promise<void>) => {
    setErreur(null);
    setEnCours(service);
    try {
      await action();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(null);
    }
  };

  if (sansCompte) return <CTACompteRequis texte="Connecte-toi ou crée un compte pour gérer tes applications connectées." />;

  const appPanneau = APPLIS_AFFICHEES.find((app) => app.nom === panneau);
  const lignePanneau = appPanneau ? lignes[appPanneau.nom] ?? { etat: "chargement" as const } : null;

  return (
    <section className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm leading-6 text-dj-texte-muet">
        Relie les services que tu utilises à Classinus. Chaque connexion est personnelle : les autorisations sont accordées par ton fournisseur et ne doivent pas être partagées avec d’autres comptes.
      </p>
      {erreur && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]"><CircleAlert size={17} className="mt-0.5 shrink-0" />{erreur}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {APPLIS_AFFICHEES.map((app) => {
          const ligne = lignes[app.nom] ?? { etat: "chargement" as const };
          const connecte = ligne.etat === "connecte";
          const occupee = enCours === app.nom;
          return (
            <CarteConnexion
              key={app.nom}
              app={app}
              description={descriptionConnexion(app.nom)}
              etat={ligne.etat}
              onVoirPlus={() => setPanneau(app.nom)}
              actions={connecte ? (
                <button type="button" onClick={() => void depuisCarte(app.nom, () => deconnecter(app.nom))} disabled={!!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50">
                  <Unplug size={14} />{occupee ? "Déconnexion…" : "Déconnecter"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => app.modeConnexion === "jeton" ? setPanneau(app.nom) : ligne.etat === "erreur" ? void recharger() : void depuisCarte(app.nom, () => lancerConnexion(app.nom))}
                  disabled={!!enCours || ligne.etat === "chargement"}
                  className="rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
                >
                  {occupee ? "Connexion…" : ligne.etat === "reconnecter" ? "Reconnecter" : ligne.etat === "erreur" && app.modeConnexion !== "jeton" ? "Réessayer le statut" : "Connecter"}
                </button>
              )}
            />
          );
        })}
      </div>
      {appPanneau && lignePanneau && (
        <PanneauConnexion
          app={appPanneau}
          description={descriptionConnexion(appPanneau.nom)}
          etat={lignePanneau.etat}
          messageStatut={lignePanneau.message}
          onFermer={() => setPanneau(null)}
          onJeton={appPanneau.modeConnexion === "jeton" ? (valeur) => enregistrerJeton(appPanneau.nom, valeur) : undefined}
          onConnecter={() => lancerConnexion(appPanneau.nom)}
          onDeconnecter={() => deconnecter(appPanneau.nom)}
        />
      )}
      <McpPersonnalises />
      <p className="text-xs leading-5 text-dj-texte-muet">Déconnecter Classinus ne révoque pas toujours l’autorisation chez le fournisseur. Pour retirer totalement l’accès, consulte aussi les paramètres de sécurité du service concerné.</p>
    </section>
  );
}
