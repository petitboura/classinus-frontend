import type { TextesAnimation } from "@/lib/textesAnimation";
import { RUNTIME_ANIMATION } from "./runtimeAnimation";

// Document HTML complet du lecteur d'animation guidée, injecté dans une
// <iframe srcDoc> (29/09/2026, demande Bourama). Comme pour les widgets
// (voir WidgetSandbox.tsx), ce document est séparé de la page : il
// n'hérite d'aucune variable CSS de l'application, les couleurs sont donc
// résolues ici, au moment de la génération. Mêmes valeurs de base que
// construireDocumentWidget pour rester cohérent avec l'identité visuelle,
// avec quelques couleurs d'appoint (a, b, c, d) que le modèle peut
// utiliser pour mettre un élément en valeur.
//
// Le lecteur (boutons, barre de progression, barre d'espace, et si le
// modèle en donne : titres cliquables et légende) est écrit une fois pour
// toutes ici et dans runtimeAnimation.ts : le modèle n'écrit que le
// contenu de l'animation.
type Palette = {
  fond: string;
  surface: string;
  texte: string;
  muet: string;
  bordure: string;
  accent: string;
  degrade: string;
  surAccent: string;
  a: string;
  b: string;
  c: string;
  d: string;
};

const PALETTES: Record<"clair" | "sombre", Palette> = {
  clair: {
    fond: "#FFFFFF",
    surface: "#F5F5F2",
    texte: "#1C1A16",
    muet: "rgba(28,26,22,0.6)",
    bordure: "rgba(28,26,22,0.14)",
    accent: "#B8860B",
    degrade: "linear-gradient(135deg,#E3B341 0%,#B8860B 55%,#6B5416 100%)",
    surAccent: "#1A0D02",
    a: "#0F8F7F",
    b: "#7A5FD0",
    c: "#D4552F",
    d: "#3E9B4F",
  },
  sombre: {
    fond: "#1A1714",
    surface: "#221E18",
    texte: "#F5F0E6",
    muet: "rgba(245,240,230,0.62)",
    bordure: "rgba(245,240,230,0.14)",
    accent: "#E3B341",
    degrade: "linear-gradient(135deg,#F0C766 0%,#D9A438 55%,#8A6A1F 100%)",
    surAccent: "#1A0D02",
    a: "#3CC8B4",
    b: "#A995F0",
    c: "#F0805E",
    d: "#6FCB7C",
  },
};

// Three.js r128, la même version que celle vérifiée dans un widget réel
// le 29/09/2026 (test de Bourama). Deuxième source en secours si la
// première ne répond pas.
const SOURCES_TROIS_D = [
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js",
];

// Un texte injecté dans un <script> ne doit jamais pouvoir le refermer.
function neutraliserScript(texte: string): string {
  return texte.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
}

