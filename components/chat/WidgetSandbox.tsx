"use client";

import { useEffect, useRef, useState } from "react";
import { AppWindow, Loader2 } from "lucide-react";
import { BlocExpansible } from "./BlocExpansible";
import { useTheme } from "@/lib/useTheme";

const HAUTEUR_MIN_WIDGET = 128;
const HAUTEUR_MAX_WIDGET = 1200;

// Bloc ```html ou ```widget du markdown -- le modèle peut générer un
// mini-outil autonome (calculateur, formulaire, mini-jeu) en HTML/CSS/JS
// complet. Se déroule dans le fil au clic (voir BlocExpansible.tsx) --
// plus de panneau latéral ni d'ouverture automatique, retirés à la
// demande de Bourama (2026-07-20) : retour au comportement replié/
// déroulé dans le fil, avec un vrai plein écran (pas de division
// d'écran) pour voir le widget en grand.
//
// CORRECTIF (17/08, v2) -- paramètre `theme` ajouté : ce document tourne
// dans un <iframe srcDoc>, un DOCUMENT SÉPARÉ qui n'hérite d'AUCUNE
// variable CSS de la page parente (contrairement au reste de l'app). Les
// couleurs doivent donc être résolues et injectées en dur ICI, au moment
// de la génération du HTML -- impossible de leur faire suivre var(--dj-...)
// comme ailleurs.
export function construireDocumentWidget(code: string, theme: "clair" | "sombre"): string {
  const t = theme === "clair"
    ? { fond: "#FFFFFF", texte: "#1C1A16", champBg: "#F5F5F2", bordure: "rgba(28,26,22,0.14)", accent: "#B8860B", degrade: "linear-gradient(135deg,#E3B341 0%,#B8860B 55%,#6B5416 100%)" }
    : { fond: "#1A1714", texte: "#F5F0E6", champBg: "#221E18", bordure: "rgba(245,240,230,0.14)", accent: "#E3B341", degrade: "linear-gradient(135deg,#F0C766 0%,#D9A438 55%,#8A6A1F 100%)" };
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>
      html,body{margin:0;padding:12px;background:${t.fond};color:${t.texte};
        font-family:'Work Sans',system-ui,sans-serif;}
      *{box-sizing:border-box;}
      /* Style par défaut pour tout champ/bouton généré sans CSS propre --
         sans ça, un input/button hérite du blanc par défaut du
         navigateur, qui jure avec le reste de l'interface (repéré par
         Bourama sur un widget "solveur d'équations" avec des champs
         blancs au milieu d'une carte sombre). Le modèle peut toujours
         écraser ces règles avec son propre <style>, ceci n'est qu'un
         filet de sécurité. */
      input, select, textarea{
        background:${t.champBg};color:${t.texte};border:1px solid ${t.bordure};
        border-radius:8px;padding:6px 10px;font:inherit;font-size:14px;
      }
      input:focus, select:focus, textarea:focus{
        outline:none;border-color:${t.accent};
      }
      button{
        background:${t.degrade};
        color:#1A0D02;border:none;border-radius:8px;padding:7px 14px;
        font:inherit;font-size:14px;font-weight:600;cursor:pointer;
      }
      button:hover{filter:brightness(1.08);}
      button:active{filter:brightness(0.95);}
      table{border-collapse:collapse;}
      td,th{border:1px solid ${t.bordure};padding:4px 8px;}
      a{color:${t.accent};}
      #dj-erreur-widget{
        display:none;margin-bottom:10px;padding:8px 10px;border-radius:8px;
        background:rgba(220,60,50,0.15);border:1px solid rgba(220,60,50,0.4);
        color:${t.texte};font-size:12px;font-family:monospace;white-space:pre-wrap;
      }
    </style>
    </head><body>
    <div id="dj-erreur-widget"></div>
    ${code}
    <script>
      // Sans ça, un widget qui casse (script.src externe bloqué,
      // erreur de syntaxe, référence à une variable inexistante...)
      // échoue en silence : le clic ne fait rien, aucun indice pour
      // diagnostiquer. Trouvé sur plusieurs widgets réels (2026-07-20)
      // où "rien ne se passe" cachait des causes différentes à chaque
      // fois -- ce bandeau rend l'erreur visible directement.
      (function () {
        var conteneur = document.getElementById('dj-erreur-widget');
        function afficher(texte) {
          conteneur.textContent = 'Erreur dans le widget : ' + texte;
          conteneur.style.display = 'block';
        }
        window.onerror = function (message, source, ligne) {
          afficher(message + (ligne ? ' (ligne ' + ligne + ')' : ''));
        };
        window.addEventListener('unhandledrejection', function (e) {
          afficher(String(e.reason));
        });

        // Mesurer le corps, pas scrollHeight de html : celui-ci reste au
        // moins aussi haut que l'iframe et empêcherait tout rétrécissement.
        var derniereHauteur = 0;
        var mesurePlanifiee = false;
        function envoyerHauteur() {
          mesurePlanifiee = false;
          var style = getComputedStyle(document.documentElement);
          var hauteur = Math.ceil(Math.max(document.body.offsetHeight, document.body.scrollHeight)
            + (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0));
          if (hauteur === derniereHauteur) return;
          derniereHauteur = hauteur;
          window.parent.postMessage({ type: 'dj-widget-hauteur', hauteur: hauteur }, '*');
        }
        function planifierMesure() {
          if (mesurePlanifiee) return;
          mesurePlanifiee = true;
          requestAnimationFrame(envoyerHauteur);
        }
        window.addEventListener('load', planifierMesure);
        window.addEventListener('resize', planifierMesure);
        document.body.addEventListener('load', planifierMesure, true);
        if (window.ResizeObserver) new ResizeObserver(planifierMesure).observe(document.body);
        new MutationObserver(planifierMesure).observe(document.body, {
          subtree: true, childList: true, attributes: true, characterData: true
        });
        planifierMesure();
      })();
    </script>
    </body></html>`;
}

// 23/09/2026, correctif Bourama ("le widget tremble tant que son propre
// code n'est pas fini") : contrairement à QCMInteractif.tsx/
// CarteMessage.tsx/GraphiqueDonnees.tsx/SchemaGeometrique.tsx, ce
// composant construisait et injectait un nouveau `srcDoc` dans l'iframe
// à CHAQUE rendu -- or changer `srcDoc` recharge entièrement le document
// de l'iframe, même sans démontage React. Tant que le bloc ```widget/
// ```html n'était pas fini de streamer, `code` grandissait caractère par
// caractère, donc l'iframe rechargeait à chaque caractère. Même principe
// que les autres blocs riches : on attend 500ms sans changement de
// `code` avant de considérer le widget comme prêt à afficher, avec un
// simple indicateur de chargement entre-temps.
export function WidgetSandbox({ code }: { code: string }) {
  const { resolu } = useTheme();
  const [codeStable, setCodeStable] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    function recevoirHauteur(event: MessageEvent) {
      const iframe = iframeRef.current;
      // Le sandbox a une origine opaque : vérifier la fenêtre émettrice,
      // pas event.origin, pour isoler chaque widget et rejeter les autres.
      if (!iframe || event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (data?.type !== "dj-widget-hauteur" || typeof data.hauteur !== "number"
        || !Number.isFinite(data.hauteur) || data.hauteur <= 0) return;
      // Un contenu en 100vh peut grandir à chaque mesure (+ padding).
      // Le plafond arrête cette boucle ; le défilement natif reste permis.
      // En plein écran, le !h-full de BlocExpansible garde la priorité.
      const hauteur = Math.min(HAUTEUR_MAX_WIDGET, Math.max(HAUTEUR_MIN_WIDGET, Math.ceil(data.hauteur)));
      if (iframe.style.height !== `${hauteur}px`) iframe.style.height = `${hauteur}px`;
    }
    window.addEventListener("message", recevoirHauteur);
    return () => window.removeEventListener("message", recevoirHauteur);
  }, []);

  useEffect(() => {
    setCodeStable(null);
    const delai = setTimeout(() => setCodeStable(code), 500);
    return () => clearTimeout(delai);
  }, [code]);

  return (
    <BlocExpansible
      titre="Widget interactif"
      icone={AppWindow}
      sousTitre="HTML"
      texteACopier={code}
      contenuEnIframe
      chargement={codeStable === null}
      enfant={
        codeStable === null ? (
          <div className="flex min-h-32 w-full items-center justify-center gap-2 text-xs text-dj-texte-muet">
            <Loader2 size={16} className="animate-spin" />
            Préparation du widget...
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={`${resolu}:${codeStable}`}
            sandbox="allow-scripts allow-forms allow-modals"
            srcDoc={construireDocumentWidget(codeStable, resolu)}
            className="block w-full border-0"
            style={{ height: HAUTEUR_MIN_WIDGET }}
            title="Widget interactif"
          />
        )
      }
    />
  );
}
