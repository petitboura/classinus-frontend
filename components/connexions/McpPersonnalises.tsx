"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Plus, RefreshCw, Server, Sparkles } from "lucide-react";
import {
  demarrerConnexionMcpPersonnalise,
  definirMcpPersonnaliseActif,
  deconnecterMcpPersonnalise,
  enregistrerMcpPersonnalise,
  listerMcpPersonnalises,
  supprimerMcpPersonnalise,
  testerMcpPersonnalise,
  type McpPersonnalise,
} from "@/lib/api";
import { ErreurApi, messageErreur } from "@/lib/erreurs";
import { useOuvrirChatAvecTexte } from "@/lib/contexteChat";
import { invaliderRegistreOutils } from "@/lib/outils";
import { memoriserRetourConnexion } from "@/lib/retourApresConnexion";
import { obtenirLocale } from "@/lib/i18n/locale";
import { traduireTexteInterface } from "@/lib/i18n/interface";
import { CTACompteRequis } from "@/components/CTACompteRequis";
import { CarteMcpPersonnalise, PanneauMcpPersonnalise, type ResultatTestMcp } from "@/components/connexions/CarteMcpPersonnalise";
import { PanneauFormulaireMcp, type ValeursMcp } from "@/components/connexions/PanneauFormulaireMcp";
import { Skeleton } from "@/components/Skeleton";

// Message prérempli envoyé au chat par le bouton « Le faire avec Classinus » (traduit à l'envoi).
const TEXTE_DEMANDE_IA = "Je veux connecter un nouvel outil à Classinus avec un serveur MCP. Demande-moi lequel, puis cherche son serveur officiel et propose-le moi.";

