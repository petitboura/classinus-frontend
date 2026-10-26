"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, LoaderCircle, PlugZap, Sparkles } from "lucide-react";
import { APPLIS_DISPONIBLES } from "@/lib/outils";
import { statutConnexion, demarrerConnexion } from "@/lib/api";
import { DESCRIPTIONS, JETONS } from "@/lib/connexionsApplis";
import { messageErreur } from "@/lib/erreurs";
import { obtenirLocale } from "@/lib/i18n/locale";
import { memoriserRetourConnexion } from "@/lib/retourApresConnexion";

// Carte du bloc ```connecteur``` (26/10/2026, demande de Bourama) : l'IA propose un service que
// l'utilisateur n'a pas encore connecté. Même apparence que dans l'écran Connexions
// (components/connexions/EspaceConnexions.tsx), mêmes textes (lib/connexionsApplis.ts), même
// connexion. Une fois connecté, un bouton redonne la main à l'IA pour reprendre la tâche.

type Etat = "chargement" | "connecte" | "deconnecte" | "reconnecter" | "erreur";

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
  const [etat, setEtat] = useState<Etat>("chargement");
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [jeton, setJeton] = useState("");
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

  const Icone = app.Icone;
  const connecte = etat === "connecte";
  const modeJeton = app.modeConnexion === "jeton";
  const parametresJeton = JETONS[app.nom];

  const connecter = async () => {
    setMessage(null);
    setEnCours(true);
    if (modeJeton && parametresJeton) {
      try {
        await parametresJeton.enregistrer(jeton.trim());
        setJeton("");
        setEtat("connecte");
      } catch (e) {
        setMessage(messageErreur(e));
      } finally {
        setEnCours(false);
      }
      return;
    }
    try {
      const { url } = await demarrerConnexion(app.nom);
      // Retour dans cette même conversation après l'autorisation chez le fournisseur.
      memoriserRetourConnexion({ href: window.location.pathname + window.location.search, libelle: "à ta conversation" });
      window.location.assign(url);
    } catch (e) {
      setMessage(messageErreur(e));
      setEnCours(false);
    }
  };

  const utiliser = () => {
    if (!onUtiliser || dejaUtilise) return;
    setDejaUtilise(true);
    onUtiliser(messagePourReprendre(app.label));
  };

  return (
    <article className="my-3 flex w-full max-w-md animate-dj-fade-up flex-col justify-between gap-4 rounded-2xl border border-dj-bordure bg-dj-surface p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><Icone size={18} /></span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-dj-texte">{app.label}</h3>
          <p className="mt-1.5 text-sm leading-6 text-dj-texte-muet">{DESCRIPTIONS[app.nom] ?? "Relie ce service à Classinus pour utiliser les fonctionnalités autorisées depuis ton compte."}</p>
        </div>
      </div>
      {modeJeton && !connecte && parametresJeton && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={"jeton-chat-" + app.nom} className="text-xs font-semibold text-dj-texte">{parametresJeton.champ}</label>
          <input
            id={"jeton-chat-" + app.nom}
            type="password"
            autoComplete="off"
            value={jeton}
            onChange={(event) => setJeton(event.target.value)}
            placeholder={parametresJeton.placeholder}
            className="w-full rounded-lg border border-dj-bordure bg-dj-surface px-3 py-2 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
          <p className="text-xs leading-5 text-dj-texte-muet">
            Crée-en une dans <a href={parametresJeton.lien} target="_blank" rel="noreferrer" className="underline">{parametresJeton.libelleLien}</a>. Elle sera stockée côté serveur pour ton compte Classinus.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-dj-texte-muet">
          {etat === "chargement" ? <LoaderCircle size={14} className="animate-spin" /> : connecte ? <Check size={14} className="text-emerald-500" /> : etat === "erreur" || etat === "reconnecter" ? <CircleAlert size={14} /> : <PlugZap size={14} />}
          {etat === "chargement" ? "Vérification…" : connecte ? "Connecté" : etat === "reconnecter" ? "Reconnexion nécessaire" : etat === "erreur" ? "Statut indisponible" : "Non connecté"}
        </span>
        {connecte ? (
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
            onClick={() => (etat === "erreur" ? void verifier() : void connecter())}
            disabled={enCours || etat === "chargement" || (modeJeton && etat !== "erreur" && !jeton.trim())}
            className="rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50"
          >
            {enCours ? "Connexion…" : modeJeton && etat !== "erreur" ? "Valider" : etat === "reconnecter" ? "Reconnecter" : etat === "erreur" ? "Réessayer le statut" : "Connecter"}
          </button>
        )}
      </div>
      {message && (
        <p role="status" aria-live="polite" className="text-xs leading-5 text-[var(--dj-erreur)]">{message}</p>
      )}
    </article>
  );
}
