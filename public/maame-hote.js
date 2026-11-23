// Maame : pose data-maame sur <html> avant le premier affichage quand la page est servie sur l'adresse de Maame,
// pour que globals.css cache l'écran d'ouverture de Classinus. Le début de l'adresse doit rester identique à
// DEBUT_HOTE_MAAME (lib/maame.ts).
(function () {
  try {
    if (location.hostname.toLowerCase().indexOf("maame.") === 0) {
      document.documentElement.setAttribute("data-maame", "1");
    }
  } catch (e) {}
})();
