"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, ExternalLink, LoaderCircle, PlugZap, Server, Unplug } from "lucide-react";
import { APPLIS_DISPONIBLES, MCP_SERVEURS_COMPLEMENTAIRES } from "@/lib/outils";
import { statutConnexion, demarrerConnexion, deconnecterApplication, enregistrerJetonNetlify } from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { memoriserRetourConnexion, oublierRetourConnexion } from "@/lib/retourApresConnexion";
import { ROUTES_PERSONNALISER } from "@/lib/routesPersonnaliser";
import { CTACompteRequis } from "@/components/CTACompteRequis";

type Etat = "chargement" | "connecte" | "deconnecte" | "reconnecter" | "erreur";
type Ligne = { etat: Etat; message?: string; action?: boolean };

// La liste des applications personnelles est centralisée dans lib/outils.ts.
// Cette branche affiche aussi Google Drive afin de présenter tous les MCP personnels configurés.
const APPLIS_AFFICHEES = APPLIS_DISPONIBLES.filter((app) => app.visibleDansEspaceConnexions);

const DESCRIPTIONS: Record<string, string> = {
  github: "Accède à tes dépôts GitHub pour consulter du code et travailler sur tes projets, selon les autorisations accordées.",
  notion: "Permets à Classinus de retrouver et d’utiliser les pages et bases de données de ton espace Notion.",
  google_drive: "Relie Google Drive pour retrouver les fichiers que tu choisis de rendre accessibles à Classinus.",
  google_gmail_mcp: "Serveur MCP Gmail officiel : rechercher et lire des e-mails, consulter les fils et préparer des brouillons dans les limites des autorisations Google accordées.",
  google_docs_mcp: "Serveur MCP Google Docs officiel : retrouver et lire la structure des documents, puis modifier ceux auxquels ton compte autorise l’accès.",
  google_sheets_mcp: "Serveur MCP Google Sheets officiel : consulter les classeurs et valeurs, puis mettre à jour les cellules et formules autorisées.",
  google_slides_mcp: "Serveur MCP Google Slides officiel : lire la structure et la mise en page des présentations, puis modifier les présentations autorisées.",
  google_calendar_mcp: "Serveur MCP Google Calendar officiel : consulter les agendas et événements, créer ou supprimer les événements autorisés.",
  google_chat_mcp: "Serveur MCP Google Chat officiel : consulter les espaces, conversations et messages autorisés et envoyer des messages si l’application Chat est configurée.",
  google_classroom_mcp: "Serveur MCP Google Classroom : consulter les cours, listes d’élèves et travaux accessibles selon les scopes et l’accès de ton compte.",
  google_people_mcp: "Serveur MCP Google People : consulter les profils et contacts couverts par les autorisations Google accordées.",
  microsoft_mcp: "Microsoft MCP Server for Enterprise est en préversion. Il permet d’interroger certaines données d’entreprise Microsoft Entra/Graph ; une inscription d’application et les autorisations du locataire sont nécessaires. Ce n’est pas une intégration autonome complète d’Outlook, Teams ou OneDrive.",
  netlify_mcp: "Pont MCP Classinus vers l’API REST officielle Netlify : lister les sites et déploiements, consulter leur état et relancer un build. Le jeton personnel est vérifié puis conservé côté serveur, séparément pour ton compte.",
  render_mcp: "Serveur MCP officiel Render : explorer les services, déploiements et journaux accessibles à ton compte. Les actions qui modifient un service ou déclenchent un déploiement demandent une confirmation.",
  cloudflare_mcp: "Serveur MCP officiel Cloudflare : rechercher la documentation et interagir avec les ressources Cloudflare autorisées par ton compte, selon les outils proposés par le serveur.",
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
  const [jetonNetlify, setJetonNetlify] = useState("");

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
    if (service === "netlify_mcp") {
      try {
        await enregistrerJetonNetlify(jetonNetlify.trim());
        setLignes((avant) => ({ ...avant, [service]: { etat: "connecte" } }));
        setJetonNetlify("");
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
                  <label htmlFor={"jeton-" + app.nom} className="text-xs font-semibold text-dj-texte">Jeton personnel Netlify</label>
                  <input
                    id={"jeton-" + app.nom}
                    type="password"
                    autoComplete="off"
                    value={jetonNetlify}
                    onChange={(event) => setJetonNetlify(event.target.value)}
                    placeholder="Colle ton jeton Netlify"
                    className="w-full rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
                  />
                  <p className="text-xs leading-5 text-dj-texte-muet">
                    Crée un jeton dans <a href="https://app.netlify.com/user/applications#personal-access-tokens" target="_blank" rel="noreferrer" className="underline">les paramètres de Netlify</a>. Il sera stocké côté serveur pour ton compte Classinus.
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
                    disabled={!!enCours || ligne.etat === "chargement" || connecte || (app.modeConnexion === "jeton" && !jetonNetlify.trim())}
                    className="rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
                  >
                    {occupée ? "Connexion…" : app.modeConnexion === "jeton" && !connecte ? "Valider le jeton" : ligne.etat === "reconnecter" ? "Reconnecter" : connecte ? "Connecté" : ligne.etat === "erreur" ? "Réessayer le statut" : "Connecter"}
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
      <p className="text-xs leading-5 text-dj-texte-muet">Déconnecter Classinus ne révoque pas toujours l’autorisation chez le fournisseur. Pour retirer totalement l’accès, consulte aussi les paramètres de sécurité du service concerné.</p>

      <section className="mt-8 flex flex-col gap-3" aria-labelledby="mcp-plateforme-titre">
        <div>
          <h2 id="mcp-plateforme-titre" className="text-base font-semibold text-dj-texte">Autres serveurs MCP de Classinus</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-dj-texte-muet">
            Ces serveurs ne sont pas tous des comptes personnels à connecter. Leur fonctionnement dépend de la configuration du backend et des outils autorisés ; les fiches ci-dessous indiquent leur rôle sans prétendre tester leur disponibilité en direct.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {MCP_SERVEURS_COMPLEMENTAIRES.map((serveur) => (
            <article key={serveur.id} className="flex min-h-36 flex-col justify-between gap-3 rounded-2xl border border-dj-bordure bg-dj-surface p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte">
                  <Server size={18} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-dj-texte">{serveur.nom}</h3>
                  <p className="mt-1.5 text-sm leading-6 text-dj-texte-muet">{serveur.description}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={
                  "inline-flex rounded-full border px-2.5 py-1 text-xs " +
                  (serveur.statut === "desactive"
                    ? "border-[var(--dj-erreur)]/30 text-[var(--dj-erreur)]"
                    : "border-dj-bordure text-dj-texte-muet")
                }>
                  {serveur.libelleStatut}
                </span>
                {serveur.endpoint && (
                  <code className="max-w-full break-all text-xs text-dj-texte-muet">{serveur.endpoint}</code>
                )}
                {serveur.guideHref && (
                  <Link href={serveur.guideHref} className="inline-flex items-center gap-1 text-xs font-semibold text-dj-accent-1 hover:underline">
                    Ouvrir le guide Claude <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
