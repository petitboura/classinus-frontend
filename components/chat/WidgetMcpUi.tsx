"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/Skeleton";
import { useLocale } from "@/lib/i18n/useLocale";
import { useTheme } from "@/lib/useTheme";
import { traiterLienSortant } from "@/lib/liensSortants";
import { appelerOutilDeWidget } from "@/lib/api";
import { ConfirmationOutil } from "@/components/chat/ConfirmationOutil";
import {
  CONFIG_MCP_UI,
  notificationTheme,
  reponseAppelOutil,
  traiterMessageWidget,
  type ActionWidget,
  type ContexteWidget,
  type RessourceUi,
} from "@/lib/mcpUi";

type ActionAppelOutil = Extract<ActionWidget, { type: "appel_outil" }>;
type Attente = { action: ActionAppelOutil; nomLisible: string; cle: string };

// Widget MCP-UI (04/11/2026) : affiche dans le fil la ressource ui:// renvoyée par un outil MCP
// (Higgsfield et tout serveur compatible). Le contenu est du CODE TIERS NON FIABLE :
// - iframe sandbox="allow-scripts" SANS allow-same-origin pour le HTML : le widget vit dans une
//   origine opaque, sans accès aux cookies, au localStorage, au DOM ni à la session de Classinus ;
// - jamais de navigation de la page parente (pas d'allow-top-navigation), pas de popups, pas de
//   formulaires, aucune permission (caméra, micro, géolocalisation...) ;
// - une adresse http(s) (text/uri-list) est montée en iframe distincte, avec allow-same-origin
//   (origine du site tiers, pas la nôtre) pour qu'elle garde ses propres cookies ;
// - la taille est bornée (lib/mcpUi.ts), un widget ne peut pas déborder du fil ;
// - ce qu'il demande (lien, taille, appel d'outil) passe par traiterMessageWidget, tout le reste est
//   refusé ;
// - un appel d'outil (08/11/2026) n'est jamais exécuté par le widget : il est relayé au backend
//   (appelerOutilDeWidget), qui n'autorise que les outils du serveur qui a affiché ce widget et exige la
//   confirmation de la personne pour toute action qui modifie ou qui coûte, avec la même carte que le chat.
// Le texte de repli de l'outil reste affiché si le widget ne charge pas, avec un bouton Réessayer.

const TEXTES = {
  fr: {
    titre: "Widget interactif",
    echec: "Le widget n'a pas pu s'afficher.",
    reessayer: "Réessayer",
    ouvrir: "Ouvrir le widget",
    indisponible: "Ce widget ne peut plus appeler d'outil. Redemande-le dans le chat.",
    refuse: "Action refusée par l'utilisateur.",
    echecAppel: "L'action du widget a échoué.",
  },
  en: {
    titre: "Interactive widget",
    echec: "The widget could not be displayed.",
    reessayer: "Try again",
    ouvrir: "Open the widget",
    indisponible: "This widget can no longer call tools. Ask for it again in the chat.",
    refuse: "Action declined by the user.",
    echecAppel: "The widget action failed.",
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

  const [attentes, setAttentes] = useState<Attente[]>([]);
  const [confirmationEnCours, setConfirmationEnCours] = useState(false);

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

  // Appel d'outil relayé : la réponse part vers le widget quand le backend a répondu, ou après la
  // décision de la personne si l'action demande confirmation.
  const lancerAppel = useCallback(
    async (action: ActionAppelOutil, approuve = false, toujoursAutoriser = false) => {
      const repondre = (texte: string, estErreur: boolean) => envoyer(reponseAppelOutil(action, { texte, estErreur }));
      const source = ressource.outil_source;
      if (!source) return repondre(t.indisponible, true);
      try {
        const reponse = await appelerOutilDeWidget({
          outil_source: source,
          nom_outil: action.nom,
          arguments: action.arguments,
          approuve,
          toujours_autoriser: toujoursAutoriser,
        });
        if (reponse.statut === "confirmation_requise") {
          setAttentes((liste) => [...liste, { action, nomLisible: reponse.nom_lisible, cle: reponse.cle }]);
          return;
        }
        repondre(reponse.contenu.map((c) => c.text).join("\n"), reponse.est_erreur);
      } catch (e) {
        repondre(e instanceof Error && e.message ? e.message : t.echecAppel, true);
      }
    },
    [envoyer, ressource.outil_source, t],
  );
  const lancerAppelRef = useRef(lancerAppel);
  lancerAppelRef.current = lancerAppel;

  const trancher = async (attente: Attente, approuve: boolean, toujoursAutoriser = false) => {
    setConfirmationEnCours(true);
    if (approuve) await lancerAppel(attente.action, true, toujoursAutoriser);
    else envoyer(reponseAppelOutil(attente.action, { texte: t.refuse, estErreur: true }));
    setAttentes((liste) => liste.filter((a) => a !== attente));
    setConfirmationEnCours(false);
  };

  useEffect(() => {
    const surMessage = (evenement: MessageEvent) => {
      // Origine opaque : on identifie l'émetteur par sa fenêtre, jamais par event.origin.
      if (!iframeRef.current || evenement.source !== iframeRef.current.contentWindow) return;
      for (const action of traiterMessageWidget(evenement.data, contexteRef.current)) {
        if (action.type === "taille") setHauteur(action.hauteur);
        else if (action.type === "lien") traiterLienSortant(action.url);
        else if (action.type === "appel_outil") void lancerAppelRef.current(action);
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
    setAttentes([]);
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
    <>
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
    {attentes[0] && (
      <ConfirmationOutil
        nomLisible={attentes[0].nomLisible}
        nomOutil={attentes[0].cle}
        arguments={attentes[0].action.arguments}
        enAttente={confirmationEnCours}
        onConfirmer={() => void trancher(attentes[0], true)}
        onToujoursAutoriser={() => void trancher(attentes[0], true, true)}
        onAnnuler={() => void trancher(attentes[0], false)}
      />
    )}
    </>
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
