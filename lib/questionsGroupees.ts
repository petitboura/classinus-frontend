// Réponses groupées aux questions posées par Classinus (18/09/2026, demande
// Bourama : quand l'IA pose plusieurs questions dans un même tour, chacune
// envoyait sa réponse toute seule et la première réponse bloquait toutes les
// autres). Dès qu'un message contient au moins deux blocs ```question, plus
// aucune réponse ne part au clic : chaque question mémorise sa réponse, et
// un seul bouton "Valider mes réponses" envoie tout en un seul message, à
// n'importe quel moment, que toutes les questions aient reçu une réponse ou
// non (validé par Bourama).
//
// Cette mémoire est un simple dictionnaire (une entrée par bloc question,
// clé = le code JSON du bloc) tenu dans une ref de BulleMessage, pas un
// state : taper une lettre dans un champ texte ne doit pas refaire le rendu
// de tout le message.

export type EntreeReponseGroupee = {
  question: string;
  // Réponse déjà formatée (gabarit_reponse de Classinus, ou "Question :
  // réponse" en filet de sécurité), ou null tant que rien n'est répondu.
  texte: string | null;
};

// Nombre de blocs question dans le texte du message. Simple comptage des
// ouvertures de bloc : suffit pour décider du mode groupé, même pendant que
// le dernier bloc est encore en train d'arriver.
export function compterBlocsQuestion(contenu: string): number {
  return (contenu.match(/```question\b/g) ?? []).length;
}

// Assemble le message unique à envoyer, dans l'ordre où les questions
// apparaissent dans le texte (repli sur l'ordre d'enregistrement si un bloc
// n'est pas retrouvé). Une question sans réponse est signalée à Classinus pour
// qu'il sache qu'elle a été laissée de côté, plutôt que de l'oublier.
export function composerReponsesGroupees(
  contenu: string,
  entrees: Map<string, EntreeReponseGroupee>,
): string {
  return Array.from(entrees.entries())
    .map(([code, entree], ordreEnregistrement) => ({
      entree,
      position: contenu.indexOf(code),
      ordreEnregistrement,
    }))
    .sort((a, b) => a.position - b.position || a.ordreEnregistrement - b.ordreEnregistrement)
    .map(({ entree }) => entree.texte ?? `${entree.question} : sans réponse`)
    .join("\n");
}
