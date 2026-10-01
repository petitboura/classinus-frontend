// Raccourcis clavier de l'outil appuyer_touches (canal en direct PC, 30/09/2026,
// decision Bourama : Clovis controle le clavier comme un utilisateur, touches
// seules et raccourcis compris, pas seulement du texte).
//
// Ce module est pur (aucune dependance a nut-js ni a Windows) : il convertit
// un texte comme "ctrl+c" ou "alt+tab" en noms de l'enumeration Key de nut-js.
// La frappe reelle est faite par plugin.mts, avec Key[nom].

// Une "combinaison" = des touches tenues ensemble ("ctrl+shift+esc").
// Une "sequence" = plusieurs combinaisons a la suite, separees par des espaces
// ("ctrl+a ctrl+c").
export const NB_MAX_COMBINAISONS = 10;
export const NB_MAX_TOUCHES_PAR_COMBINAISON = 5;

const ALIAS: Record<string, string> = {
  // Modificateurs
  ctrl: "LeftControl", control: "LeftControl", ctl: "LeftControl",
  shift: "LeftShift", maj: "LeftShift", majuscule: "LeftShift",
  alt: "LeftAlt",
  altgr: "RightAlt",
  win: "LeftSuper", windows: "LeftSuper", super: "LeftSuper", meta: "LeftSuper", cmd: "LeftSuper",
  // Touches d'edition et de navigation
  enter: "Enter", entree: "Enter", entrée: "Enter", return: "Enter",
  esc: "Escape", escape: "Escape", echap: "Escape", échap: "Escape",
  tab: "Tab", tabulation: "Tab",
  space: "Space", espace: "Space",
  backspace: "Backspace", retour: "Backspace",
  delete: "Delete", del: "Delete", suppr: "Delete",
  insert: "Insert", inser: "Insert",
  home: "Home", debut: "Home", début: "Home",
  end: "End", fin: "End",
  pageup: "PageUp", pgup: "PageUp",
  pagedown: "PageDown", pgdn: "PageDown",
  up: "Up", haut: "Up",
  down: "Down", bas: "Down",
  left: "Left", gauche: "Left",
  right: "Right", droite: "Right",
  capslock: "CapsLock", verrmaj: "CapsLock",
  printscreen: "Print", print: "Print", impr: "Print",
  menu: "Menu", apps: "Menu",
  // Ponctuation
  "-": "Minus", minus: "Minus",
  "=": "Equal", equal: "Equal",
  ",": "Comma", comma: "Comma", virgule: "Comma",
  ".": "Period", period: "Period", point: "Period",
  "/": "Slash", slash: "Slash",
  ";": "Semicolon",
  "'": "Quote",
  "[": "LeftBracket",
  "]": "RightBracket",
  "\\": "Backslash",
  "`": "Grave",
  plus: "Add",
};

const MODIFICATEURS = new Set(["LeftControl", "LeftShift", "LeftAlt", "RightAlt", "LeftSuper"]);

export type AnalyseTouches = { ok: true; combinaisons: string[][] } | { ok: false; erreur: string };

function nomTouche(jeton: string): string | null {
  const t = jeton.trim().toLowerCase();
  if (!t) return null;
  if (t in ALIAS) return ALIAS[t];
  if (/^[a-z]$/.test(t)) return t.toUpperCase();
  if (/^[0-9]$/.test(t)) return `Num${t}`;
  const f = /^f([1-9]|1[0-9]|2[0-4])$/.exec(t);
  if (f) return `F${f[1]}`;
  return null;
}

/**
 * Convertit "ctrl+c", "alt+tab", "enter", "ctrl+a ctrl+c" en combinaisons de
 * noms de touches nut-js. Refuse tout ce qui n'est pas reconnu : jamais de
 * touche devinee.
 */
export function analyserTouches(entree: unknown): AnalyseTouches {
  if (typeof entree !== "string" || !entree.trim()) {
    return { ok: false, erreur: "paramètre 'touches' manquant (exemple : \"ctrl+c\")" };
  }
  const blocs = entree.trim().split(/\s+/);
  if (blocs.length > NB_MAX_COMBINAISONS) {
    return { ok: false, erreur: `trop de combinaisons (${blocs.length}, maximum ${NB_MAX_COMBINAISONS})` };
  }
  const combinaisons: string[][] = [];
  for (const bloc of blocs) {
    // Un "+" seul, ou en fin de bloc ("ctrl++"), designe la touche plus.
    const morceaux = bloc === "+" ? ["plus"] : bloc.replace(/\+\+$/, "+plus").split("+");
    if (morceaux.length > NB_MAX_TOUCHES_PAR_COMBINAISON) {
      return { ok: false, erreur: `combinaison trop longue : "${bloc}" (maximum ${NB_MAX_TOUCHES_PAR_COMBINAISON} touches)` };
    }
    const noms: string[] = [];
    for (const morceau of morceaux) {
      const nom = nomTouche(morceau);
      if (!nom) return { ok: false, erreur: `touche inconnue : "${morceau}"` };
      if (!noms.includes(nom)) noms.push(nom);
    }
    // Les modificateurs d'abord, dans l'ordre donne : ils doivent etre
    // enfonces avant la touche principale et relaches apres elle.
    noms.sort((a, b) => Number(MODIFICATEURS.has(b)) - Number(MODIFICATEURS.has(a)));
    combinaisons.push(noms);
  }
  return { ok: true, combinaisons };
}

// Libelle lisible pour le journal de l'etudiant : "Ctrl+C", "Alt+Tab".
const LIBELLES: Record<string, string> = {
  LeftControl: "Ctrl", LeftShift: "Maj", LeftAlt: "Alt", RightAlt: "AltGr", LeftSuper: "Windows",
  Escape: "Échap", Backspace: "Retour arrière", Delete: "Suppr", Return: "Entrée", Enter: "Entrée",
  Minus: "-", Equal: "=", Comma: ",", Period: ".", Slash: "/", Add: "+",
};

export function libelleCombinaison(noms: string[]): string {
  return noms
    .map((n) => LIBELLES[n] ?? (/^Num\d$/.test(n) ? n.slice(3) : n))
    .join("+");
}
