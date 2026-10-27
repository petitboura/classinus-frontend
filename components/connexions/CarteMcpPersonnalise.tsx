"use client";

import { Check, CircleAlert, LoaderCircle, MoreHorizontal, Pencil, PlugZap, RefreshCw, Trash2, Unplug } from "lucide-react";
import type { AuthTypeMcpPersonnalise, McpPersonnalise } from "@/lib/api";
import { CadrePanneau } from "@/components/connexions/CadrePanneau";

export type ResultatTestMcp = {
  nombre_outils: number;
  outils: { nom: string; description: string }[];
};

export const ETIQUETTES_AUTH: Record<AuthTypeMcpPersonnalise, string> = {
  none: "Aucune authentification",
  bearer: "Jeton Bearer",
  oauth: "OAuth automatique",
};

export function libelleStatutMcp(serveur: McpPersonnalise, teste: boolean): string {
  if (!serveur.actif) return "Désactivé";
  if (serveur.auth_type === "oauth") return serveur.connecte ? "Connecté via OAuth" : "OAuth à connecter";
  return teste ? "Connexion vérifiée" : "Pas encore testé";
}

const BOUTON_PRINCIPAL = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-dj-accent-1 px-3 py-2 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50";
const BOUTON_SECONDAIRE = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-dj-bordure px-3 py-2 text-xs font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50";

function IconeServeur({ serveur, teste, taille }: { serveur: McpPersonnalise; teste: boolean; taille: number }) {
  const ok = serveur.actif && (serveur.auth_type === "oauth" ? serveur.connecte : teste);
  return ok ? <Check size={taille} /> : <PlugZap size={taille} />;
}

// Carte de taille fixe : l'adresse et le texte sont coupés, le panneau « Voir plus » montre tout.
export function CarteMcpPersonnalise({
  serveur,
  teste,
  occupe,
  desactive,
  onVoirPlus,
  onTester,
  onConnecterOAuth,
}: {
  serveur: McpPersonnalise;
  teste: boolean;
  occupe: boolean;
  desactive: boolean;
  onVoirPlus: () => void;
  onTester: () => void;
  onConnecterOAuth: () => void;
}) {
  const oauthAConnecter = serveur.auth_type === "oauth" && !serveur.connecte;
  return (
    <li className="animate-dj-fade-in-rapide motion-reduce:animate-none flex h-40 flex-col justify-between gap-3 overflow-hidden rounded-xl border border-dj-bordure p-3 sm:p-4">
      <div className="flex min-h-0 items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><IconeServeur serveur={serveur} teste={teste} taille={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-dj-texte">{serveur.nom}</p>
          <p className="mt-1 truncate text-xs text-dj-texte-muet">{serveur.url}</p>
          <p className="mt-1 truncate text-xs text-dj-texte-muet">{ETIQUETTES_AUTH[serveur.auth_type]}</p>
          <p className="mt-1 truncate text-xs font-medium text-dj-texte-muet">{libelleStatutMcp(serveur, teste)}</p>
        </div>
        <button type="button" onClick={onVoirPlus} aria-label="Voir plus" title="Voir plus" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte">
          <MoreHorizontal size={18} />
        </button>
      </div>
      <div className="flex justify-end">
        {oauthAConnecter ? (
          <button type="button" onClick={onConnecterOAuth} disabled={desactive} className={BOUTON_PRINCIPAL}>
            {occupe ? <LoaderCircle size={13} className="animate-spin" /> : <PlugZap size={13} />}{occupe ? "Connexion…" : "Connecter OAuth"}
          </button>
        ) : (
          <button type="button" onClick={onTester} disabled={desactive} className={BOUTON_SECONDAIRE}>
            {occupe ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}Tester les outils
          </button>
        )}
      </div>
    </li>
  );
}

