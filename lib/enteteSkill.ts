// En-tête (frontmatter) du fichier SKILL.md. Même règle que le backend
// (core/skills_entete.py) : les champs Nom et Description font foi, l'en-tête
// du SKILL.md s'aligne dessus, les autres clés et le corps restent intacts.

const guillemets = (valeur: string) => JSON.stringify(valeur);

function separer(contenu: string): { lignes: string[]; corps: string } | null {
  if (!contenu.startsWith("---\n")) return null;
  const reste = contenu.slice(4);
  if (reste.startsWith("---\n") || reste === "---") return { lignes: [], corps: reste.slice(4) };
  let fin = reste.indexOf("\n---");
  while (fin !== -1) {
    const apres = reste.slice(fin + 4);
    if (apres === "" || apres.startsWith("\n")) return { lignes: reste.slice(0, fin).split("\n"), corps: apres ? apres.slice(1) : "" };
    fin = reste.indexOf("\n---", fin + 1);
  }
  return null;
}

export function appliquerEntete(contenu: string, nom: string, description: string): string {
  const texte = contenu.replace(/\r\n/g, "\n");
  const nouvelles = [`name: ${guillemets(nom)}`, `description: ${guillemets(description)}`];
  const morceau = separer(texte);
  if (!morceau) return `---\n${nouvelles.join("\n")}\n---\n\n${texte.replace(/^\n+/, "")}`;
  const gardees: string[] = [];
  let ignorerSuite = false;
  for (const ligne of morceau.lignes) {
    if (ligne.startsWith("name:") || ligne.startsWith("description:")) { ignorerSuite = true; continue; }
    if (ignorerSuite && (ligne.startsWith(" ") || ligne.startsWith("\t") || ligne === "")) continue;
    ignorerSuite = false;
    gardees.push(ligne);
  }
  return `---\n${[...nouvelles, ...gardees].join("\n")}\n---\n${morceau.corps}`;
}

function valeur(brut: string): string | undefined {
  const v = brut.trim();
  if (v.startsWith('"')) { try { const lu = JSON.parse(v); return typeof lu === "string" ? lu : undefined; } catch { return undefined; } }
  if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) return v.slice(1, -1).replace(/''/g, "'");
  if (v === "" || v.startsWith(">") || v.startsWith("|")) return undefined; // valeur sur plusieurs lignes : on ne synchronise pas
  return v;
}

/** Nom et description lus dans l'en-tête, ou undefined quand ils ne sont pas lisibles sur une ligne. */
export function lireEntete(contenu: string): { nom?: string; description?: string } {
  const morceau = separer(contenu.replace(/\r\n/g, "\n"));
  const sortie: { nom?: string; description?: string } = {};
  if (!morceau) return sortie;
  for (const ligne of morceau.lignes) {
    if (ligne.startsWith("name:")) sortie.nom = valeur(ligne.slice(5));
    else if (ligne.startsWith("description:")) sortie.description = valeur(ligne.slice(12));
  }
  return sortie;
}