export function McpPersonnalises() {
  const ouvrirChatAvecTexte = useOuvrirChatAvecTexte();
  const [serveurs, setServeurs] = useState<McpPersonnalise[]>([]);
  // Panneau du formulaire : "nouveau" pour un ajout, l'identifiant du serveur pour une modification.
  const [formulaire, setFormulaire] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sansCompte, setSansCompte] = useState(false);
  const [tests, setTests] = useState<Record<string, ResultatTestMcp>>({});

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

  function modifier(serveur: McpPersonnalise) {
    setErreur(null);
    setMessage(null);
    setDetailId(null);
    setFormulaire(serveur.id);
  }

  // Lève l'erreur : le panneau du formulaire l'affiche à l'endroit où la personne saisit.
  async function enregistrer(valeurs: ValeursMcp) {
    setErreur(null);
    setMessage(null);
    try {
      await enregistrerMcpPersonnalise({
        nom: valeurs.nom,
        url: valeurs.url,
        auth_type: valeurs.authType,
        token: valeurs.token,
      }, formulaire && formulaire !== "nouveau" ? formulaire : undefined);
    } catch (e) {
      if (e instanceof ErreurApi && e.statusCode === 401) setSansCompte(true);
      throw e;
    }
    setTests({});
    invaliderRegistreOutils();
    await recharger();
    setMessage(valeurs.authType === "oauth"
      ? "Serveur enregistré. Lance sa connexion OAuth pour autoriser Classinus."
      : "Serveur enregistré et connexion testée. Classinus peut maintenant utiliser ses outils dans le chat, avec ta confirmation avant chaque exécution.");
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
      setDetailId(null);
    } catch (e) {
      gererErreur(e);
    } finally {
      setEnCours(null);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Connecte-toi ou crée un compte pour gérer tes serveurs MCP personnalisés." />;
  }

  const serveurDetail = serveurs.find((s) => s.id === detailId) ?? null;
  // Noms des autres serveurs : deux noms qui commencent pareil reçoivent plus de lettres dans leur logo.
  const nomsAutres = (serveur: McpPersonnalise) => serveurs.filter((s) => s.id !== serveur.id).map((s) => s.nom);
  const serveurFormulaire = formulaire && formulaire !== "nouveau" ? serveurs.find((s) => s.id === formulaire) ?? null : null;
  const panneauOuvert = !!serveurDetail || !!formulaire;

  return (
    <section aria-labelledby="titre-mcp-personnalises" className="flex flex-col gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte">
          <Server size={19} />
        </span>
        <div className="min-w-0 flex-1 basis-[12rem]">
          <h2 id="titre-mcp-personnalises" className="font-display text-base font-semibold text-dj-texte">Serveurs MCP personnalisés</h2>
          <p className="mt-1 text-sm leading-6 text-dj-texte-muet">Ajoute les serveurs MCP distants que tu souhaites utiliser dans l’assistant Classinus. Chaque connexion reste liée à ton compte.</p>
        </div>
        <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:flex-col sm:items-stretch">
          <button type="button" onClick={() => { setErreur(null); setMessage(null); setFormulaire("nouveau"); }} disabled={!!enCours} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-dj-accent-1 px-3 py-2 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50">
            <Plus size={14} />Ajouter un serveur
          </button>
          {/* 27/10/2026, demande de Bourama : l'IA cherche le serveur officiel de l'outil et le propose dans une carte du chat. */}
          <button
            type="button"
            onClick={() => ouvrirChatAvecTexte(traduireTexteInterface(TEXTE_DEMANDE_IA, obtenirLocale()))}
            disabled={!!enCours}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-2 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50"
          >
            <Sparkles size={14} />Le faire avec Classinus
          </button>
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

      {!panneauOuvert && erreur && <div role="alert" className="animate-dj-fade-in-rapide motion-reduce:animate-none flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]"><CircleAlert size={17} className="mt-0.5 shrink-0" />{erreur}</div>}
      {!panneauOuvert && message && <p role="status" className="animate-dj-fade-in-rapide motion-reduce:animate-none rounded-xl border border-dj-bordure p-3 text-sm text-dj-texte">{message}</p>}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-dj-texte">Tes serveurs MCP</h3>
          <button type="button" onClick={() => void recharger()} disabled={chargement || !!enCours} className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-1.5 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50">
            <RefreshCw size={13} className={chargement ? "animate-spin" : ""} />Actualiser
          </button>
        </div>
        {chargement ? (
          <ul aria-busy="true" aria-label="Chargement des serveurs" className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {[0, 1].map((i) => (
              <li key={i} className="flex h-40 flex-col justify-between rounded-xl border border-dj-bordure p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-1/3 rounded-md" />
                    <Skeleton className="h-3 w-3/4 rounded-md" />
                    <Skeleton className="h-3 w-1/4 rounded-md" />
                  </div>
                </div>
                <Skeleton className="ml-auto h-8 w-28 rounded-lg" />
              </li>
            ))}
          </ul>
        ) : serveurs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dj-bordure p-3 text-sm text-dj-texte-muet">Aucun serveur MCP personnalisé. Utilise « Ajouter un serveur » pour commencer.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {serveurs.map((serveur) => (
              <CarteMcpPersonnalise
                key={serveur.id}
                serveur={serveur}
                autresNoms={nomsAutres(serveur)}
                teste={!!tests[serveur.id]}
                occupe={enCours === serveur.id}
                desactive={!!enCours}
                onVoirPlus={() => { setErreur(null); setMessage(null); setDetailId(serveur.id); }}
                onTester={() => void tester(serveur)}
                onConnecterOAuth={() => void connecterOAuth(serveur)}
              />
            ))}
          </ul>
        )}
      </div>

      {serveurDetail && (
        <PanneauMcpPersonnalise
          serveur={serveurDetail}
          autresNoms={nomsAutres(serveurDetail)}
          resultatTest={tests[serveurDetail.id]}
          occupe={enCours === serveurDetail.id}
          desactive={!!enCours}
          erreur={erreur}
          message={message}
          onFermer={() => setDetailId(null)}
          onTester={() => void tester(serveurDetail)}
          onConnecterOAuth={() => void connecterOAuth(serveurDetail)}
          onDeconnecterOAuth={() => void deconnecterOAuth(serveurDetail)}
          onBasculerActif={() => void basculerActif(serveurDetail)}
          onModifier={() => modifier(serveurDetail)}
          onSupprimer={() => void supprimer(serveurDetail)}
        />
      )}
      {formulaire && (formulaire === "nouveau" || serveurFormulaire) && (
        <PanneauFormulaireMcp serveur={serveurFormulaire} onFermer={() => setFormulaire(null)} onEnregistrer={enregistrer} />
      )}

      <p className="text-xs leading-5 text-dj-texte-muet">Limite : 10 serveurs par compte et 50 outils découverts au maximum par serveur. Classinus utilise ces outils dans le chat et demande une confirmation avant chaque exécution.</p>
    </section>
  );
}
