// Focus rendu à la fenêtre précédente (18/10/2026, demande de Bourama).
//
// Problème trouvé grâce au journal de diagnostic : quand l'étudiant écrit dans une zone de
// texte de la superposition, Windows lui donne l'activation. À la fin de la saisie, le plugin
// la rendait non activable (setFocusable(false)), mais cela empêche seulement qu'elle le
// redevienne : elle restait la fenêtre active (la ligne « a perdu le focus » n'apparaissait
// jamais). Résultat : la fenêtre du dessous restait figée jusqu'à un clic, et la lecture de
// l'écran voyait Classinus au premier plan.
//
// Ce module note la fenêtre qui était active juste avant la saisie, puis la réactive à la fin,
// mais seulement si la superposition était encore la fenêtre active. Ce test se fait AVANT
// setFocusable(false) (second journal du 18/10/2026 : setFocusable(false) donne lui même
// l'activation à une troisième fenêtre, le test fait après le croyait à tort que l'étudiant
// avait cliqué ailleurs). Si l'étudiant a cliqué ailleurs pendant la saisie, la superposition
// n'était plus active avant, Windows a déjà fait son choix et on n'y touche pas.
//
// Logique pure : le système (Windows) est injecté, ce qui permet de la tester partout. La
// partie Windows est creerSystemeWindows, chargée seulement sous Windows et sans jamais faire
// échouer le plugin si le module natif est absent.

import { createRequire } from "node:module";

// Une poignée de fenêtre Windows (HWND). Selon l'appel, le module natif renvoie un nombre ou
// un grand entier : on compare toujours après conversion en BigInt.
export type Poignee = number | bigint;

export type SystemeFenetres = {
  // Fenêtre active du PC, 0 s'il n'y en a aucune.
  premierPlan(): Poignee;
  // La fenêtre existe encore (elle a pu être fermée entre temps).
  existe(poignee: Poignee): boolean;
  // Rend la fenêtre active ; renvoie faux si Windows refuse.
  activer(poignee: Poignee): boolean;
};

export type FocusPrecedent = {
  // À appeler juste AVANT que la superposition prenne le focus.
  memoriser(propre: Poignee): void;
  // La superposition est la fenêtre active à cet instant (faux si on ne sait pas). À appeler
  // juste AVANT setFocusable(false), car ce dernier peut déplacer l'activation lui même.
  estActive(propre: Poignee): boolean;
  // À appeler quand la saisie se termine, APRÈS setFocusable(false). `etaitActive` est le
  // résultat de estActive pris AVANT. Renvoie vrai si la fenêtre précédente a été réactivée.
  rendre(propre: Poignee, etaitActive: boolean): boolean;
  // Fenêtre active à cet instant, en texte lisible pour le journal de diagnostic.
  apercuPremierPlan(): string;
  // Ce qui s'est passé lors du dernier memoriser et du dernier rendre, en une ligne de journal
  // (poignées notées, fenêtre active, raison d'un refus). Sert à comprendre un « non ».
  trace(): string;
};

function texte(poignee: Poignee): string {
  return `0x${BigInt(poignee).toString(16)}`;
}

function egales(a: Poignee, b: Poignee): boolean {
  return BigInt(a) === BigInt(b);
}

function estNulle(poignee: Poignee): boolean {
  return BigInt(poignee) === 0n;
}

// getNativeWindowHandle() d'Electron renvoie la poignée dans un Buffer (4 ou 8 octets).
export function poigneeDe(tampon: Buffer): Poignee {
  return tampon.length >= 8 ? tampon.readBigUInt64LE(0) : tampon.readUInt32LE(0);
}

export function creerFocusPrecedent(systeme: SystemeFenetres | null): FocusPrecedent {
  let precedente: Poignee | null = null;
  let traceNote = "rien noté";
  let traceRendu = "rien rendu";
  return {
    memoriser(propre) {
      if (!systeme) {
        traceNote = "pas de système Windows";
        return;
      }
      try {
        const active = systeme.premierPlan();
        // Si la superposition est déjà la fenêtre active, on garde ce qui était noté : il n'y a
        // rien de plus juste à retenir.
        if (estNulle(active)) {
          traceNote = "aucune fenêtre active, rien noté";
          return;
        }
        if (egales(active, propre)) {
          traceNote = `la superposition (${texte(propre)}) était déjà active, rien noté`;
          return;
        }
        precedente = active;
        traceNote = `noté ${texte(active)} (superposition ${texte(propre)})`;
      } catch (erreur) {
        precedente = null;
        traceNote = `erreur en notant : ${erreur instanceof Error ? erreur.message : String(erreur)}`;
      }
    },
    estActive(propre) {
      if (!systeme) return false;
      try {
        return egales(systeme.premierPlan(), propre);
      } catch {
        return false;
      }
    },
    rendre(propre, etaitActive) {
      const cible = precedente;
      precedente = null;
      if (!systeme) {
        traceRendu = "pas de système Windows";
        return false;
      }
      if (cible === null) {
        traceRendu = "aucune fenêtre notée avant la saisie";
        return false;
      }
      try {
        // L'étudiant a cliqué dans une autre fenêtre pendant la saisie : elle est déjà active.
        // Le test est celui pris avant setFocusable(false), pas un nouveau test d'ici.
        if (!etaitActive) {
          traceRendu = `la superposition (${texte(propre)}) n'était plus la fenêtre active avant la fin de la saisie (actuellement ${texte(systeme.premierPlan())}), rien réactivé, fenêtre notée ${texte(cible)}`;
          return false;
        }
        if (!systeme.existe(cible)) {
          traceRendu = `la fenêtre notée ${texte(cible)} n'existe plus`;
          return false;
        }
        const ok = systeme.activer(cible);
        traceRendu = ok ? `fenêtre ${texte(cible)} réactivée` : `Windows a refusé d'activer ${texte(cible)}`;
        return ok;
      } catch (erreur) {
        traceRendu = `erreur en rendant : ${erreur instanceof Error ? erreur.message : String(erreur)}`;
        return false;
      }
    },
    apercuPremierPlan() {
      if (!systeme) return "inconnu";
      try {
        return texte(systeme.premierPlan());
      } catch {
        return "erreur";
      }
    },
    trace() {
      return `${traceNote} ; ${traceRendu}`;
    },
  };
}

// Appels Windows (user32.dll) par koffi. Renvoie null hors Windows, ou si koffi ne se charge
// pas (le plugin continue alors comme avant, et la raison est inscrite dans le journal).
export function creerSystemeWindows(): SystemeFenetres | null {
  if (process.platform !== "win32") return null;
  try {
    const exiger = createRequire(import.meta.url);
    const koffi = exiger("koffi");
    const user32 = koffi.load("user32.dll");
    const GetForegroundWindow = user32.func("uintptr_t __stdcall GetForegroundWindow()");
    const IsWindow = user32.func("int __stdcall IsWindow(uintptr_t hWnd)");
    const SetForegroundWindow = user32.func("int __stdcall SetForegroundWindow(uintptr_t hWnd)");
    return {
      premierPlan: () => GetForegroundWindow() as Poignee,
      existe: (poignee) => IsWindow(poignee) !== 0,
      activer: (poignee) => SetForegroundWindow(poignee) !== 0,
    };
  } catch (erreur) {
    console.log(`FOCUS ${new Date().toISOString()} module natif koffi indisponible, le focus ne sera pas rendu : ${erreur instanceof Error ? erreur.message : String(erreur)}`);
    return null;
  }
}
