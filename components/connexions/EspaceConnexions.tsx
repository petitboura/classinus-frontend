"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleAlert, LoaderCircle, PlugZap, Unplug } from "lucide-react";
import { APPLIS_DISPONIBLES } from "@/lib/outils";
import { statutConnexion, demarrerConnexion, deconnecterApplication } from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { memoriserRetourConnexion, oublierRetourConnexion } from "@/lib/retourApresConnexion";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { CTACompteRequis } from "@/components/CTACompteRequis";

type Etat = "chargement" | "connecte" | "deconnecte" | "reconnecter" | "erreur";
type Ligne = { etat: Etat; message?: string; action?: boolean };

const DESCRIPTIONS: Record<string, string> = {
  github: "Accède à tes dépôts GitHub pour consulter du code et travailler sur tes projets, selon les autorisations accordées.",
  notion: "Permets à Classinus de retrouver et d’utiliser les pages et bases de données de ton espace Notion.",
  google_drive: "Relie Google Drive pour retrouver les fichiers que tu choisis de rendre accessibles à Classinus.",
  higgsfield_mcp: "Autorise Classinus à utiliser les fonctionnalités Higgsfield disponibles via son serveur MCP, avec ton propre compte.",
  vercel_mcp: "Permets à Classinus d’interagir avec tes projets et déploiements Vercel selon les accès que tu accordes.",
  railway_mcp: "Permets à Classinus d’interagir avec tes projets et services Railway selon les autorisations de ton compte.",
  supabase_mcp: "Permets à Classinus d’interagir avec tes projets Supabase sans partager tes identifiants avec d’autres utilisateurs.",
};


export function EspaceConnexions() {
  const [lignes, setLignes] = useState<Record<string, Ligne>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);

  const recharger = useCallback(async () => {
    oublierRetourConnexion();
    const resultats = await Promise.all(APPLIS_DISPONIBLES.map(async (app) => {
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
        {APPLIS_DISPONIBLES.map((app) => {
          const ligne = lignes[app.nom] ?? { etat: "chargement" as const };
          const Icone = app.Icone;
          const occupée = enCours === app.nom;
          const connecte = ligne.etat === "connecte";
          return (
            <article key={app.nom} className="flex min-h-40 flex-col justify-between gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><Icone size={18} /></span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-dj-texte">{app.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-dj-texte-muet">{DESCRIPTIONS[app.nom] ?? "Relie ce service à Classinus pour utiliser les fonctionnalités autorisées depuis ton compte."}</p>
                </div>
              </div>
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
                  <button type="button" onClick={() => void connecter(app.nom)} disabled={!!enCours || ligne.etat === "chargement" || connecte} className="rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50">
                    {occupée ? "Connexion…" : ligne.etat === "reconnecter" ? "Reconnecter" : connecte ? "Connecté" : ligne.etat === "erreur" ? "Réessayer" : "Connecter"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <p className="text-xs leading-5 text-dj-texte-muet">Déconnecter Classinus ne révoque pas toujours l’autorisation chez le fournisseur. Pour retirer totalement l’accès, consulte aussi les paramètres de sécurité du service concerné.</p>
    </section>
  );
}
