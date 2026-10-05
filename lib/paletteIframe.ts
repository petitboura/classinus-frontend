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
