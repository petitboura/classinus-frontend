// Garde du clavier (07/10/2026, bug signalé par Bourama : après certains raccourcis
// de l'outil appuyer_touches, Ctrl, Alt ou Maj restent enfoncés côté système et le
// clavier de l'étudiant est bloqué jusqu'au redémarrage).
//
// Ce module est pur (aucune dépendance à nut-js, à Electron ni à Windows) : il reçoit
// un objet clavier avec pressKey et releaseKey, ce qui permet de le tester partout.
//
// Ce qu'il garantit :
// 1. Chaque touche est enfoncée une par une et notée dès qu'elle est enfoncée. Si une
//    erreur survient en plein milieu d'un raccourci, on sait exactement lesquelles
//    relâcher (avant, une erreur pendant l'appui laissait une partie des touches
//    inconnue).
// 2. Chaque touche est relâchée séparément : l'échec du relâchement d'une touche
//    n'empêche plus de relâcher les autres (avant, une seule erreur arrêtait tout et
//    laissait les modificateurs suivants enfoncés). Nouvel essai en cas d'échec.
// 3. Une seule action clavier à la fois : deux raccourcis ou un texte tapé en même
//    temps ne peuvent plus s'entremêler.
// 4. relacherTout() relâche tout ce qui est encore noté enfoncé. À appeler à la
//    fermeture de l'appli, à la perte de connexion et avant chaque nouvelle action.
// 5. Un appui ou un relâchement qui ne répond jamais est abandonné après un délai, et
//    le relâchement est tenté quand même.

export type ClavierMinimal = {
  pressKey(...touches: number[]): Promise<unknown>;
  releaseKey(...touches: number[]): Promise<unknown>;
};

export type OptionsGarde = {
  delaiOperationMs?: number;
  essaisRelachement?: number;
  pauseMs?: number;
};

export type ResultatCombinaison = { ok: true } | { ok: false; erreur: string; touchesPeutEtreEnfoncees: number[] };

const DELAI_OPERATION_PAR_DEFAUT_MS = 3000;
const ESSAIS_RELACHEMENT_PAR_DEFAUT = 3;

function avecDelai<T>(promesse: Promise<T>, delaiMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const minuteur = setTimeout(() => reject(new Error("le système n'a pas répondu à temps")), delaiMs);
    promesse.then(
      (valeur) => { clearTimeout(minuteur); resolve(valeur); },
      (erreur) => { clearTimeout(minuteur); reject(erreur); },
    );
  });
}

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function creerGardeClavier(clavier: ClavierMinimal, options: OptionsGarde = {}) {
  const delaiOperationMs = options.delaiOperationMs ?? DELAI_OPERATION_PAR_DEFAUT_MS;
  const essais = Math.max(1, options.essaisRelachement ?? ESSAIS_RELACHEMENT_PAR_DEFAUT);
  const pauseMs = options.pauseMs ?? 0;

  // Touches que l'on a enfoncées et dont le relâchement n'est pas confirmé.
  const enfoncees = new Set<number>();
  let fileAttente: Promise<unknown> = Promise.resolve();

  async function relacherUne(touche: number): Promise<boolean> {
    for (let i = 0; i < essais; i++) {
      try {
        await avecDelai(clavier.releaseKey(touche), delaiOperationMs);
        enfoncees.delete(touche);
        return true;
      } catch {
        if (pauseMs > 0) await attendre(pauseMs);
      }
    }
    return false;
  }

  // Relâche tout ce qui est noté enfoncé, dans l'ordre inverse de l'appui.
  // Renvoie les touches dont le relâchement a échoué malgré les nouveaux essais.
  async function relacherLesEnfoncees(): Promise<number[]> {
    const echecs: number[] = [];
    for (const touche of [...enfoncees].reverse()) {
      if (!(await relacherUne(touche))) echecs.push(touche);
    }
    return echecs;
  }

  // Une seule action clavier à la fois, dans l'ordre d'arrivée.
  function exclusif<T>(action: () => Promise<T>): Promise<T> {
    const suite = fileAttente.then(action, action);
    fileAttente = suite.catch(() => undefined);
    return suite;
  }

  async function combinaison(touches: number[]): Promise<ResultatCombinaison> {
    return exclusif(async () => {
      // Une touche restée enfoncée par une action précédente fausserait celle-ci.
      await relacherLesEnfoncees();
      let erreurAppui: string | null = null;
      try {
        for (const touche of touches) {
          // Notée AVANT l'appui : si l'appui échoue ou ne répond pas, la touche
          // est quand même relâchée ensuite.
          enfoncees.add(touche);
          await avecDelai(clavier.pressKey(touche), delaiOperationMs);
          if (pauseMs > 0) await attendre(pauseMs);
        }
      } catch (e) {
        erreurAppui = e instanceof Error ? e.message : String(e);
      }
      const echecs = await relacherLesEnfoncees();
      if (echecs.length > 0) {
        return { ok: false as const, erreur: `touche peut-être restée enfoncée (${erreurAppui ?? "relâchement impossible"})`, touchesPeutEtreEnfoncees: echecs };
      }
      if (erreurAppui) return { ok: false as const, erreur: erreurAppui, touchesPeutEtreEnfoncees: [] };
      return { ok: true as const };
    });
  }

  function relacherTout(): Promise<number[]> {
    return exclusif(relacherLesEnfoncees);
  }

  // Pour la fermeture de l'appli : pas de file d'attente ni de nouvel essai, tous les
  // relâchements partent immédiatement, car le processus peut s'arrêter tout de suite.
  function relacherToutEnUrgence(): Promise<unknown> {
    const envois = [...enfoncees].reverse().map((touche) => {
      try { return Promise.resolve(clavier.releaseKey(touche)); } catch (e) { return Promise.reject(e); }
    });
    enfoncees.clear();
    return Promise.allSettled(envois);
  }

  return { combinaison, exclusif, relacherTout, relacherToutEnUrgence, touchesEnfoncees: () => [...enfoncees] };
}
