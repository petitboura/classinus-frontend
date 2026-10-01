// 01/10/2026, demande Bourama : les 4 catégories de Configuration ont
// chacune leur propre formulaire de création (étapes pour une procédure,
// "dans tel cas / comporte toi ainsi" pour un comportement...). Derrière,
// tout reste UN SEUL texte enregistré, exactement comme avant : ce
// fichier assemble les champs du formulaire en ce texte, et relit ce
// texte pour remplir les champs à la modification et pour l'affichage
// après création. Les marqueurs ci dessous sont une convention de
// stockage (lue par l'IA), pas un texte d'interface : ils ne changent
// jamais avec la langue d'affichage.

const MARQUEUR_CAS = "Dans tel cas :";
const MARQUEUR_REACTION = "Comporte-toi ainsi :";

export function assemblerProcedure(etapes: string[]): string {
  return etapes
    .map((e) => e.trim())
    .filter(Boolean)
    .map((e, i) => `${i + 1}. ${e}`)
    .join("\n");
}

/** Toujours au moins une ligne (vide), pour que le formulaire ait de quoi écrire. */
export function lireProcedure(texte: string): string[] {
  const lignes = texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^\d+[.)]\s*/, ""));
  return lignes.length > 0 ? lignes : [""];
}

export function assemblerComportement(cas: string, reaction: string): string {
  return `${MARQUEUR_CAS} ${cas.trim()}\n${MARQUEUR_REACTION} ${reaction.trim()}`;
}

/**
 * Un texte qui ne suit pas le format (ancien élément, import) n'est
 * jamais perdu : il est mis tel quel dans "comporte toi ainsi".
 */
export function lireComportement(texte: string): { cas: string; reaction: string } {
  const m = texte.match(/^Dans tel cas\s*:\s*([\s\S]*?)\r?\nComporte-toi ainsi\s*:\s*([\s\S]*)$/);
  if (m) return { cas: m[1].trim(), reaction: m[2].trim() };
  return { cas: "", reaction: texte.trim() };
}
