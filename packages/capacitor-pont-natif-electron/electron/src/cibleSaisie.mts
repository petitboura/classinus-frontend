// Cible d'une saisie au clavier (12/10/2026, demande de Bourama).
//
// Avant, taper_clavier ecrivait dans la fenetre qui se trouvait au premier plan, sans
// savoir si c'etait la bonne, et continuait a ecrire meme si l'etudiant partait ailleurs
// pendant la frappe. Maintenant le modele annonce OU le texte doit aller (la fenetre, telle
// qu'il l'a lue a l'ecran) : l'application PC verifie avant de commencer, puis avant chaque
// bloc de texte, que le clavier est toujours dans cette fenetre. Module pur, sans Electron.

// Longueur minimale d'un titre pour qu'il puisse "contenir" ou "etre contenu" dans la cible :
// un titre d'une ou deux lettres correspondrait a n'importe quoi.
const LONGUEUR_MINIMALE_TITRE = 3;

// Texte comparable : minuscules, sans accents, sans l'etoile ou le point que certains
// editeurs ajoutent devant le titre quand le document n'est pas enregistre, espaces
// ramenes a un seul.
export function normaliserPourCible(texte: string | null | undefined): string {
  if (typeof texte !== "string") return "";
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^[\s*•●]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Lit la cible envoyee par le serveur. Chaine vide si elle manque : l'appelant refuse alors
// de taper (le serveur la rend obligatoire ; ce filet couvre un serveur plus ancien).
export function cibleDepuisParametres(parametres: Record<string, unknown>): string {
  const brute = parametres.cible;
  return typeof brute === "string" ? brute.trim() : "";
}

// Vrai si la fenetre actuelle est celle que le modele a annoncee. Compare le titre de la
// fenetre, puis le nom du programme (Bloc-notes -> "notepad") quand il est connu.
export function cibleCorrespond(cible: string, titre: string | null, application: string | null): boolean {
  const voulue = normaliserPourCible(cible);
  if (!voulue) return false;
  const titreNormalise = normaliserPourCible(titre);
  if (titreNormalise) {
    if (titreNormalise.includes(voulue)) return true;
    if (titreNormalise.length >= LONGUEUR_MINIMALE_TITRE && voulue.includes(titreNormalise)) return true;
  }
  const programme = normaliserPourCible(application).replace(/\.exe$/, "");
  if (programme.length >= LONGUEUR_MINIMALE_TITRE) {
    if (voulue.includes(programme) || programme.includes(voulue)) return true;
  }
  return false;
}

// Message donne au modele quand la fenetre au premier plan n'est pas la bonne : rien n'a ete
// tape. Il lui dit quoi faire, sans le pousser a retenter dans une autre fenetre.
export function messageMauvaiseCible(cible: string, titre: string | null): string {
  const actuelle = titre && titre.trim() ? `« ${titre.trim()} »` : "une fenêtre dont le titre est illisible";
  return (
    `Texte NON tapé : tu voulais écrire dans « ${cible} », mais le clavier est dans ${actuelle}. ` +
    "Rien n'a été écrit. Si l'étudiant a changé de fenêtre, ne tape pas ailleurs : demande-lui ce qu'il veut. " +
    "Sinon, clique dans la bonne fenêtre (cliquer_ecran), relis l'écran, puis recommence."
  );
}

// Message donne au modele quand l'etudiant quitte la fenetre en plein milieu de la frappe.
export function messageFrappeInterrompue(cible: string, tapes: number, total: number): string {
  return (
    `Frappe INTERROMPUE : l'étudiant a quitté « ${cible} » pendant l'écriture. ` +
    `${tapes} caractères sur ${total} ont été tapés dans la bonne fenêtre, le reste n'a PAS été écrit, ` +
    "et rien n'a été écrit dans l'autre fenêtre. Ne continue pas sans que l'étudiant te le demande."
  );
}