// Panneau de la carte complète : adresse entière, état, outils découverts et toutes les actions.
export function PanneauMcpPersonnalise({
  serveur,
  resultatTest,
  occupe,
  desactive,
  erreur,
  message,
  onFermer,
  onTester,
  onConnecterOAuth,
  onDeconnecterOAuth,
  onBasculerActif,
  onModifier,
  onSupprimer,
}: {
  serveur: McpPersonnalise;
  resultatTest?: ResultatTestMcp;
  occupe: boolean;
  desactive: boolean;
  erreur: string | null;
  message: string | null;
  onFermer: () => void;
  onTester: () => void;
  onConnecterOAuth: () => void;
  onDeconnecterOAuth: () => void;
  onBasculerActif: () => void;
  onModifier: () => void;
  onSupprimer: () => void;
}) {
  return (
    <CadrePanneau titreId={"panneau-mcp-" + serveur.id} onFermer={onFermer} largeur="sm:max-w-lg">
      {(fermer) => (
        <>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><IconeServeur serveur={serveur} teste={!!resultatTest} taille={21} /></span>
            <div className="min-w-0 flex-1">
              <h4 id={"panneau-mcp-" + serveur.id} className="break-words text-base font-semibold text-dj-texte">{serveur.nom}</h4>
              <p className="mt-1 text-xs font-medium text-dj-texte-muet">{libelleStatutMcp(serveur, !!resultatTest)}</p>
            </div>
            <button type="button" onClick={fermer} aria-label="Fermer" title="Fermer" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte">
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </button>
          </div>

          <dl className="flex flex-col gap-2 text-sm">
            <div>
              <dt className="text-xs font-semibold text-dj-texte">Adresse du serveur</dt>
              <dd className="mt-0.5 break-all text-dj-texte-muet">{serveur.url}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-dj-texte">Authentification</dt>
              <dd className="mt-0.5 text-dj-texte-muet">{ETIQUETTES_AUTH[serveur.auth_type]}</dd>
            </div>
          </dl>

          {erreur && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{erreur}</span></div>}
          {message && <p role="status" className="rounded-xl border border-dj-bordure p-3 text-sm text-dj-texte">{message}</p>}

          {resultatTest && (
            <div className="animate-dj-fade-in-rapide motion-reduce:animate-none rounded-lg bg-dj-surface-haute p-3">
              <p className="text-xs font-semibold text-dj-texte">{resultatTest.nombre_outils} outil(s) découvert(s)</p>
              <ul className="mt-2 flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                {resultatTest.outils.map((outil, index) => (
                  <li key={outil.nom + "-" + index} className="text-xs leading-5 text-dj-texte-muet">
                    <span className="font-medium text-dj-texte">{outil.nom}</span>
                    {outil.description ? ", " + outil.description : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onTester} disabled={desactive} className={BOUTON_SECONDAIRE}>
              {occupe ? <LoaderCircle size={13} className="animate-spin" /> : <RefreshCw size={13} />}Tester les outils
            </button>
            {serveur.auth_type === "oauth" && (
              serveur.connecte ? (
                <button type="button" onClick={onDeconnecterOAuth} disabled={desactive} className={BOUTON_SECONDAIRE}><Unplug size={13} />Déconnecter OAuth</button>
              ) : (
                <button type="button" onClick={onConnecterOAuth} disabled={desactive} className={BOUTON_PRINCIPAL}><PlugZap size={13} />{occupe ? "Connexion…" : "Connecter OAuth"}</button>
              )
            )}
            <button type="button" onClick={onBasculerActif} disabled={desactive} className={BOUTON_SECONDAIRE}>{serveur.actif ? "Désactiver" : "Activer"}</button>
            <button type="button" onClick={onModifier} disabled={desactive} className={BOUTON_SECONDAIRE}><Pencil size={13} />Modifier</button>
            <button type="button" onClick={onSupprimer} disabled={desactive} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--dj-erreur)]/30 px-3 py-2 text-xs font-semibold text-[var(--dj-erreur)] transition-colors hover:bg-dj-surface-haute disabled:opacity-50"><Trash2 size={13} />Supprimer</button>
          </div>
        </>
      )}
    </CadrePanneau>
  );
}
