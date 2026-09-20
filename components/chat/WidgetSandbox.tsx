"use client";

import { AppWindow } from "lucide-react";
import { BlocExpansible } from "./BlocExpansible";
import { useTheme } from "@/lib/useTheme";

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
      })();
    </script>
    </body></html>`;
}

export function WidgetSandbox({ code }: { code: string }) {
  const { resolu } = useTheme();
  return (
    <BlocExpansible
      titre="Widget interactif"
      icone={AppWindow}
      sousTitre="HTML"
      texteACopier={code}
      contenuEnIframe
      enfant={
        <iframe
          sandbox="allow-scripts allow-forms allow-modals"
          srcDoc={construireDocumentWidget(code, resolu)}
          className="h-96 w-full rounded-lg border border-dj-bordure"
          title="Widget interactif"
        />
      }
    />
  );
}
