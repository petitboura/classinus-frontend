"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { useLocale } from "@/lib/i18n/useLocale";
import { useTheme } from "@/lib/useTheme";
import { traiterLienSortant } from "@/lib/liensSortants";
import {
  CONFIG_MCP_UI,
  notificationTheme,
  traiterMessageWidget,
  type ContexteWidget,
  type RessourceUi,
} from "@/lib/mcpUi";

// Widget MCP-UI (04/11/2026) : affiche dans le fil la ressource ui:// renvoyée par un outil MCP
// (Higgsfield et tout serveur compatible). Le contenu est du CODE TIERS NON FIABLE :
// - iframe sandbox="allow-scripts" SANS allow-same-origin pour le HTML : le widget vit dans une
//   origine opaque, sans accès aux cookies, au localStorage, au DOM ni à la session de Classinus ;
// - jamais de navigation de la page parente (pas d'allow-top-navigation), pas de popups, pas de
//   formulaires, aucune permission (caméra, micro, géolocalisation...) ;
// - une adresse http(s) (text/uri-list) est montée en iframe distincte, avec allow-same-origin
//   (origine du site tiers, pas la nôtre) pour qu'elle garde ses propres cookies ;
// - la taille est bornée (lib/mcpUi.ts), un widget ne peut pas déborder du fil ;
// - ce qu'il demande (lien, taille) passe par traiterMessageWidget, tout le reste est refusé.
// Le texte de repli de l'outil reste affiché si le widget ne charge pas, avec un bouton Réessayer.

const TEXTES = {
  fr: {
    titre: "Widget interactif",
    echec: "Le widget n'a pas pu s'afficher.",
    reessayer: "Réessayer",
    ouvrir: "Ouvrir le widget",
  },
  en: {
    titre: "Interactive widget",
    echec: "The widget could not be displayed.",
    reessayer: "Try again",
    ouvrir: "Open the widget",
  },
} as const;

function estPlateformeNative(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

function UnWidget({ ressource, texteRepli }: { ressource: RessourceUi; texteRepli?: string }) {
  const locale = useLocale();
  const { resolu: theme } = useTheme();
  const t = TEXTES[locale];
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [tentative, setTentative] = useState(0);
  const [charge, setCharge] = useState(false);
  const [echec, setEchec] = useState(false);
  const [hauteur, setHauteur] = useState<number>(CONFIG_MCP_UI.hauteurInitialePx);
  const [natif, setNatif] = useState(false);

  useEffect(() => setNatif(estPlateformeNative()), []);

  // Une adresse tierce sur natif (WebView Capacitor, appli PC) dépend de la CSP et des domaines
  // autorisés de chaque cible : plutôt qu'une iframe vide, on propose le lien (aperçu interne).
  const degradeNatif = natif && ressource.genre === "url";

  const contexte: ContexteWidget = { theme, locale, donnees: ressource.donnees };
  const contexteRef = useRef(contexte);
  contexteRef.current = contexte;

  const envoyer = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, "*");
  }, []);

  useEffect(() => {
    const surMessage = (evenement: MessageEvent) => {
      // Origine opaque : on identifie l'émetteur par sa fenêtre, jamais par event.origin.
      if (!iframeRef.current || evenement.source !== iframeRef.current.contentWindow) return;
      for (const action of traiterMessageWidget(evenement.data, contexteRef.current)) {
        if (action.type === "taille") setHauteur(action.hauteur);
        else if (action.type === "lien") traiterLienSortant(action.url);
        else envoyer(action.message);
      }
      setCharge(true);
    };
    window.addEventListener("message", surMessage);
    return () => window.removeEventListener("message", surMessage);
  }, [envoyer, tentative]);

  // Changement de thème poussé au widget sans le recharger.
  useEffect(() => {
    if (charge) envoyer(notificationTheme({ theme, locale }));
  }, [theme, locale, charge, envoyer]);

  // Sans signe de vie dans le délai : repli texte, jamais un cadre vide indéfiniment.
  useEffect(() => {
    if (charge || echec || degradeNatif) return;
    const minuteur = window.setTimeout(() => setEchec(true), CONFIG_MCP_UI.delaiChargementMs);
    return () => window.clearTimeout(minuteur);
  }, [charge, echec, degradeNatif, tentative]);

  const reessayer = () => {
    setCharge(false);
    setEchec(false);
    setHauteur(CONFIG_MCP_UI.hauteurInitialePx);
    setTentative((n) => n + 1);
  };

  if (echec || degradeNatif) {
    return (
      <div className="my-1.5 flex w-full max-w-[85%] flex-col gap-2 rounded-xl border border-dj-bordure bg-dj-surface p-3 animate-dj-fade-in">
        <p className="text-[13px] text-dj-texte-muet">{degradeNatif ? t.titre : t.echec}</p>
        {texteRepli ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-relaxed text-dj-texte-muet">{texteRepli}</pre>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {!degradeNatif && (
            <button
              type="button"
              onClick={reessayer}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1 text-[12px] text-dj-texte transition-colors hover:bg-dj-surface-haute"
            >
              <RotateCw size={12} />
              {t.reessayer}
            </button>
          )}
          {ressource.genre === "url" && (
            <button
              type="button"
              onClick={() => traiterLienSortant(ressource.contenu)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dj-bordure px-2.5 py-1 text-[12px] text-dj-texte transition-colors hover:bg-dj-surface-haute"
            >
              <ExternalLink size={12} />
              {t.ouvrir}
            </button>
          )}
        </div>
      </div>
    );
  }

  const proprietes =
    ressource.genre === "html"
      ? { srcDoc: ressource.contenu, sandbox: "allow-scripts" }
      : { src: ressource.contenu, sandbox: "allow-scripts allow-same-origin" };

  return (
    <div
      className="relative my-1.5 w-full max-w-[85%] overflow-hidden rounded-xl border border-dj-bordure bg-dj-surface transition-[height] duration-300 ease-out animate-dj-fade-in"
      style={{ height: hauteur }}
    >
      {/* Skeleton de la même taille que le widget, qui s'efface en fondu à l'arrivée du contenu. */}
      <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${charge ? "opacity-0" : "opacity-100"}`}>
        <Skeleton className="h-full w-full" />
      </div>
      <iframe
        key={tentative}
        ref={iframeRef}
        title={t.titre}
        {...proprietes}
        referrerPolicy="no-referrer"
        onLoad={() => setCharge(true)}
        className={`h-full w-full border-0 transition-opacity duration-300 ${charge ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

export function WidgetsMcpUi({ ressources, texteRepli }: { ressources?: RessourceUi[]; texteRepli?: string }) {
  if (!ressources || ressources.length === 0) return null;
  return (
    <>
      {ressources.map((r) => (
        <UnWidget key={r.uri} ressource={r} texteRepli={texteRepli} />
      ))}
    </>
  );
}
