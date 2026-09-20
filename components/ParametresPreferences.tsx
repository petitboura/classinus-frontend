"use client";

import { useEffect, useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import { lireMonProfil, enregistrerMonProfil } from "@/lib/api";
import { messageErreur, ErreurApi } from "@/lib/erreurs";
import { useTheme, type ChoixTheme } from "@/lib/useTheme";
import { Skeleton } from "./Skeleton";
import { CTACompteRequis } from "./CTACompteRequis";

// 19/09/2026, demande Bourama : ancien écran "preferences" d'EspaceParametres.tsx.
const ORDRE_THEME: ChoixTheme[] = ["systeme", "clair", "sombre"];
const ICONES_THEME = { systeme: Monitor, clair: Sun, sombre: Moon };
const LIBELLES_THEME = { systeme: "Système", clair: "Clair", sombre: "Sombre" };

export function ParametresPreferences() {
  const { choix: choixTheme, changerTheme } = useTheme();

  const [chargement, setChargement] = useState(true);
  const [sansCompte, setSansCompte] = useState(false);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);
  const [notifsActives, setNotifsActives] = useState(false);
  const [messageNotifs, setMessageNotifs] = useState<string | null>(null);
  const [enregistrementNotifs, setEnregistrementNotifs] = useState(false);

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
    </div>
  );
}
