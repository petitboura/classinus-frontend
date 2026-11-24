"use client";

// Porte d'installation de Maame (24/11/2026, demande de Bourama) : sur l'adresse de Maame, tant que l'appli n'est pas
// installée sur le téléphone, un seul gros bouton « Installer » s'affiche avant la page. Règle absolue : la personne ne
// reste jamais bloquée, elle ne sait ni lire ni écrire. Donc :
// 1. Maame est déjà ouverte comme une appli installée, ou déjà installée (repérée par le navigateur ou par la mémoire
//    de la page) : la page s'ouvre tout de suite, sans bouton.
// 2. La personne installe : la page s'ouvre aussitôt dans le navigateur, et elle rouvrira Maame depuis son écran d'accueil.
// 3. Le navigateur ne propose pas l'installation (déjà installée ou pas gérée) : après quelques secondes, la page s'ouvre.
// 4. iPhone (pas d'installation en un clic) : le bouton montre les deux étapes ; quand elle les ferme, la page s'ouvre.
// 5. Une flèche, sans aucun mot, ouvre la page à tout moment.
// Elle ne s'affiche jamais sur une autre adresse que celle de Maame (Classinus garde son bouton, components/BoutonInstaller.tsx).

import { ArrowRight, Download, Share, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/useLocale";
import { estMaameDansNavigateur } from "@/lib/maame";
import { LOGO_MAAME } from "./OuvertureMaame";
import "./bambara.css";

const CLE_INSTALLEE = "maame.installee";
const CLE_CONTINUER = "maame.installation.continuer";
// Attente de la proposition d'installation du navigateur avant d'ouvrir la page quand elle ne vient pas.
const ATTENTE_PROPOSITION_MS = 4000;

const TEXTES = {
  fr: {
    installer: "Installer",
    continuer: "Ouvrir",
    aideTitre: "Installer Maame",
    aideIos: ["Appuie sur Partager, en bas de Safari", "Choisis « Sur l'écran d'accueil »"],
    aideAutre: ["Ouvre le menu de ton navigateur (les trois points)", "Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil »"],
    fermer: "Compris",
  },
  en: {
    installer: "Install",
    continuer: "Open",
    aideTitre: "Install Maame",
    aideIos: ["Tap Share, at the bottom of Safari", "Choose “Add to Home Screen”"],
    aideAutre: ["Open your browser menu (the three dots)", "Choose “Install app” or “Add to Home screen”"],
    fermer: "Got it",
  },
} as const;

type Etat = "attente" | "porte" | "ouvert";

function lire(stockage: "local" | "session", cle: string): boolean {
  try {
    return (stockage === "local" ? window.localStorage : window.sessionStorage).getItem(cle) === "1";
  } catch {
    return false;
  }
}

function ecrire(stockage: "local" | "session", cle: string) {
  try {
    (stockage === "local" ? window.localStorage : window.sessionStorage).setItem(cle, "1");
  } catch {}
}

function ouverteCommeAppli(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

// Le navigateur (Chrome sur Android) sait dire si Maame est déjà installée sur le téléphone.
async function installeeSelonNavigateur(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & { getInstalledRelatedApps?: () => Promise<unknown[]> };
    if (!nav.getInstalledRelatedApps) return false;
    return (await nav.getInstalledRelatedApps()).length > 0;
  } catch {
    return false;
  }
}

export function PorteInstallationMaame({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const t = TEXTES[locale];
  const [etat, setEtat] = useState<Etat>("attente");
  const [evenement, setEvenement] = useState<Event | null>(null);
  const [estIOS, setEstIOS] = useState(false);
  const [aide, setAide] = useState(false);
  const evenementRecu = useRef(false);

  useEffect(() => {
    if (!estMaameDansNavigateur() || ouverteCommeAppli() || lire("local", CLE_INSTALLEE) || lire("session", CLE_CONTINUER)) {
      setEtat("ouvert");
      return;
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setEstIOS(ios);
    setEtat("porte");

    let annule = false;
    void installeeSelonNavigateur().then((oui) => {
      if (annule || !oui) return;
      ecrire("local", CLE_INSTALLEE);
      setEtat("ouvert");
    });

    const surPrompt = (e: Event) => {
      e.preventDefault();
      evenementRecu.current = true;
      setEvenement(e);
    };
    const surInstallee = () => {
      ecrire("local", CLE_INSTALLEE);
      setEtat("ouvert");
    };
    window.addEventListener("beforeinstallprompt", surPrompt);
    window.addEventListener("appinstalled", surInstallee);

    // Pas de proposition d'installation (déjà installée, ou navigateur qui ne la gère pas) : la page s'ouvre toute seule.
    const minuteur = ios
      ? null
      : window.setTimeout(() => {
          if (!evenementRecu.current) setEtat("ouvert");
        }, ATTENTE_PROPOSITION_MS);

    return () => {
      annule = true;
      if (minuteur !== null) window.clearTimeout(minuteur);
      window.removeEventListener("beforeinstallprompt", surPrompt);
      window.removeEventListener("appinstalled", surInstallee);
    };
  }, []);

  const installer = useCallback(async () => {
    if (!evenement) {
      setAide(true);
      return;
    }
    try {
      const prompt = evenement as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
      await prompt.prompt();
      const choix = await prompt.userChoice;
      setEvenement(null);
      if (choix.outcome === "accepted") {
        ecrire("local", CLE_INSTALLEE);
        setEtat("ouvert");
      }
    } catch {
      setAide(true);
    }
  }, [evenement]);

  const continuer = useCallback(() => {
    ecrire("session", CLE_CONTINUER);
    setEtat("ouvert");
  }, []);

  // Les deux étapes ont été lues : on suppose l'ajout à l'écran d'accueil fait, la page s'ouvre.
  const fermerAide = useCallback(() => {
    setAide(false);
    ecrire("local", CLE_INSTALLEE);
    setEtat("ouvert");
  }, []);

  if (etat === "ouvert") return <>{children}</>;
  if (etat === "attente") return <div className="bb-page fixed inset-0" />;

  const etapes = estIOS ? t.aideIos : t.aideAutre;

  return (
    <div className="bb-page fixed inset-0 flex flex-col items-center justify-center gap-10 px-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_MAAME} alt="" width={128} height={128} className="bb-logo-maame h-32 w-32 rounded-full object-cover" />

      <button
        type="button"
        onClick={installer}
        className="flex min-h-[72px] w-full max-w-xs items-center justify-center gap-3 rounded-full bg-[var(--bb-encre)] px-8 text-xl font-bold text-[var(--bb-fond)] active:opacity-80"
      >
        <Download size={28} strokeWidth={2.5} aria-hidden />
        {t.installer}
      </button>

      <button
        type="button"
        onClick={continuer}
        aria-label={t.continuer}
        className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--bb-trait-fort)] opacity-70 active:opacity-100"
      >
        <ArrowRight size={26} aria-hidden />
      </button>

      {aide && (
        <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={() => setAide(false)}>
          <div
            className="w-full max-w-sm rounded-3xl border border-[var(--bb-trait)] bg-[var(--bb-fond)] p-6 text-[var(--bb-encre)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold">{t.aideTitre}</p>
              <button type="button" onClick={() => setAide(false)} aria-label={t.fermer} className="p-1">
                <X size={22} aria-hidden />
              </button>
            </div>
            <ol className="mt-4 list-decimal space-y-3 pl-5 font-lecture">
              {etapes.map((etape, i) => (
                <li key={i}>
                  {i === 0 && estIOS && <Share size={16} className="mr-1 inline align-text-bottom" aria-hidden />}
                  {etape}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={fermerAide}
              className="mt-5 min-h-[52px] w-full rounded-full bg-[var(--bb-encre)] font-bold text-[var(--bb-fond)]"
            >
              {t.fermer}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
