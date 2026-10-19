(function () {
  try {
    var t = localStorage.getItem("clovis-theme");
    if (t === "light" || t === "dark") {
      document.documentElement.dataset.theme = t;
    }
  } catch (e) {}
  try {
    if (location.pathname.indexOf("/agent-superposition") === 0) {
      document.documentElement.dataset.superposition = "1";
    }
  } catch (e) {}
  // 19/10/2026 (decision de Bourama) : l'ecran d'ouverture reste sur le site et
  // sur l'appli mobile, mais pas dans l'appli PC (Electron). Elle est servie par
  // le protocole capacitor-electron:// ; cet attribut permet a globals.css de
  // cacher l'ecran d'ouverture avant le premier affichage, fenetre principale
  // et fenetre de superposition comprises.
  try {
    if (location.protocol === "capacitor-electron:") {
      document.documentElement.dataset.appliPc = "1";
    }
  } catch (e) {}
})();
