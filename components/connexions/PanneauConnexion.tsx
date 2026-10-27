"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, PlugZap, Sparkles, Unplug, X } from "lucide-react";
import type { AppliDisponible } from "@/lib/outils";
import { JETONS } from "@/lib/connexionsApplis";
import { messageErreur } from "@/lib/erreurs";
import { useFermetureAnimee } from "@/lib/useFermetureAnimee";
import { BadgePreversion, IndicateurEtatConnexion, type EtatConnexion } from "@/components/connexions/CarteConnexion";

const BOUTON_PRINCIPAL = "inline-flex items-center justify-center gap-1.5 rounded-lg bg-dj-accent-1 px-4 py-2 text-sm font-bold text-[#1A0D02] transition-colors hover:bg-dj-accent-2 disabled:opacity-50";
const BOUTON_SECONDAIRE = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-dj-bordure px-4 py-2 text-sm font-semibold text-dj-texte transition-colors hover:bg-dj-surface-haute disabled:opacity-50";

// Panneau de la carte complète : texte entier, état, et saisie du jeton pour les services qui en
// demandent un (jamais de champ brut dans la carte). Les actions parentes lèvent leur erreur, le
// panneau l'affiche à l'endroit où la personne agit.
export function PanneauConnexion({
  app,
  description,
  etat,
  messageStatut,
  onFermer,
  onJeton,
  onConnecter,
  onDeconnecter,
  onUtiliser,
  dejaUtilise = false,
}: {
  app: AppliDisponible;
  description: string;
  etat: EtatConnexion;
  messageStatut?: string;
  onFermer: () => void;
  onJeton?: (jeton: string) => Promise<void>;
  onConnecter: () => Promise<void>;
  onDeconnecter?: () => Promise<void>;
  onUtiliser?: () => void;
  dejaUtilise?: boolean;
}) {
  const [jeton, setJeton] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const { enSortie, demarrerFermeture } = useFermetureAnimee();
  const fermer = () => demarrerFermeture(onFermer);

  const Icone = app.Icone;
  const parametresJeton = JETONS[app.nom];
  const connecte = etat === "connecte";
  const saisieJeton = app.modeConnexion === "jeton" && !!parametresJeton && !connecte && !!onJeton;

  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => { if (e.key === "Escape") demarrerFermeture(onFermer); };
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [demarrerFermeture, onFermer]);

  async function executer(action: () => Promise<void>, fermerApres: boolean) {
    setErreur(null);
    setEnCours(true);
    try {
      await action();
      if (fermerApres) fermer();
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      setEnCours(false);
    }
  }

  function valider(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onJeton || !jeton.trim()) return;
    void executer(async () => { await onJeton(jeton.trim()); setJeton(""); }, true);
  }

  const messageAffiche = erreur ?? messageStatut;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 pb-[var(--dj-barre-onglets-web,0px)] backdrop-blur-sm sm:items-center sm:p-6 sm:pb-6 ${
        enSortie ? "opacity-0 transition-opacity duration-150 ease-in" : "animate-dj-fade-in-rapide"
      }`}
      onClick={fermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={"panneau-connexion-" + app.nom}
        className={`flex max-h-[85vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl border border-dj-bordure bg-dj-surface p-5 shadow-[0_8px_40px_rgba(0,0,0,0.45)] sm:max-w-md sm:rounded-cgpt-carte ${
          enSortie ? "animate-cgpt-sortie-modal" : "animate-cgpt-entree-modal"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-dj-bordure bg-dj-surface-haute text-dj-texte"><Icone size={22} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 id={"panneau-connexion-" + app.nom} className="text-base font-semibold text-dj-texte">{app.label}</h4>
              <BadgePreversion app={app} />
            </div>
            <div className="mt-1"><IndicateurEtatConnexion etat={etat} /></div>
          </div>
          <button type="button" onClick={fermer} aria-label="Fermer" title="Fermer" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dj-texte-muet transition-colors hover:bg-dj-surface-haute hover:text-dj-texte">
            <X size={17} />
          </button>
        </div>

        <p className="text-sm leading-6 text-dj-texte-muet">{description}</p>

        {saisieJeton && parametresJeton && (
          <form onSubmit={valider} className="flex flex-col gap-2">
            <label htmlFor={"jeton-panneau-" + app.nom} className="text-sm font-semibold text-dj-texte">{parametresJeton.champ}</label>
            <input
              id={"jeton-panneau-" + app.nom}
              type="password"
              autoComplete="off"
              autoFocus
              value={jeton}
              onChange={(e) => setJeton(e.target.value)}
              placeholder={parametresJeton.placeholder}
              className="w-full rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2.5 text-sm text-dj-texte outline-none transition-colors focus:border-dj-accent-1"
            />
            <p className="text-xs leading-5 text-dj-texte-muet">
              Crée-en une dans <a href={parametresJeton.lien} target="_blank" rel="noreferrer" className="underline">{parametresJeton.libelleLien}</a>. Elle sera stockée côté serveur pour ton compte Classinus.
            </p>
            <button type="submit" disabled={enCours || !jeton.trim()} className={BOUTON_PRINCIPAL + " mt-1 self-stretch sm:self-start"}>
              {enCours ? <LoaderCircle size={15} className="animate-spin" /> : <PlugZap size={15} />}{enCours ? "Connexion…" : "Valider"}
            </button>
          </form>
        )}

        {messageAffiche && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-[var(--dj-erreur)]/30 p-3 text-sm text-[var(--dj-erreur)]">
            <CircleAlert size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{messageAffiche}</span>
          </div>
        )}

        {!saisieJeton && (
          <div className="flex flex-wrap items-center gap-2">
            {connecte ? (
              <>
                {onUtiliser && (
                  <button type="button" onClick={() => { onUtiliser(); fermer(); }} disabled={dejaUtilise} className={BOUTON_PRINCIPAL}>
                    <Sparkles size={15} />{dejaUtilise ? "Demande envoyée" : "Utiliser pour ça"}
                  </button>
                )}
                {onDeconnecter && (
                  <button type="button" onClick={() => void executer(onDeconnecter, true)} disabled={enCours} className={BOUTON_SECONDAIRE}>
                    {enCours ? <LoaderCircle size={15} className="animate-spin" /> : <Unplug size={15} />}{enCours ? "Déconnexion…" : "Déconnecter"}
                  </button>
                )}
              </>
            ) : (
              <button type="button" onClick={() => void executer(onConnecter, false)} disabled={enCours || etat === "chargement"} className={BOUTON_PRINCIPAL}>
                {enCours ? <LoaderCircle size={15} className="animate-spin" /> : <PlugZap size={15} />}{enCours ? "Connexion…" : etat === "reconnecter" ? "Reconnecter" : "Connecter"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
