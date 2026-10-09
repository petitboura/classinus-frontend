// Arrêt global du canal PC (08/10/2026, garde-fou 1, demande de Bourama) : un raccourci
// système, Échap, qui arrête Clovis de n'importe où, même quand la superposition ne
// répond plus ou n'a pas le focus.
//
// Ce module est pur (aucune dépendance à Electron ni à Windows) : il reçoit un objet
// "raccourci" avec register et unregister, ce qui permet de le tester partout. Même
// principe que gardeClavier.mts.
//
// Ce qu'il garantit :
// 1. Le raccourci n'est pris que pendant qu'une tâche tourne (armer au début, désarmer à
//    la fin). Le reste du temps, Échap fonctionne normalement dans toutes les applications.
// 2. Un appui sur le raccourci note qu'un arrêt est demandé. Les actions en cours
//    (frappe, raccourcis clavier) le consultent et s'arrêtent d'elles-mêmes.
// 3. La demande d'arrêt n'est effacée qu'au début de la tâche suivante (armer), jamais à
//    la fin de celle-ci : une frappe encore en cours a le temps de la voir.
// 4. Filet de sécurité : si personne ne désarme (fenêtre plantée, tâche perdue), le
//    raccourci est rendu au système après un délai, pour ne jamais bloquer Échap
//    durablement. Chaque action en cours repousse ce délai.

export type RaccourciSysteme = {
  register(touche: string, rappel: () => void): boolean;
  unregister(touche: string): void;
};

export type OptionsArretGlobal = {
  // Appelé à chaque appui sur le raccourci.
  surArret: () => void;
  touche?: string;
  delaiSecuriteMs?: number;
};

export const TOUCHE_ARRET_GLOBAL_PAR_DEFAUT = "Escape";
// Valeur large, pas une limite produit tranchée avec Bourama : une tâche normale dure
// bien moins, et chaque action repousse ce délai.
export const DELAI_SECURITE_ARRET_GLOBAL_PAR_DEFAUT_MS = 15 * 60 * 1000;

export function creerArretGlobal(raccourci: RaccourciSysteme, options: OptionsArretGlobal) {
  const touche = options.touche ?? TOUCHE_ARRET_GLOBAL_PAR_DEFAUT;
  const delaiSecuriteMs = options.delaiSecuriteMs ?? DELAI_SECURITE_ARRET_GLOBAL_PAR_DEFAUT_MS;

  let arme = false;
  let demande = false;
  let securite: ReturnType<typeof setTimeout> | null = null;

  function annulerSecurite(): void {
    if (securite) {
      clearTimeout(securite);
      securite = null;
    }
  }

  function programmerSecurite(): void {
    annulerSecurite();
    securite = setTimeout(() => {
      securite = null;
      desarmer();
    }, delaiSecuriteMs);
    // Ce minuteur ne doit jamais empêcher l'application de se fermer.
    (securite as { unref?: () => void }).unref?.();
  }

  function surAppui(): void {
    demande = true;
    options.surArret();
  }

  // Début d'une tâche : efface l'arrêt précédent et prend le raccourci.
  // Renvoie false si le système refuse le raccourci (déjà pris par une autre application).
  function armer(): boolean {
    demande = false;
    if (!arme) {
      try {
        arme = raccourci.register(touche, surAppui);
      } catch {
        arme = false;
      }
    }
    if (arme) programmerSecurite();
    return arme;
  }

  // Fin d'une tâche : rend le raccourci au système. La demande d'arrêt est conservée
  // exprès (voir garantie 3).
  function desarmer(): void {
    annulerSecurite();
    if (!arme) return;
    arme = false;
    try {
      raccourci.unregister(touche);
    } catch {
      // Rien à faire : le système libérera le raccourci à la fermeture de l'application.
    }
  }

  // À appeler au début de chaque action : une tâche active repousse le filet de sécurité.
  function signalerActivite(): void {
    if (arme) programmerSecurite();
  }

  return {
    armer,
    desarmer,
    signalerActivite,
    arretDemande: () => demande,
    estArme: () => arme,
  };
}
