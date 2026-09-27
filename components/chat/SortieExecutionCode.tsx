"use client";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Languages, Loader2, Send, X } from "lucide-react";
import type { EtatExecution } from "@/lib/executionPython";
import type { LigneSortie } from "@/lib/useExecutionPython";
import { traduireMessage } from "@/lib/api";
import { messageErreur } from "@/lib/erreurs";
import { ContexteStatutUtilisateur } from "@/lib/contexteStatutUtilisateur";
import { LANGUES_TRADUCTION_ERREURS } from "@/lib/languesTraductionErreurs";

// Zone sous un bloc de code exécuté (voir BlocCode.tsx) : soit le petit
// formulaire de valeurs demandé avant de lancer (téléphone incapable de
// mettre le code en pause), soit le résultat (sortie, saisie en cours,
// erreur, graphiques).

const LIBELLE_ETAT: Partial<Record<EtatExecution, string>> = {
  attente: "En attente...",
  chargement: "Chargement de Python (quelques secondes la première fois)...",
  paquets: "Chargement des bibliothèques...",
  execution: "Exécution...",
};

export function FormulaireValeursPrealables({
  invites,
  onValider,
  onAnnuler,
}: {
  invites: string[];
  onValider: (valeurs: string[]) => void;
  onAnnuler: () => void;
}) {
  const [valeurs, setValeurs] = useState<string[]>(() => invites.map(() => ""));

  function soumettre(e: FormEvent) {
    e.preventDefault();
    onValider(valeurs);
  }

  return (
    <form
      onSubmit={soumettre}
      className="animate-dj-fade-in space-y-2 border-t border-dj-bordure bg-dj-surface px-4 py-3"
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-dj-texte-muet">
        Ce code demande des valeurs
      </p>
      {invites.map((invite, i) => (
        <label key={i} className="block text-xs text-dj-texte-muet">
          {invite}
          <input
            autoFocus={i === 0}
            value={valeurs[i]}
            onChange={(e) => setValeurs((v) => v.map((val, j) => (j === i ? e.target.value : val)))}
            className="mt-0.5 w-full rounded-lg border border-dj-bordure bg-[var(--dj-fond)] px-2.5 py-1.5 text-sm text-dj-texte outline-none focus:border-dj-accent-1"
          />
        </label>
      ))}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          className="rounded-lg bg-dj-accent-1 px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Lancer
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          className="text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

export function SortieExecutionCode({
  etat,
  lignes,
  images,
  erreur,
  inviteSaisie,
  enCours,
  onRepondreSaisie,
  onEffacer,
}: {
  etat: EtatExecution;
  lignes: LigneSortie[];
  images: string[];
  erreur: string | null;
  inviteSaisie: string | null;
  enCours: boolean;
  onRepondreSaisie: (valeur: string) => void;
  onEffacer: () => void;
}) {
  const [saisie, setSaisie] = useState("");

  // 27/09/2026, chantier "traduction erreurs execution".
  const { connecte, langueCibleErreurs, traductionAutoErreurs, definirLangueCibleErreurs } =
    useContext(ContexteStatutUtilisateur);
  const [afficherSelecteurLangue, setAfficherSelecteurLangue] = useState(false);
  const [chargementTraduction, setChargementTraduction] = useState(false);
  const [traduction, setTraduction] = useState<string | null>(null);
  const [messageTraduction, setMessageTraduction] = useState<string | null>(null);
  // Évite de relancer la traduction auto en boucle sur la même erreur
  // (re-renders successifs tant que rien n'a changé côté exécution).
  const derniereErreurAutoTraduiteRef = useRef<string | null>(null);

  // L'erreur peut changer (nouvelle exécution) ou disparaître (Effacer) :
  // la traduction affichée doit repartir de zéro dans les deux cas.
  useEffect(() => {
    setTraduction(null);
    setMessageTraduction(null);
    setAfficherSelecteurLangue(false);
  }, [erreur]);

  async function lancerTraduction(langue: string) {
    setChargementTraduction(true);
    setMessageTraduction(null);
    try {
      const { traduction: resultat } = await traduireMessage(erreur || "", langue);
      if (resultat) {
        setTraduction(resultat);
      } else {
        setMessageTraduction("La traduction a échoué, réessaie dans un instant.");
      }
    } catch (e) {
      setMessageTraduction(messageErreur(e));
    } finally {
      setChargementTraduction(false);
    }
  }

  function cliquerTraduire() {
    if (!connecte) {
      setMessageTraduction("Connecte-toi pour traduire.");
      return;
    }
    if (!langueCibleErreurs) {
      setAfficherSelecteurLangue(true);
      return;
    }
    lancerTraduction(langueCibleErreurs);
  }

  async function choisirLangue(langue: string) {
    setAfficherSelecteurLangue(false);
    try {
      await definirLangueCibleErreurs(langue);
    } catch (e) {
      setMessageTraduction(messageErreur(e));
      return;
    }
    lancerTraduction(langue);
  }

  // Traduction automatique (réglage "Traduction automatique des erreurs"
  // dans Paramètres > Préférences) : dès qu'une erreur apparaît pour un
  // compte connecté ayant déjà choisi sa langue.
  useEffect(() => {
    if (
      erreur &&
      connecte &&
      traductionAutoErreurs &&
      langueCibleErreurs &&
      derniereErreurAutoTraduiteRef.current !== erreur
    ) {
      derniereErreurAutoTraduiteRef.current = erreur;
      lancerTraduction(langueCibleErreurs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [erreur, connecte, traductionAutoErreurs, langueCibleErreurs]);

  if (etat === "inactif") return null;

  const aucunResultat = lignes.length === 0 && images.length === 0 && !erreur;

  function envoyerSaisie(e: FormEvent) {
    e.preventDefault();
    onRepondreSaisie(saisie);
    setSaisie("");
  }

  return (
    <div className="animate-dj-fade-in border-t border-dj-bordure bg-dj-surface px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-dj-texte-muet">
          {enCours && etat !== "attente_saisie" && <Loader2 size={12} className="animate-spin" />}
          {enCours && etat !== "attente_saisie" ? LIBELLE_ETAT[etat] : etat === "attente_saisie" ? "En attente" : "Résultat"}
        </span>
        {!enCours && (
          <button
            onClick={onEffacer}
            aria-label="Effacer le résultat"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <X size={12} /> Effacer
          </button>
        )}
      </div>

      {lignes.length > 0 && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
          {lignes.map((ligne, i) => (
            <span key={i} className={ligne.flux === "stderr" ? "text-[var(--dj-code-deletion)]" : "text-dj-texte"}>
              {ligne.texte + "\n"}
            </span>
          ))}
        </pre>
      )}

      {etat === "attente_saisie" && (
        <form onSubmit={envoyerSaisie} className="mt-1 flex items-center gap-2 font-mono text-[13px]">
          <span className="text-dj-texte-muet">{inviteSaisie || ">"}</span>
          <input
            autoFocus
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            className="min-w-0 flex-1 border-b border-dj-bordure bg-transparent px-1 py-0.5 text-dj-texte outline-none focus:border-dj-accent-1"
          />
          <button type="submit" aria-label="Envoyer" className="text-dj-texte-muet transition-colors hover:text-dj-texte">
            <Send size={14} />
          </button>
        </form>
      )}

      {images.map((base64, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={`data:image/png;base64,${base64}`}
          alt="Graphique produit par le code"
          className="mt-2 max-w-full animate-dj-fade-in rounded-lg bg-white"
        />
      ))}

      {erreur && (
        <>
          <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-[var(--dj-code-deletion)]">
            {erreur}
          </pre>

          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {!chargementTraduction && !traduction && (
              <button
                onClick={cliquerTraduire}
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
              >
                <Languages size={12} /> Traduire
              </button>
            )}
            {chargementTraduction && (
              <span className="flex items-center gap-1 text-[11px] text-dj-texte-muet">
                <Loader2 size={12} className="animate-spin" /> Traduction...
              </span>
            )}
          </div>

          {afficherSelecteurLangue && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-dj-texte-muet">Traduire vers :</span>
              {LANGUES_TRADUCTION_ERREURS.map((langue) => (
                <button
                  key={langue}
                  onClick={() => choisirLangue(langue)}
                  className="rounded-md border border-dj-bordure px-1.5 py-0.5 text-[11px] text-dj-texte-muet transition-colors hover:text-dj-texte"
                >
                  {langue}
                </button>
              ))}
            </div>
          )}

          {messageTraduction && (
            <p className="mt-1 text-xs text-dj-texte-muet">{messageTraduction}</p>
          )}

          {traduction && (
            <div className="mt-1.5 border-t border-dj-bordure pt-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-dj-texte-muet">
                Traduction
              </span>
              <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed text-dj-texte">
                {traduction}
              </pre>
            </div>
          )}
        </>
      )}

      {!enCours && etat === "interrompu" && (
        <p className="mt-1 text-xs text-dj-texte-muet">Exécution arrêtée.</p>
      )}
      {!enCours && etat === "termine" && aucunResultat && (
        <p className="text-xs text-dj-texte-muet">Terminé, le code n'affiche rien.</p>
      )}
    </div>
  );
}
