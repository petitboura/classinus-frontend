(function () {
  try {
    var el = document.getElementById("clovis-splash");
    if (!el) return;
    var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var DUREE_MIN = reduit ? 0 : 3900;
    var pret = false, tempsEcoule = false, parti = false;
    function partir() {
      if (parti) return;
      parti = true;
      el.classList.add("clovis-splash-sortie");
      el.addEventListener("transitionend", function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, { once: true });
    }
    function tenter() {
      if (pret && tempsEcoule) partir();
    }
    document.addEventListener("clovis:pret", function () {
      pret = true;
      tenter();
    }, { once: true });
    setTimeout(function () {
      tempsEcoule = true;
      tenter();
    }, DUREE_MIN);
    setTimeout(partir, 6000);
  } catch (e) {}
})();
