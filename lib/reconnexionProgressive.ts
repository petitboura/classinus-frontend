// Delai de reconnexion progressif des WebSockets (24/09/2026).
// Avant : reconnexion toutes les 3 secondes, sans fin. Quand le serveur
// refusait la connexion (jeton expire, coupure reseau), l'appli
// martelait le serveur en rafale. Maintenant : 3 s, 6 s, 12 s, puis
// jusqu'a 60 s au maximum, avec un peu d'aleatoire pour que plusieurs
// appareils ne reviennent pas tous en meme temps. Le compteur ne
// repart de zero que si la connexion est restee ouverte assez longtemps
// pour etre consideree comme stable.

const DELAI_INITIAL_MS = 3000;
const DELAI_MAX_MS = 60000;
const DUREE_STABLE_MS = 10000;

export function creerReconnexionProgressive() {
  let echecs = 0;
  let minuteurStable: ReturnType<typeof setTimeout> | null = null;

  function arreterMinuteurStable() {
    if (minuteurStable) {
      clearTimeout(minuteurStable);
      minuteurStable = null;
    }
  }

  return {
    /** A appeler a l'ouverture : la connexion compte comme stable si elle tient assez longtemps. */
    ouverte() {
      arreterMinuteurStable();
      minuteurStable = setTimeout(() => {
        echecs = 0;
        minuteurStable = null;
      }, DUREE_STABLE_MS);
    },
    /** A appeler a chaque fermeture NON voulue. */
    fermeeSansLeVouloir() {
      arreterMinuteurStable();
      echecs += 1;
    },
    /** Delai avant la prochaine tentative. */
    delai(): number {
      const base = Math.min(DELAI_INITIAL_MS * 2 ** Math.max(echecs - 1, 0), DELAI_MAX_MS);
      const alea = 0.8 + Math.random() * 0.4;
      return Math.round(base * alea);
    },
  };
}
