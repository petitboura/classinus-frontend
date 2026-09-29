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
})();
