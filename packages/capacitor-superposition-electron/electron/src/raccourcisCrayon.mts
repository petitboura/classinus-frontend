// Raccourcis clavier du crayon du canal PC (11/10/2026, demande Bourama) : sortir ou
// ranger le crayon, faire réapparaître les traits, les effacer. Ils doivent marcher de
// n'importe où sur le PC, même quand Classinus n'est pas la fenêtre active, donc ce sont
// des raccourcis système.
//
// Module pur (aucune dépendance à Electron) : il reçoit un objet "raccourci" avec
// register et unregister, ce qui permet de le tester partout. Même principe que
// arretGlobal.mts du paquet capacitor-pont-natif-electron.
//
// Ce qu'il garantit :
// 1. Les touches ne sont prises que pendant que le canal en direct est actif. Canal
//    éteint, elles retournent aux autres applications.
// 2. Une touche refusée par le système (déjà prise par une autre application) n'empêche
//    pas les deux autres ; la liste des refus est signalée pour que l'écran n'annonce
//    pas un raccourci qui ne marche pas.
// 3. Les touches ne sont reprises qu'à un vrai changement (canal activé, touches
//    changées), jamais à chaque état poussé par la fenêtre principale.

export type RaccourciSysteme = {
  register(touche: string, rappel: () => void): boolean;
  unregister(touche: string): void;
};

export const ACTIONS_CRAYON = ["basculer", "rappeler", "effacer"] as const;
export type ActionCrayon = (typeof ACTIONS_CRAYON)[number];
export type ToucheParAction = Record<ActionCrayon, string>;

export type OptionsRaccourcisCrayon = {
  // Appelé à chaque appui sur l'un des raccourcis.
  surAction: (action: ActionCrayon) => void;
  // Appelé après chaque prise de touches, avec les actions dont la touche est refusée
  // (liste vide si tout a été accepté).
  surIndisponibles?: (actions: ActionCrayon[]) => void;
};

function touchesValides(valeur: unknown): valeur is ToucheParAction {
  if (typeof valeur !== "object" || valeur === null) return false;
  const v = valeur as Record<string, unknown>;
  const touches = ACTIONS_CRAYON.map((a) => v[a]);
  if (!touches.every((t) => typeof t === "string" && t.trim() !== "")) return false;
  return new Set(touches).size === ACTIONS_CRAYON.length;
}

export function creerRaccourcisCrayon(raccourci: RaccourciSysteme, options: OptionsRaccourcisCrayon) {
  let touches: ToucheParAction | null = null;
  let voulu = false;
  // Touches réellement prises : action -> touche enregistrée.
  const prises = new Map<ActionCrayon, string>();
  let dernierEtatAppliquee = "";

  function liberer(): void {
    for (const touche of prises.values()) {
      try {
        raccourci.unregister(touche);
      } catch {
        // Rien à faire : le système libérera la touche à la fermeture de l'application.
      }
    }
    prises.clear();
  }

  function appliquer(): void {
    const cle = voulu && touches ? JSON.stringify(touches) : "";
    if (cle === dernierEtatAppliquee) return;
    dernierEtatAppliquee = cle;
    liberer();
    if (!voulu || !touches) return;
    const refusees: ActionCrayon[] = [];
    for (const action of ACTIONS_CRAYON) {
      const touche = touches[action];
      let prise = false;
      try {
        prise = raccourci.register(touche, () => options.surAction(action));
      } catch {
        prise = false;
      }
      if (prise) prises.set(action, touche);
      else refusees.push(action);
    }
    options.surIndisponibles?.(refusees);
  }

  return {
    /** Définit les touches (format Electron, ex. "CommandOrControl+Shift+Y"). Refuse un jeu incomplet ou en double. */
    definirTouches(nouvelles: unknown): boolean {
      if (!touchesValides(nouvelles)) return false;
      touches = { basculer: nouvelles.basculer, rappeler: nouvelles.rappeler, effacer: nouvelles.effacer };
      appliquer();
      return true;
    },
    /** Vrai tant que le canal en direct est actif. */
    definirActif(actif: boolean): void {
      voulu = actif;
      appliquer();
    },
    prises: (): ActionCrayon[] => [...prises.keys()],
  };
}
