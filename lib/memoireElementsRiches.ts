// Petite mémoire partagée par les éléments riches du chat (aperçu de lien,
// QCM, question, fiche). Elle garde ce qu'ils ont déjà chargé ou ce que
// l'étudiant a coché, pour qu'un élément qui se remonte (changement de
// page, de conversation, retour sur le chat...) réapparaisse tout de suite
// dans son état, au lieu de repartir de zéro avec un écran de chargement et
// de perdre la réponse cochée.
const TAILLE_MAX = 300;

export type MemoireElements<T> = {
  lire: (cle: string) => T | undefined;
  ecrire: (cle: string, valeur: T) => void;
  effacer: (cle: string) => void;
};

export function creerMemoireElements<T>(): MemoireElements<T> {
  const donnees = new Map<string, T>();
  return {
    lire: (cle) => donnees.get(cle),
    ecrire: (cle, valeur) => {
      donnees.delete(cle);
      donnees.set(cle, valeur);
      if (donnees.size > TAILLE_MAX) {
        const plusAncienne = donnees.keys().next().value;
        if (plusAncienne !== undefined) donnees.delete(plusAncienne);
      }
    },
    effacer: (cle) => {
      donnees.delete(cle);
    },
  };
}
