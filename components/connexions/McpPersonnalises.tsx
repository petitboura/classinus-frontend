"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, CircleAlert, LoaderCircle, Pencil, PlugZap, Plus, RefreshCw, Server, Trash2, Unplug, X } from "lucide-react";
import {
  demarrerConnexionMcpPersonnalise,
  definirMcpPersonnaliseActif,
  deconnecterMcpPersonnalise,
  enregistrerMcpPersonnalise,
  listerMcpPersonnalises,
  supprimerMcpPersonnalise,
  testerMcpPersonnalise,
  type AuthTypeMcpPersonnalise,
  type McpPersonnalise,
} from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { invaliderRegistreOutils } from "@/lib/outils";
import { memoriserRetourConnexion } from "@/lib/retourApresConnexion";
import { obtenirLocale } from "@/lib/i18n/locale";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";
import { Skeleton } from "@/components/Skeleton";

type ResultatTest = {
  nombre_outils: number;
  outils: { nom: string; description: string }[];
};

const ETIQUETTES_AUTH: Record<AuthTypeMcpPersonnalise, string> = {
  none: "Aucune authentification",
  bearer: "Jeton Bearer",
  oauth: "OAuth automatique",
};

export function McpPersonnalises() {
  const [serveurs, setServeurs] = useState<McpPersonnalise[]>([]);
  const [nom, setNom] = useState("");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<AuthTypeMcpPersonnalise>("none");
  const [token, setToken] = useState("");
  const [editionId, setEditionId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);
  const [tests, setTests] = useState<Record<string, ResultatTest>>({});

  const gererErreur = useCallback((e: unknown) => {
    if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
    setErreur(messageErreur(e));
  }, []);

  const recharger = useCallback(async () => {
    setErreur(null);
    try {
      const resultat = await listerMcpPersonnalises();
      setServeurs(resultat.serveurs ?? []);
    } catch (e) {
      gererErreur(e);
    } finally {
      setChargement(false);
    }
  }, [gererErreur]);

  useEffect(() => { void recharger(); }, [recharger]);

  function reinitialiserFormulaire() {
    setNom("");
    setUrl("");
    setAuthType("none");
    setToken("");
    setEditionId(null);
  }

  function modifier(serveur: McpPersonnalise) {
    setErreur(null);
    setMessage(null);
    setEditionId(serveur.id);
    setNom(serveur.nom);
    setUrl(serveur.url);
    setAuthType(serveur.auth_type);
    setToken("");
  }

  async function enregistrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setMessage(null);

    if (!nom.trim()) {
      setErreur("Saisis un nom pour ce serveur.");
      return;
    }

    let adresse: URL;
    try {
      adresse = new URL(url.trim());
    } catch {
      setErreur("Saisis une URL HTTPS valide.");
      return;
    }
    if (adresse.protocol !== "https:" || adresse.username || adresse.password || adresse.hash) {
      setErreur("Utilise une URL HTTPS publique, sans identifiants ni fragment.");
      return;
    }

    const cleEnCours = editionId ?? "nouveau";
    setEnCours(cleEnCours);
    try {
      await enregistrerMcpPersonnalise({
        nom: nom.trim(),
        url: adresse.href,
        auth_type: authType,
        token: authType === "bearer" ? (token.trim() || null) : null,
      }, editionId ?? undefined);
      reinitialiserFormulaire();
      setTests({});
      invaliderRegistreOutils();
      await recharger();
      setMessage(authType === "oauth"
        ? "Serveur enregistré. Lance sa connexion OAuth pour autoriser Classinus."
        : "Serveur enregistré et connexion testée. Ses outils sont disponibles dans le menu Outils.");
    } catch (e) {
      gererErreur(e);
    } finally {
      setEnCours(null);
    }
  }

  async function basculerActif(serveur: McpPersonnalise) {
    setErreur(null);
    setMessage(null);
    setEnCours(serveur.id);
    try {
      await definirMcpPersonnaliseActif(serveur.id, !serveur.actif);
      invaliderRegistreOutils();
      await recharger();
      setMessage(serveur.actif
        ? "Serveur désactivé. Ses outils ne seront plus proposés au chat."
        : "Serveur activé.");
    } catch (e) {
      gererErreur(e);
    } finally {
      setEnCours(null);
    }
  }

  async function tester(serveur: McpPersonnalise) {
    setErreur(null);
    setMessage(null);
    setEnCours(serveur.id);
    try {
      const resultat = await testerMcpPersonnalise(serveur.id);
      setTests((avant) => ({
        ...avant,
        [serveur.id]: { nombre_outils: resultat.nombre_outils, outils: resultat.outils },
      }));
      setMessage("Connexion vérifiée.");
      invaliderRegistreOutils();
    } catch (e) {
      gererErreur(e);
    } finally {
      setEnCours(null);
    }
  }

  async function connecterOAuth(serveur: McpPersonnalise) {
    setErreur(null);
    setMessage(null);
    setEnCours(serveur.id);
    try {
      const resultat = await demarrerConnexionMcpPersonnalise(serveur.id);
      memoriserRetourConnexion({ href: "/applications-connectees", libelle: "à tes applications connectées" });
      window.location.assign(resultat.url);
    } catch (e) {
      gererErreur(e);
      setEnCours(null);
    }
  }

  async function deconnecterOAuth(serveur: McpPersonnalise) {
    setErreur(null);
    setMessage(null);
    setEnCours(serveur.id);
    try {
      await deconnecterMcpPersonnalise(serveur.id);
      setMessage("Connexion OAuth déconnectée.");
      setTests((avant) => {
        const suivants = { ...avant };
        delete suivants[serveur.id];
        return suivants;
      });
      invaliderRegistreOutils();
      await recharger();
    } catch (e) {
      gererErreur(e);
    } finally {
      setEnCours(null);
    }
  }

  async function supprimer(serveur: McpPersonnalise) {
    const question = traduireTexteInterface("Supprimer ce serveur MCP et les identifiants enregistrés dans Classinus ?", obtenirLocale());
    if (!window.confirm("« " + serveur.nom + " »\n" + question)) return;
    setErreur(null);
    setMessage(null);
    setEnCours(serveur.id);
    try {
      await supprimerMcpPersonnalise(serveur.id);
      setTests((avant) => {
        const suivants = { ...avant };
        delete suivants[serveur.id];
        return suivants;
      });
      invaliderRegistreOutils();
      await recharger();
      setMessage("Serveur supprimé.");
      if (editionId === serveur.id) reinitialiserFormulaire();
    } catch (e) {
      gererErreur(e);
    } finally {
      setEnCours(null);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Connecte-toi ou crée un compte pour gérer tes serveurs MCP personnalisés." />;
  }

  return (
    <section aria-labelledby="titre-mcp-personnalises" className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte">
          <Server size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="titre-mcp-personnalises" className="font-display text-base font-semibold text-dj-texte">Serveurs MCP personnalisés</h2>
          <p className="mt-1 text-sm leading-6 text-dj-texte-muet">Ajoute les serveurs MCP distants que tu souhaites utiliser dans l’assistant Classinus. Chaque connexion reste liée à ton compte.</p>
        </div>
      </div>

      <div role="note" className="flex items-start gap-2 rounded-xl border border-dj-bordure bg-dj-surface-haute p-3">
        <CircleAlert size={17} className="mt-0.5 shrink-0 text-dj-texte-muet" />
        <div className="text-sm leading-6 text-dj-texte-muet">
          <p className="font-semibold text-dj-texte">Authentification et sécurité</p>
          <p className="mt-1">Les URL doivent être publiques et utiliser HTTPS. Les jetons sont conservés côté serveur et ne sont pas renvoyés à l’interface. Les outils ajoutés sont confirmés avant chaque exécution.</p>
          <p className="mt-1">OAuth fonctionne si le serveur annonce les métadonnées MCP/OAuth et permet l’enregistrement dynamique du client. Pour un serveur qui fournit un jeton statique, choisis « Jeton Bearer ».</p>
        </div>
      </div>

      <form onSubmit={enregistrer} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mcp-personnalise-nom" className="text-sm font-medium text-dj-texte">Nom du serveur</label>
          <input id="mcp-personnalise-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : Mon serveur MCP" maxLength={80} required className="min-w-0 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mcp-personnalise-url" className="text-sm font-medium text-dj-texte">URL HTTPS du serveur MCP</label>
          <input id="mcp-personnalise-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.exemple.com/mcp" maxLength={2048} required className="min-w-0 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="mcp-personnalise-auth" className="text-sm font-medium text-dj-texte">Authentification</label>
          <SelectPersonnalise
            valeur={authType}
            onChange={(valeur) => {
              setAuthType(valeur as AuthTypeMcpPersonnalise);
              setToken("");
            }}
            options={[
              { id: "none", label: "Aucune authentification" },
              { id: "bearer", label: "Jeton Bearer" },
              { id: "oauth", label: "OAuth automatique (si compatible)" },
            ]}
            placeholder="Choisir une authentification"
          />
        </div>
        {authType === "bearer" && (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label htmlFor="mcp-personnalise-token" className="text-sm font-medium text-dj-texte">Jeton Bearer</label>
            <input id="mcp-personnalise-token" type="password" autoComplete="new-password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={editionId ? "Laisser vide pour conserver le jeton actuel" : "Colle le jeton d’accès"} maxLength={4096} required={!editionId || !serveurs.find((s) => s.id === editionId && s.auth_type === "bearer")} className="w-full rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1" />
            <p className="text-xs leading-5 text-dj-texte-muet">Le jeton est transmis au backend lors de l’enregistrement puis conservé côté serveur. Ne l’ajoute jamais à l’URL.</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button type="submit" disabled={!!enCours} className="inline-flex items-center justify-center gap-2 rounded-xl bg-dj-accent-1 px-4 py-2.5 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50">
            {enCours === (editionId ?? "nouveau") ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
            {editionId ? "Enregistrer les modifications" : "Ajouter le serveur"}
          </button>
          {editionId && (
            <button type="button" onClick={reinitialiserFormulaire} className="inline-flex items-center gap-1.5 rounded-xl border border-dj-bordure px-3 py-2.5 text-sm font-semibold text-dj-texte hover:bg-dj-surface-haute">
              <X size={15} />Annuler
            </button>
          )}
        </div>
      </form>

      {erreur && <div role="alert" className="animate-dj-fade-in-rapide motion-reduce:animate-none flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]"><CircleAlert size={16} className="mt-0.5 shrink-0" />{erreur}</div>}
      {message && <p role="status" className="animate-dj-fade-in-rapide motion-reduce:animate-none rounded-xl border border-dj-bordure p-3 text-sm text-dj-texte">{message}</p>}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-dj-texte">Tes serveurs MCP</h3>
          <button type="button" onClick={() => void recharger()} disabled={chargement || !!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte hover:bg-dj-surface-haute disabled:opacity-50">
            <RefreshCw size={13} className={chargement ? "animate-spin" : ""} />Actualiser
          </button>
        </div>
        {chargement ? (
          <ul aria-busy="true" aria-label="Chargement des serveurs" className="flex flex-col gap-3">
            {[0, 1].map((i) => (
              <li key={i} className="flex flex-col gap-3 rounded-xl border border-dj-bordure p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-1/3 rounded-md" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/4 rounded-md" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-8 w-28 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </li>
            ))}
          </ul>
        ) : serveurs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dj-bordure p-3 text-sm text-dj-texte-muet">Aucun serveur MCP personnalisé. Ajoute une URL HTTPS ci-dessus pour commencer.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {serveurs.map((serveur) => {
              const occupé = enCours === serveur.id;
              const resultatTest = tests[serveur.id];
              return (
                <li key={serveur.id} className="animate-dj-fade-in-rapide motion-reduce:animate-none flex flex-col gap-3 rounded-xl border border-dj-bordure p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte">
                      {serveur.actif && (serveur.auth_type === "oauth" ? serveur.connecte : !!tests[serveur.id]) ? <Check size={17} /> : <PlugZap size={17} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-semibold text-dj-texte">{serveur.nom}</p>
                      <p className="mt-1 break-all text-xs text-dj-texte-muet">{serveur.url}</p>
                      <p className="mt-1 text-xs text-dj-texte-muet">{ETIQUETTES_AUTH[serveur.auth_type]}</p>
                      <p className="mt-1 text-xs font-medium text-dj-texte-muet">
                        {!serveur.actif ? "Désactivé" : serveur.auth_type === "oauth" ? (serveur.connecte ? "Connecté via OAuth" : "OAuth à connecter") : tests[serveur.id] ? "Connexion vérifiée" : "Pas encore testé"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void tester(serveur)} disabled={!!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-2 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50">
                      {occupé ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}Tester les outils
                    </button>
                    {serveur.auth_type === "oauth" && (
                      serveur.connecte ? (
                        <button type="button" onClick={() => void deconnecterOAuth(serveur)} disabled={!!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-2 text-xs font-semibold text-dj-texte hover:bg-dj-surface-haute disabled:opacity-50">
                          <Unplug size={13} />Déconnecter OAuth
                        </button>
                      ) : (
                        <button type="button" onClick={() => void connecterOAuth(serveur)} disabled={!!enCours} className="inline-flex items-center gap-1.5 rounded-lg bg-dj-accent-1 px-3 py-2 text-xs font-bold text-[#1A0D02] hover:bg-dj-accent-2 disabled:opacity-50">
                          <PlugZap size={13} />{occupé ? "Connexion…" : "Connecter OAuth"}
                        </button>
                      )
                    )}
                    <button type="button" onClick={() => void basculerActif(serveur)} disabled={!!enCours} className="rounded-lg border border-dj-bordure px-3 py-2 text-xs font-semibold text-dj-texte hover:bg-dj-surface-haute disabled:opacity-50">
                      {serveur.actif ? "Désactiver" : "Activer"}
                    </button>
                    <button type="button" onClick={() => modifier(serveur)} disabled={!!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-2 text-xs font-semibold text-dj-texte hover:bg-dj-surface-haute disabled:opacity-50">
                      <Pencil size={13} />Modifier
                    </button>
                    <button type="button" onClick={() => void supprimer(serveur)} disabled={!!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--dj-erreur)]/30 px-3 py-2 text-xs font-semibold text-[var(--dj-erreur)] hover:bg-[var(--dj-erreur)]/5 disabled:opacity-50">
                      <Trash2 size={13} />Supprimer
                    </button>
                  </div>
                  {resultatTest && (
                    <div className="animate-dj-fade-in-rapide motion-reduce:animate-none rounded-lg bg-dj-surface-haute p-3">
                      <p className="text-xs font-semibold text-dj-texte">{resultatTest.nombre_outils} outil(s) découvert(s)</p>
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {resultatTest.outils.slice(0, 12).map((outil, index) => (
                          <li key={outil.nom + "-" + index} className="text-xs leading-5 text-dj-texte-muet">
                            <span className="font-medium text-dj-texte">{outil.nom}</span>
                            {outil.description ? ", " + outil.description : ""}
                          </li>
                        ))}
                      </ul>
                      {resultatTest.nombre_outils > 12 && <p className="mt-2 text-xs text-dj-texte-muet">12 premiers outils affichés.</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="text-xs leading-5 text-dj-texte-muet">Limite : 10 serveurs par compte et 50 outils découverts au maximum par serveur. Les outils externes sont proposés dans le menu « Outils » du chat et demandent une confirmation avant exécution.</p>
    </section>
  );
}
