/** Lit une réponse JSON d'API et accepte correctement les réponses sans corps. */
export async function lireReponseJsonOuNulle(reponse: Response): Promise<unknown> {
  const texte = await reponse.text();
  if (!texte.trim()) return null;
  return JSON.parse(texte) as unknown;
}
