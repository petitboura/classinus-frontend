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
// mais seulement si la superposition est encore la fenêtre active. Si l'étudiant a cliqué
// ailleurs entre temps, Windows a déjà fait son choix et on n'y touche pas.
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
  // À appeler quand la saisie se termine. Renvoie vrai si la fenêtre précédente a été réactivée.
  rendre(propre: Poignee): boolean;
};

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
  return {
    memoriser(propre) {
      if (!systeme) return;
      try {
        const active = systeme.premierPlan();
        // Si la superposition est déjà la fenêtre active, on garde ce qui était noté : il n'y a
        // rien de plus juste à retenir.
        if (estNulle(active) || egales(active, propre)) return;
        precedente = active;
      } catch {
        precedente = null;
      }
    },
    rendre(propre) {
      const cible = precedente;
      precedente = null;
      if (!systeme || cible === null) return false;
      try {
        // L'étudiant a cliqué dans une autre fenêtre pendant la saisie : elle est déjà active.
        if (!egales(systeme.premierPlan(), propre)) return false;
        if (!systeme.existe(cible)) return false;
        return systeme.activer(cible);
      } catch {
        return false;
      }
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
