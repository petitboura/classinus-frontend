"use client";

// Porte d'installation de Maame (24/11/2026, demande de Bourama) : sur l'adresse de Maame, tant que l'appli n'est pas
// installée sur le téléphone, un seul gros bouton « Installer » s'affiche avant la page. La page bambara (micro, son,
// bulle) ne s'ouvre qu'après l'installation, ou quand la personne choisit de continuer dans le navigateur (petit lien
// discret, pour ne jamais bloquer quelqu'un dont le navigateur ne sait pas installer).
// Elle ne s'affiche jamais : sur une autre adresse que celle de Maame (Classinus garde son propre bouton d'installation,
// components/BoutonInstaller.tsx), ni quand Maame est déjà ouverte comme une appli installée.
// Chrome et Edge : le bouton lance la vraie installation (événement beforeinstallprompt). iPhone et navigateurs qui
// n'en ont pas : le bouton montre en images simples comment ajouter à l'écran d'accueil.

import { Check, Download, Share, X } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/useLocale";
import { estMaameDansNavigateur } from "@/lib/maame";
import { LOGO_MAAME } from "./OuvertureMaame";
import "./bambara.css";

const CLE_CONTINUER = "maame.installation.continuer";

const TEXTES = {
  fr: {
    installer: "Installer",
    continuer: "Continuer sans installer",
    installee: "Maame est installée. Ouvre-la depuis ton écran d'accueil.",
    aideTitre: "Installer Maame",
    aideIos: ["Appuie sur Partager, en bas de Safari", "Choisis « Sur l'écran d'accueil »"],
    aideAutre: ["Ouvre le menu de ton navigateur (les trois points)", "Choisis « Installer l'application » ou « Ajouter à l'écran d'accueil »"],
    fermer: "Compris",
  },
  en: {
    installer: "Install",
    continuer: "Continue without installing",
    installee: "Maame is installed. Open it from your home screen.",
    aideTitre: "Install Maame",
    aideIos: ["Tap Share, at the bottom of Safari", "Choose “Add to Home Screen”"],
    aideAutre: ["Open your browser menu (the three dots)", "Choose “Install app” or “Add to Home screen”"],
    fermer: "Got it",
  },
} as const;

type Etat = "attente" | "porte" | "ouvert";

function dejaInstallee(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function continuerDejaChoisi(): boolean {
  try {
    return window.sessionStorage.getItem(CLE_CONTINUER) === "1";
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
  const [installee, setInstallee] = useState(false);

  useEffect(() => {
    if (!estMaameDansNavigateur() || dejaInstallee() || continuerDejaChoisi()) {
      setEtat("ouvert");
      return;
    }
    setEstIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    setEtat("porte");

    const surPrompt = (e: Event) => {
      e.preventDefault();
      setEvenement(e);
    };
    const surInstallee = () => setInstallee(true);
    window.addEventListener("beforeinstallprompt", surPrompt);
    window.addEventListener("appinstalled", surInstallee);
    return () => {
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
      if (choix.outcome === "accepted") setInstallee(true);
    } catch {
      setAide(true);
    }
  }, [evenement]);

  const continuer = useCallback(() => {
    try {
      window.sessionStorage.setItem(CLE_CONTINUER, "1");
    } catch {}
    setEtat("ouvert");
  }, []);

  if (etat === "ouvert") return <>{children}</>;
  if (etat === "attente") return <div className="bb-page fixed inset-0" />;

  const etapes = estIOS ? t.aideIos : t.aideAutre;

  return (
    <div className="bb-page fixed inset-0 flex flex-col items-center justify-center gap-10 px-8 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO_MAAME} alt="" width={128} height={128} className="bb-logo-maame h-32 w-32 rounded-full object-cover" />

      {installee ? (
        <div className="flex max-w-xs flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bb-encre)] text-[var(--bb-fond)]">
            <Check size={34} strokeWidth={2.5} aria-hidden />
          </span>
          <p className="font-lecture text-lg">{t.installee}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={installer}
          className="flex min-h-[72px] w-full max-w-xs items-center justify-center gap-3 rounded-full bg-[var(--bb-encre)] px-8 text-xl font-bold text-[var(--bb-fond)] active:opacity-80"
        >
          <Download size={28} strokeWidth={2.5} aria-hidden />
          {t.installer}
        </button>
      )}

      <button type="button" onClick={continuer} className="font-lecture text-sm underline opacity-60">
        {t.continuer}
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
              onClick={() => setAide(false)}
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
