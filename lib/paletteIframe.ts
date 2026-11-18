// Palette de l'interface pour les contenus qui tournent dans une iframe isolée
// (widget interactif et animation). Une seule source pour les deux : une iframe
// n'hérite d'aucune variable CSS de la page, les couleurs sont donc résolues ici
// puis injectées dans le document (variables --dj-* et objet THEME pour le
// widget, objet C pour l'animation). Le modèle n'écrit jamais de couleur, de
// fond ni de police : il utilise ces variables, et un changement de thème est
// poussé dans l'iframe sans la recharger (voir scriptThemeWidget).
export type ThemeIframe = "clair" | "sombre";

export type Palette = {
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

export const PALETTES: Record<"clair" | "sombre", Palette> = {
  clair: {
    fond: "#FFFFFF",
    surface: "#F5F5F5",
    texte: "#000000",
    muet: "rgba(0,0,0,0.6)",
    bordure: "rgba(0,0,0,0.14)",
    accent: "#000000",
    degrade: "linear-gradient(135deg,#333333 0%,#1A1A1A 55%,#000000 100%)",
    surAccent: "#FFFFFF",
    a: "#000000",
    b: "#555555",
    c: "#888888",
    d: "#BBBBBB",
  },
  sombre: {
    fond: "#000000",
    surface: "#0D0D0D",
    texte: "#FFFFFF",
    muet: "rgba(255,255,255,0.62)",
    bordure: "rgba(255,255,255,0.14)",
    accent: "#FFFFFF",
    degrade: "linear-gradient(135deg,#FFFFFF 0%,#E6E6E6 55%,#BFBFBF 100%)",
    surAccent: "#000000",
    a: "#FFFFFF",
    b: "#BFBFBF",
    c: "#8C8C8C",
    d: "#5C5C5C",
  },
};

// Type du message que la page envoie au widget quand le thème change.
export const TYPE_MESSAGE_THEME_WIDGET = "dj-widget-theme";

// Un texte injecté dans un <script> ne doit jamais pouvoir le refermer.
function neutraliserScript(texte: string): string {
  return texte.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
}

// surAccent devient --dj-sur-accent, les autres gardent leur nom (--dj-fond...).
function nomVariable(cle: string): string {
  return "--dj-" + cle.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
}

// Déclarations CSS des variables, à poser dans :root.
export function variablesCss(p: Palette): string {
  return (Object.keys(p) as (keyof Palette)[]).map((cle) => `${nomVariable(cle)}:${p[cle]};`).join("");
}

// Script injecté dans le document du widget, AVANT le code du modèle : définit
// window.THEME (les mêmes couleurs que les variables, pour le canvas et le
// JavaScript) et écoute les changements de thème venant de la page. À chaque
// changement, les variables CSS et THEME sont mises à jour sur place, puis
// l'événement "dj-theme" est émis pour qu'un widget qui dessine dans un canvas
// puisse se redessiner. Seul le parent est écouté, et seules les clés connues
// sont lues, avec des valeurs texte.
export function scriptThemeWidget(p: Palette): string {
  const cles = JSON.stringify(Object.keys(p));
  return `
(function () {
  var TYPE = '${TYPE_MESSAGE_THEME_WIDGET}';
  var CLES = ${cles};
  var THEME = ${neutraliserScript(JSON.stringify(p))};
  window.THEME = THEME;
  function nom(cle) { return '--dj-' + cle.replace(/[A-Z]/g, function (m) { return '-' + m.toLowerCase(); }); }
  window.addEventListener('message', function (e) {
    if (e.source !== parent) return;
    var d = e.data;
    if (!d || d.type !== TYPE || !d.palette) return;
    for (var i = 0; i < CLES.length; i++) {
      var v = d.palette[CLES[i]];
      if (typeof v !== 'string') continue;
      THEME[CLES[i]] = v;
      document.documentElement.style.setProperty(nom(CLES[i]), v);
    }
    window.dispatchEvent(new Event('dj-theme'));
  });
})();
`;
}
