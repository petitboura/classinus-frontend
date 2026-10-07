// Code exécuté DANS l'iframe, uniquement quand le document est construit pour
// le rendu vidéo (07/10/2026, demande Bourama). Il donne au serveur
// (classinus-backend, core/rendu_animation_processus.py) de quoi piloter le
// lecteur sans le faire jouer : demander où en est le chargement, la durée,
// puis dessiner l'animation à un instant précis.
//
// S'appuie sur window.__anim, exposé par runtimeAnimation.ts. Le lecteur
// redessine toute la scène à partir du temps seul (voir rendre()), aller(t)
// donne donc exactement la même image que la barre de progression.
//
// Écrit en JS simple (sans backtick ni interpolation) pour tenir dans un
// String.raw.
export const RUNTIME_RENDU_VIDEO = String.raw`
(function () {
  var A = window.__anim;
  function erreurAffichee() {
    var b = document.getElementById('an-erreur');
    return b && b.style.display === 'block' ? b.textContent : '';
  }
  window.__rendu = {
    // chargement, pret ou echec
    etat: function () {
      if (A.etat.pret) { return 'pret'; }
      if (document.body.classList.contains('echec')) { return 'echec'; }
      return 'chargement';
    },
    info: function () { return { duree: A.etat.duree, mode: A.etat.mode, parties: A.etat.parties.length }; },
    // Dessine l'image à l'instant t (en secondes). Renvoie le texte de l'erreur
    // si le code de l'animation en a produit une, sinon une chaîne vide.
    aller: function (t) {
      A.etat.joue = false;
      A.etat.t = Math.min(Math.max(Number(t) || 0, 0), A.etat.duree);
      A.rendre();
      return erreurAffichee();
    }
  };
})();
`;
