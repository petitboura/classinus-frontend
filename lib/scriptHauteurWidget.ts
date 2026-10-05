// Script injecté dans le document du widget (iframe isolé) pour dire au
// parent quelle hauteur prend son contenu. Le parent (voir
// lib/useHauteurWidget.ts) adapte alors la hauteur du cadre.
//
// Pourquoi ne pas mesurer seulement la hauteur de <body> : un widget dont le
// contenu est posé en position absolue (jeu dessiné dans un canevas, schéma
// superposé) laisse le corps presque vide, soit environ 24 px de rembourrage,
// et le cadre se réduirait à rien. On prend donc le plus grand de ces deux
// chiffres : le bas du corps, et le bas de l'élément le plus bas de la page.
// Les éléments en position fixe sont ignorés, car leur place dépend de la
// hauteur du cadre lui même et ils feraient grandir le cadre sans fin.
//
// Les mesures sont espacées d'au moins DELAI_MESURE_MS pour ne pas coûter
// cher à un widget qui modifie sa page à chaque image (mini jeu, animation),
// et la lecture s'arrête à MAX_ELEMENTS éléments.

export const TYPE_MESSAGE_HAUTEUR_WIDGET = "dj-widget-hauteur";

const DELAI_MESURE_MS = 250;
const MAX_ELEMENTS_MESURES = 3000;

export const SCRIPT_HAUTEUR_WIDGET = `
(function () {
  var TYPE = '${TYPE_MESSAGE_HAUTEUR_WIDGET}';
  var DELAI = ${DELAI_MESURE_MS};
  var MAX_ELEMENTS = ${MAX_ELEMENTS_MESURES};
  var IGNORES = { SCRIPT: 1, STYLE: 1, LINK: 1, META: 1, TITLE: 1, HEAD: 1 };
  var derniere = -1;
  var minuteur = null;

  function mesurer() {
    var corps = document.body;
    if (!corps) return 0;
    var decalage = window.pageYOffset || 0;
    var basCorps = corps.getBoundingClientRect().bottom + decalage;
    var rembourrageBasCorps = parseFloat(window.getComputedStyle(corps).paddingBottom) || 0;
    var rembourrageBasPage = parseFloat(window.getComputedStyle(document.documentElement).paddingBottom) || 0;
    var liste = corps.getElementsByTagName('*');
    var total = Math.min(liste.length, MAX_ELEMENTS);
    var fixes = [];
    var bas = 0;
    for (var i = 0; i < total; i++) {
      var el = liste[i];
      if (IGNORES[el.tagName]) continue;
      var dansUnFixe = false;
      for (var j = 0; j < fixes.length; j++) {
        if (fixes[j].contains(el)) { dansUnFixe = true; break; }
      }
      if (dansUnFixe) continue;
      var style = window.getComputedStyle(el);
      if (style.display === 'none') continue;
      if (style.position === 'fixed') { fixes.push(el); continue; }
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      var b = rect.bottom + decalage;
      if (b > bas) bas = b;
    }
    // Le bas du corps, ou le bas de l'élément le plus bas plus le rembourrage
    // du corps, puis le rembourrage de la page (la feuille de style du widget
    // en met aussi sur <html>) : sans lui il resterait un petit défilement.
    return Math.ceil(Math.max(basCorps, bas + rembourrageBasCorps) + rembourrageBasPage);
  }

  function envoyer() {
    minuteur = null;
    var h = mesurer();
    if (h === derniere) return;
    derniere = h;
    parent.postMessage({ type: TYPE, hauteur: h }, '*');
  }

  function planifier() {
    if (minuteur !== null) return;
    minuteur = setTimeout(envoyer, DELAI);
  }

  if (window.ResizeObserver) new ResizeObserver(planifier).observe(document.body);
  if (window.MutationObserver) {
    new MutationObserver(planifier).observe(document.body, {
      childList: true, subtree: true, attributes: true, characterData: true
    });
  }
  window.addEventListener('load', planifier);
  window.addEventListener('resize', planifier);
  envoyer();
})();
`;
