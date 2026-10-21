/** Élargit les chaînes littérales d'un dictionnaire tout en préservant la signature des fonctions. */
export type Elargir<T> =
  T extends (...args: infer A) => infer R ? (...args: A) => Elargir<R> :
  T extends string ? string :
  T extends number ? number :
  T extends boolean ? boolean :
  T extends readonly (infer U)[] ? Elargir<U>[] :
  T extends object ? { [K in keyof T]: Elargir<T[K]> } :
  T;
