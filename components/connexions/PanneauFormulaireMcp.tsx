"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, Plus } from "lucide-react";
import type { AuthTypeMcpPersonnalise, McpPersonnalise } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { CadrePanneau } from "@/components/connexions/CadrePanneau";
import { ETIQUETTES_AUTH, libelleStatutMcp } from "@/components/connexions/CarteMcpPersonnalise";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";

export type ValeursMcp = { nom: string; url: string; authType: AuthTypeMcpPersonnalise; token: string | null };

const CHAMP = "min-w-0 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1";

// Panneau d'ajout ou de modification d'un serveur : en modification il rappelle la carte complète du
// serveur, et le jeton Bearer se saisit ici, jamais dans la liste.
export function PanneauFormulaireMcp({
  serveur,
  onFermer,
  onEnregistrer,
}: {
  serveur: McpPersonnalise | null;
  onFermer: () => void;
  onEnregistrer: (valeurs: ValeursMcp) => Promise<void>;
}) {
  const [nom, setNom] = useState(serveur?.nom ?? "");
  const [url, setUrl] = useState(serveur?.url ?? "");
  const [authType, setAuthType] = useState<AuthTypeMcpPersonnalise>(serveur?.auth_type ?? "none");
  const [token, setToken] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const jetonDejaEnregistre = serveur?.auth_type === "bearer";

  async function envoyer(e: FormEvent<HTMLFormElement>, fermer: () => void) {
    e.preventDefault();
    setErreur(null);
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
    setEnCours(true);
    try {
      await onEnregistrer({ nom: nom.trim(), url: adresse.href, authType, token: authType === "bearer" ? (token.trim() || null) : null });
      fermer();
    } catch (err) {
      setErreur(messageErreur(err));
    } finally {
      setEnCours(false);
    }
  }

  return (
    <CadrePanneau titreId="panneau-formulaire-mcp" onFermer={onFermer} largeur="sm:max-w-lg">
      {(fermer) => (
        <form onSubmit={(e) => void envoyer(e, fermer)} className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h4 id="panneau-formulaire-mcp" className="text-base font-semibold text-dj-texte">{serveur ? "Modifier le serveur" : "Ajouter un serveur MCP"}</h4>
              {serveur && <p className="mt-1 break-all text-xs text-dj-texte-muet">{serveur.url + " · " + ETIQUETTES_AUTH[serveur.auth_type] + " · " + libelleStatutMcp(serveur, false)}</p>}
            </div>
            <button type="button" onClick={fermer} aria-label="Fermer" title="Fermer" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte">
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </button>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mcp-personnalise-nom" className="text-sm font-medium text-dj-texte">Nom du serveur</label>
            <input id="mcp-personnalise-nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. : Mon serveur MCP" maxLength={80} required className={CHAMP} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mcp-personnalise-url" className="text-sm font-medium text-dj-texte">URL HTTPS du serveur MCP</label>
            <input id="mcp-personnalise-url" type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://mcp.exemple.com/mcp" maxLength={2048} required className={CHAMP} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mcp-personnalise-auth" className="text-sm font-medium text-dj-texte">Authentification</label>
            <SelectPersonnalise
              valeur={authType}
              onChange={(valeur) => { setAuthType(valeur as AuthTypeMcpPersonnalise); setToken(""); }}
              options={[
                { id: "none", label: "Aucune authentification" },
                { id: "bearer", label: "Jeton Bearer" },
                { id: "oauth", label: "OAuth automatique (si compatible)" },
              ]}
              placeholder="Choisir une authentification"
            />
          </div>
          {authType === "bearer" && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="mcp-personnalise-token" className="text-sm font-medium text-dj-texte">Jeton Bearer</label>
              <input id="mcp-personnalise-token" type="password" autoComplete="new-password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={serveur ? "Laisser vide pour conserver le jeton actuel" : "Colle le jeton d’accès"} maxLength={4096} required={!serveur || !jetonDejaEnregistre} className={CHAMP} />
              <p className="text-xs leading-5 text-dj-texte-muet">Le jeton est transmis au backend lors de l’enregistrement puis conservé côté serveur. Ne l’ajoute jamais à l’URL.</p>
            </div>
          )}

          {erreur && <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{erreur}</span></div>}

          <button type="submit" disabled={enCours} className="inline-flex items-center justify-center gap-2 rounded-xl bg-dj-accent-1 px-4 py-2.5 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50">
            {enCours ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
            {serveur ? "Enregistrer les modifications" : "Ajouter le serveur"}
          </button>
        </form>
      )}
    </CadrePanneau>
  );
}