const ICONE_LECTURE = '<svg class="ic-lecture" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
const ICONE_PAUSE = '<svg class="ic-pause" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>';
const ICONE_RECOMMENCER = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function construireDocumentAnimation(
  code: string,
  theme: "clair" | "sombre",
  textes: TextesAnimation,
): string {
  const p = PALETTES[theme];
  const conf = neutraliserScript(
    JSON.stringify({
      textes,
      palette: { fond: p.fond, fond2: p.surface, surface: p.surface, texte: p.texte, muet: p.muet, bordure: p.bordure, accent: p.accent, a: p.a, b: p.b, c: p.c, d: p.d },
      sourcesTroisD: SOURCES_TROIS_D,
    }),
  );

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
html,body{margin:0;height:100%;background:transparent;color:${p.texte};font-family:'Work Sans',system-ui,sans-serif;}
*{box-sizing:border-box;}
body{-webkit-tap-highlight-color:transparent;}
#an-cadre{display:flex;flex-direction:column;height:100%;padding:0;gap:8px;}
#an-zone{position:relative;flex:1;min-height:0;border:1px solid ${p.bordure};border-radius:12px;overflow:hidden;background:${p.surface};cursor:pointer;}
#an-zone svg{display:block;width:100%;height:100%;font-family:inherit;}
#an-squelette{position:absolute;inset:0;background-image:linear-gradient(100deg,transparent 30%,${p.bordure} 50%,transparent 70%);background-size:250% 100%;animation:an-balayage 1.4s linear infinite;transition:opacity .3s ease;}
#an-squelette.fini{opacity:0;pointer-events:none;animation:none;}
@keyframes an-balayage{from{background-position:150% 0}to{background-position:-150% 0}}
#an-voile{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;opacity:0;transition:opacity .25s ease;}
#an-voile.visible{opacity:1;}
#an-voile span{display:flex;align-items:center;justify-content:center;width:60px;height:60px;border-radius:50%;background:${p.degrade};color:${p.surAccent};}
#an-erreur{display:none;padding:8px 10px;border-radius:8px;background:rgba(220,60,50,0.15);border:1px solid rgba(220,60,50,0.4);color:${p.texte};font-size:12px;font-family:monospace;white-space:pre-wrap;}
#an-legende{margin:0;min-height:2.8em;font-size:14px;line-height:1.5;color:${p.texte};}
#an-legende.maj{animation:an-apparition .35s ease;}
@keyframes an-apparition{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
#an-barre{display:flex;align-items:center;gap:8px;}
#an-barre button{display:flex;align-items:center;justify-content:center;flex:none;width:40px;height:40px;padding:0;border-radius:50%;cursor:pointer;font:inherit;transition:filter .15s ease,transform .1s ease;}
#an-barre button:active{transform:scale(0.96);}
#an-jouer{background:${p.degrade};color:${p.surAccent};border:none;}
#an-jouer:hover{filter:brightness(1.08);}
#an-recom{background:transparent;color:${p.texte};border:1px solid ${p.bordure};}
#an-recom:hover{border-color:${p.accent};}
#an-jouer .ic-pause{display:none;}
body.joue #an-jouer .ic-pause{display:block;}
body.joue #an-jouer .ic-lecture{display:none;}
#an-pos{--pos:0%;flex:1;min-width:0;height:6px;margin:0;border-radius:3px;-webkit-appearance:none;appearance:none;background:linear-gradient(to right,${p.accent} var(--pos),${p.bordure} var(--pos));cursor:pointer;}
#an-pos::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:${p.accent};border:2px solid ${p.fond};}
#an-pos::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:${p.accent};border:2px solid ${p.fond};}
#an-pos::-moz-range-track{background:transparent;}
#an-temps{flex:none;min-width:68px;text-align:right;font-size:12.5px;color:${p.muet};font-variant-numeric:tabular-nums;}
#an-chap{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px;scrollbar-width:thin;}
#an-chap button{flex:none;font:inherit;font-size:12.5px;padding:6px 11px;border-radius:999px;border:1px solid ${p.bordure};background:transparent;color:${p.texte};cursor:pointer;transition:background .2s ease,border-color .2s ease;}
#an-chap button:hover{border-color:${p.accent};}
body.sans-chapitres #an-chap,body.sans-legende #an-legende{display:none;}
body.echec #an-barre,body.echec #an-chap{opacity:.4;pointer-events:none;}
#an-chap button.actif{border-color:${p.accent};background:${p.bordure};}
</style></head><body>
<div id="an-cadre">
<div id="an-zone"><div id="an-squelette"></div><div id="an-voile"><span>${ICONE_LECTURE}</span></div></div>
<div id="an-erreur" role="alert"></div>
<p id="an-legende" aria-live="polite"></p>
<div id="an-barre">
<button id="an-jouer" type="button" aria-label="${textes.lecture}">${ICONE_LECTURE}${ICONE_PAUSE}</button>
<button id="an-recom" type="button" aria-label="${textes.recommencer}">${ICONE_RECOMMENCER}</button>
<input id="an-pos" type="range" min="0" max="1000" step="1" value="0" aria-label="${textes.position}">
<span id="an-temps">0:00 / 0:00</span>
</div>
<div id="an-chap" role="group"></div>
</div>
<script>window.__ANIM_CONF=${conf};</script>
<script>${RUNTIME_ANIMATION}</script>
<script>${neutraliserScript(code)}</script>
<script>if(window.__animDemarrer){window.__animDemarrer();}</script>
</body></html>`;
}
