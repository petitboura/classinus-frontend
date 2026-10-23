"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, LoaderCircle, PlugZap, Unplug } from "lucide-react";
import { APPLIS_DISPONIBLES } from "@/lib/outils";
import { statutConnexion, demarrerConnexion, deconnecterApplication } from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { memoriserRetourConnexion, oublierRetourConnexion } from "@/lib/retourApresConnexion";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { ROUTES_PARAMETRES } from "@/lib/routesParametres";
import { CTACompteRequis } from "@/components/CTACompteRequis";

type Etat = "chargement" | "connecte" | "deconnecte" | "reconnecter" | "erreur";
type Ligne = { etat: Etat; message?: string; action?: boolean };

// Décision Bourama (22/10) : Google Drive n'est pas affiché sur cet écran.
// Vercel est de nouveau affiché (23/10) pour que Vercel puisse tester le client.
const MASQUEES = new Set(["google_drive"]);
const APPLIS_AFFICHEES = APPLIS_DISPONIBLES.filter((app) => !MASQUEES.has(app.nom));

const DESCRIPTIONS: Record<string, string> = {
  github: "Connecte ton compte GitHub pour que Clovis puisse rechercher tes dépôts, lire des fichiers et examiner branches, commits et pull requests. Selon les outils autorisés, il peut aussi préparer ou effectuer des changements dans les dépôts. Les actions d’écriture et de fusion se règlent séparément dans Gestion des outils.",
  notion: "Connecte ton espace Notion pour rechercher et lire des pages et bases de données. Selon les outils disponibles et les règles que tu choisis, Clovis peut aussi créer, modifier ou déplacer des pages et gérer certains commentaires. La connexion Notion ne vaut pas autorisation permanente de chaque action.",
  google_drive: "Relie Google Drive pour rechercher, lire ou télécharger les fichiers accessibles à ton compte. Certains outils peuvent aussi créer ou copier des fichiers. Google Drive reste masqué dans cette liste sur décision actuelle, mais sa description est conservée pour le catalogue.",
  higgsfield_mcp: "Relie ton propre compte Higgsfield pour utiliser les outils de génération et de consultation de résultats disponibles sur ce compte. La génération peut consommer des crédits ou un quota du fournisseur ; vérifie les effets de chaque outil avant de l’autoriser en permanence.",
  vercel_mcp: "Connecte Vercel pour consulter tes projets, déploiements et informations de build. Selon les outils autorisés, Clovis peut aussi lancer ou annuler un déploiement et modifier certains réglages. Ces actions peuvent affecter un site en ligne : définis des règles explicites dans Gestion des outils.",
  railway_mcp: "Connecte Railway pour consulter tes projets, services, déploiements et journaux. Selon les outils autorisés, Clovis peut aussi toucher aux variables d’environnement, domaines ou services. Ces opérations peuvent interrompre une application ou exposer des secrets ; n’autorise que les outils nécessaires.",
  supabase_mcp: "Connecte Supabase pour consulter tes projets, schémas de base de données, tables et journaux. Certains outils peuvent exécuter du SQL ou appliquer des migrations, donc lire, modifier ou supprimer des données et changer le schéma. Configure chaque outil séparément dans Gestion des outils.",
};


export function EspaceConnexions() {
  const [lignes, setLignes] = useState<Record<string, Ligne>>({});
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);

  const recharger = useCallback(async () => {
    oublierRetourConnexion();
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
      <div className="flex max-w-3xl flex-col gap-2">
        <p className="text-sm leading-6 text-dj-texte-muet">
          Relie uniquement les services dont tu as besoin. La connexion rattache ton compte fournisseur à Classinus ; elle ne signifie pas que toutes les actions de ce service sont autorisées en permanence.
        </p>
        <Link href={ROUTES_PARAMETRES.outils} className="w-fit text-sm font-semibold text-dj-texte underline underline-offset-4 hover:text-dj-texte-muet">
          Gérer les autorisations outil par outil
        </Link>
      </div>
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
                  <h3 className="text-sm font-semibold text-dj-texte">{app.label}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-dj-texte-muet">{DESCRIPTIONS[app.nom] ?? "Relie ce service à Classinus pour utiliser les fonctionnalités autorisées depuis ton compte."}</p>
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
