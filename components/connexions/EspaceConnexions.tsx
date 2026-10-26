"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleAlert, LoaderCircle, PlugZap, Unplug } from "lucide-react";
import { APPLIS_DISPONIBLES } from "@/lib/outils";
import { statutConnexion, demarrerConnexion, deconnecterApplication } from "@/lib/api";
import { DESCRIPTIONS, JETONS } from "@/lib/connexionsApplis";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { memoriserRetourConnexion, oublierRetourConnexion } from "@/lib/retourApresConnexion";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { McpPersonnalises } from "@/components/connexions/McpPersonnalises";

type Etat = "chargement" | "connecte" | "deconnecte" | "reconnecter" | "erreur";
type Ligne = { etat: Etat; message?: string; action?: boolean };

// La liste des applications affichées est centralisée dans lib/outils.ts.
// Google Drive y reste masqué selon la décision du 22/10 ; Vercel reste visible pour les tests.
// Les services Google Workspace en préversion y sont masqués tant que Google n'a pas donné son accord.
const APPLIS_AFFICHEES = APPLIS_DISPONIBLES.filter((app) => app.visibleDansEspaceConnexions);



export function EspaceConnexions() {
  const [lignes, setLignes] = useState<Record<string, Ligne>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);
  const [jetons, setJetons] = useState<Record<string, string>>({});

  const recharger = useCallback(async () => {
    oublierRetourConnexion();
    setErreur(null);
    setLignes(Object.fromEntries(APPLIS_AFFICHEES.map((app) => [app.nom, { etat: "chargement" as const }])));
    const resultats = await Promise.all(APPLIS_AFFICHEES.map(async (app) => {
      try {
        const statut = await statutConnexion(app.nom);
        const etat: Etat = statut.a_reconnecter ? "reconnecter" : statut.connecte ? "connecte" : "deconnecte";
        return [app.nom, { etat } as Ligne] as const;
      } catch (e) {
        if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
        return [app.nom, { etat: "erreur", message: messageErreur(e) } as Ligne] as const;
      }
    }));
    setLignes(Object.fromEntries(resultats));
  }, []);

  useEffect(() => { void recharger(); }, [recharger]);

  const connecter = async (service: string) => {
    setErreur(null);
    setEnCours(service);
    const jeton = JETONS[service];
    if (jeton) {
      try {
        await jeton.enregistrer((jetons[service] ?? "").trim());
        setLignes((avant) => ({ ...avant, [service]: { etat: "connecte" } }));
        setJetons((avant) => ({ ...avant, [service]: "" }));
      } catch (e) {
        setErreur(messageErreur(e));
      } finally {
        setEnCours(null);
      }
      return;
    }
    try {
      const { url } = await demarrerConnexion(service);
      memoriserRetourConnexion({ href: ROUTES_PERSONNALISER.connexions, libelle: "à tes applications connectées" });
      window.location.assign(url);
    } catch (e) {
      setErreur(messageErreur(e));
      setEnCours(null);
    }
  };

  const deconnecter = async (service: string) => {
    setErreur(null);
    setEnCours(service);
    try {
      await deconnecterApplication(service);
      setLignes((avant) => ({ ...avant, [service]: { etat: "deconnecte" } }));
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(null);
    }
  };

  if (sansCompte) return <CTACompteRequis texte="Connecte-toi ou crée un compte pour gérer tes applications connectées." />;

  return (
    <section className="flex flex-col gap-4">
      <p className="max-w-3xl text-sm leading-6 text-dj-texte-muet">
        Relie les services que tu utilises à Classinus. Chaque connexion est personnelle : les autorisations sont accordées par ton fournisseur et ne doivent pas être partagées avec d’autres comptes.
      </p>
      {erreur && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]"><CircleAlert size={17} className="mt-0.5 shrink-0" />{erreur}</div>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {APPLIS_AFFICHEES.map((app) => {
          const ligne = lignes[app.nom] ?? { etat: "chargement" as const };
          const Icone = app.Icone;
          const occupée = enCours === app.nom;
          const connecte = ligne.etat === "connecte";
          return (
            <article key={app.nom} className="flex min-h-40 flex-col justify-between gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><Icone size={18} /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-dj-texte">{app.label}</h3>
                    {app.etatDisponibilite === "apercu" && (
                      <span className="rounded-full border border-dj-bordure px-2 py-0.5 text-[10px] text-dj-texte-muet">Préversion développeur</span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-dj-texte-muet">{DESCRIPTIONS[app.nom] ?? "Relie ce service à Classinus pour utiliser les fonctionnalités autorisées depuis ton compte."}</p>
                </div>
              </div>
              {app.modeConnexion === "jeton" && !connecte && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={"jeton-" + app.nom} className="text-xs font-semibold text-dj-texte">{JETONS[app.nom]?.champ}</label>
                  <input
                    id={"jeton-" + app.nom}
                    type="password"
                    autoComplete="off"
                    value={jetons[app.nom] ?? ""}
                    onChange={(event) => setJetons((avant) => ({ ...avant, [app.nom]: event.target.value }))}
                    placeholder={JETONS[app.nom]?.placeholder}
                    className="w-full rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                  />
                  <p className="text-xs leading-5 text-dj-texte-muet">
                    Crée-en une dans <a href={JETONS[app.nom]?.lien} target="_blank" rel="noreferrer" className="underline">{JETONS[app.nom]?.libelleLien}</a>. Elle sera stockée côté serveur pour ton compte Classinus.
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-xs text-dj-texte-muet">
                  {ligne.etat === "chargement" ? <LoaderCircle size={14} className="animate-spin" /> : connecte ? <Check size={14} className="text-emerald-500" /> : ligne.etat === "erreur" || ligne.etat === "reconnecter" ? <CircleAlert size={14} /> : <PlugZap size={14} />}
                  {ligne.etat === "chargement" ? "Vérification…" : connecte ? "Connecté" : ligne.etat === "reconnecter" ? "Reconnexion nécessaire" : ligne.etat === "erreur" ? "Statut indisponible" : "Non connecté"}
                </span>
                {connecte ? (
                  <button type="button" onClick={() => void deconnecter(app.nom)} disabled={!!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50">
                    <Unplug size={14} />{occupée ? "Déconnexion…" : "Déconnecter"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => app.modeConnexion === "jeton" ? void connecter(app.nom) : ligne.etat === "erreur" ? void recharger() : void connecter(app.nom)}
                    disabled={!!enCours || ligne.etat === "chargement" || connecte || (app.modeConnexion === "jeton" && !(jetons[app.nom] ?? "").trim())}
                    className="rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
                  >
                    {occupée ? "Connexion…" : app.modeConnexion === "jeton" && !connecte ? "Valider" : ligne.etat === "reconnecter" ? "Reconnecter" : connecte ? "Connecté" : ligne.etat === "erreur" ? "Réessayer le statut" : "Connecter"}
                  </button>
                )}
              </div>
              {ligne.etat === "erreur" && ligne.message && (
                <p role="status" aria-live="polite" className="text-xs leading-5 text-[var(--dj-erreur)]">
                  {ligne.message}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <McpPersonnalises />
      <p className="text-xs leading-5 text-dj-texte-muet">Déconnecter Classinus ne révoque pas toujours l’autorisation chez le fournisseur. Pour retirer totalement l’accès, consulte aussi les paramètres de sécurité du service concerné.</p>
    </section>
  );
}
