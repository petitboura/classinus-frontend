"use client";

import { useEffect, useContext, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { lireMonProfil, enregistrerMonProfil } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { useTheme, type ChoixTheme } from "@/lib/useTheme";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";
import { ContexteStatutUtilisateur } from "@/lib/contexteStatutUtilisateur";
import { LANGUES_TRADUCTION_ERREURS } from "@/lib/languesTraductionErreurs";

// 19/09/2026, demande Bourama : ancien écran "preferences" d'EspaceParametres.tsx.
const ORDRE_THEME: ChoixTheme[] = ["systeme", "clair", "sombre"];
const ICONES_THEME = { systeme: Monitor, clair: Sun, sombre: Moon };
const LIBELLES_THEME = { systeme: "Système", clair: "Clair", sombre: "Sombre" };

export function ParametresPreferences() {
  const { choix: choixTheme, changerTheme } = useTheme();
  // 26/09/2026, demande Bourama (2e retour) : ne plus rappeler l'API ici
  // -- lu une seule fois par session d'appli dans AppShell.tsx, partagé
  // via ce contexte (voir lib/contexteStatutUtilisateur.tsx). null =
  // jamais répondu, traité comme "prof" pour l'affichage du switch (même
  // valeur par défaut que côté Bureau).
  const {
    estProfesseur: estProfesseurContexte,
    definirEstProfesseur,
    langueCibleErreurs,
    traductionAutoErreurs,
    definirLangueCibleErreurs,
    definirTraductionAutoErreurs,
  } = useContext(ContexteStatutUtilisateur);
  const estProfesseur = estProfesseurContexte ?? true;

  const [chargement, setChargement] = useState(true);
  const [sansCompte, setSansCompte] = useState(false);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [notifsActives, setNotifsActives] = useState(false);
  const [messageNotifs, setMessageNotifs] = useState<string | null>(null);
  const [enregistrementNotifs, setEnregistrementNotifs] = useState(false);
  const [messageProf, setMessageProf] = useState<string | null>(null);
  const [enregistrementProf, setEnregistrementProf] = useState(false);
  // 27/09/2026, chantier "traduction erreurs execution".
  const [messageLangue, setMessageLangue] = useState<string | null>(null);
  const [enregistrementLangue, setEnregistrementLangue] = useState(false);
  const [messageAuto, setMessageAuto] = useState<string | null>(null);
  const [enregistrementAuto, setEnregistrementAuto] = useState(false);
  const traductionAuto = traductionAutoErreurs ?? false;

  useEffect(() => {
    lireMonProfil()
      .then((p: { notifications_proactives_actives: boolean }) => setNotifsActives(!!p.notifications_proactives_actives))
      .catch((e) => {
        if (e instanceof ErreurApi && e.statusCode === 401) {
          setSansCompte(true);
        } else {
          setErreurChargement(messageErreur(e));
        }
      })
      .finally(() => setChargement(false));
  }, []);

  async function basculerNotifs() {
    const nouvelleValeur = !notifsActives;
    setNotifsActives(nouvelleValeur);
    setEnregistrementNotifs(true);
    setMessageNotifs(null);
    try {
      await enregistrerMonProfil({ notifications_proactives_actives: nouvelleValeur });
      setMessageNotifs(nouvelleValeur ? "Relances activées." : "Relances désactivées.");
    } catch (e) {
      setNotifsActives(!nouvelleValeur);
      setMessageNotifs(messageErreur(e));
    } finally {
      setEnregistrementNotifs(false);
    }
  }

  async function basculerProf() {
    const nouvelleValeur = !estProfesseur;
    setEnregistrementProf(true);
    setMessageProf(null);
    try {
      await definirEstProfesseur(nouvelleValeur);
      setMessageProf(nouvelleValeur ? "Sections prof affichées dans Bureau." : "Sections prof masquées dans Bureau.");
    } catch (e) {
      setMessageProf(messageErreur(e));
    } finally {
      setEnregistrementProf(false);
    }
  }

  async function choisirLangueCibleErreurs(langue: string) {
    setEnregistrementLangue(true);
    setMessageLangue(null);
    try {
      await definirLangueCibleErreurs(langue);
      setMessageLangue(`Erreurs traduites en ${langue.toLowerCase()}.`);
    } catch (e) {
      setMessageLangue(messageErreur(e));
    } finally {
      setEnregistrementLangue(false);
    }
  }

  async function basculerTraductionAuto() {
    const nouvelleValeur = !traductionAuto;
    setEnregistrementAuto(true);
    setMessageAuto(null);
    try {
      await definirTraductionAutoErreurs(nouvelleValeur);
      setMessageAuto(nouvelleValeur ? "Traduction automatique activée." : "Traduction à la demande (bouton Traduire).");
    } catch (e) {
      setMessageAuto(messageErreur(e));
    } finally {
      setEnregistrementAuto(false);
    }
  }

  if (sansCompte) {
    return <CTACompteRequis texte="Crée un compte pour gérer ton profil et tes préférences." />;
  }

  if (chargement) {
    return (
      <div className="flex flex-col gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4" aria-hidden>
        <Skeleton className="h-9 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    );
  }

  if (erreurChargement) {
    return <p className="text-sm text-[var(--dj-erreur)]">{erreurChargement}</p>;
  }

  return (
    <div className="flex flex-col gap-4 rounded-cgpt-carte border border-dj-bordure bg-dj-surface p-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-dj-texte">Thème</span>
        <div className="flex gap-2">
          {ORDRE_THEME.map((t) => {
            const Icone = ICONES_THEME[t];
            const actif = choixTheme === t;
            return (
              <button
                key={t}
                onClick={() => changerTheme(t)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  actif
                    ? "border-dj-bordure-forte bg-dj-surface-haute text-dj-texte"
                    : "border-dj-bordure text-dj-texte-muet hover:bg-dj-surface-haute"
                }`}
              >
                <Icone size={16} />
                {LIBELLES_THEME[t]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-dj-bordure pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-dj-texte">Relances de Classinus</span>
          <span className="text-xs text-dj-texte-muet">
            Autorise Classinus à te relancer si tu es inactif, pour ne pas perdre le fil.
          </span>
        </div>
        <button
          role="switch"
          aria-checked={notifsActives}
          onClick={basculerNotifs}
          disabled={enregistrementNotifs}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            notifsActives ? "bg-dj-accent-1" : "bg-dj-inactif"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              notifsActives ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {messageNotifs && <span className="text-sm text-dj-texte-muet">{messageNotifs}</span>}

      <div className="flex items-center justify-between gap-4 border-t border-dj-bordure pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-dj-texte">Je suis prof</span>
          <span className="text-xs text-dj-texte-muet">
            Désactive pour retirer Audit hebdomadaire, Programme et Signalements de Bureau.
          </span>
        </div>
        <button
          role="switch"
          aria-checked={estProfesseur}
          onClick={basculerProf}
          disabled={enregistrementProf}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            estProfesseur ? "bg-dj-accent-1" : "bg-dj-inactif"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              estProfesseur ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {messageProf && <span className="text-sm text-dj-texte-muet">{messageProf}</span>}

      <div className="flex flex-col gap-2 border-t border-dj-bordure pt-4">
        <span className="text-sm font-medium text-dj-texte">Langue de traduction des erreurs</span>
        <span className="text-xs text-dj-texte-muet">
          Langue utilisée par le bouton "Traduire" sous une erreur d'exécution de code.
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {LANGUES_TRADUCTION_ERREURS.map((langue) => (
            <button
              key={langue}
              onClick={() => choisirLangueCibleErreurs(langue)}
              disabled={enregistrementLangue}
              className={`rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${
                langueCibleErreurs === langue
                  ? "border-dj-accent-1 text-dj-accent-1"
                  : "border-dj-bordure text-dj-texte-muet hover:text-dj-texte"
              }`}
            >
              {langue}
            </button>
          ))}
        </div>
        {messageLangue && <span className="text-sm text-dj-texte-muet">{messageLangue}</span>}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-dj-bordure pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-dj-texte">Traduction automatique des erreurs</span>
          <span className="text-xs text-dj-texte-muet">
            Traduit dès qu'une erreur apparaît, sans avoir à cliquer sur "Traduire".
          </span>
        </div>
        <button
          role="switch"
          aria-checked={traductionAuto}
          onClick={basculerTraductionAuto}
          disabled={enregistrementAuto || !langueCibleErreurs}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            traductionAuto ? "bg-dj-accent-1" : "bg-dj-inactif"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              traductionAuto ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
      {messageAuto && <span className="text-sm text-dj-texte-muet">{messageAuto}</span>}
    </div>
  );
}
