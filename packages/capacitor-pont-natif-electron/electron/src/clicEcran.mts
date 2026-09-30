import type { ResultatClicAccessible } from "./clicWindows.mjs";

type Point = { x: number; y: number };
export const ANNONCE_CURSEUR_REEL = "Je ne peux pas cliquer ici avec mon curseur seul. Je vais utiliser ton curseur maintenant.";

export interface OperationsClic {
  pointer(point: Point): Promise<unknown>;
  accessibilite(point: Point): Promise<ResultatClicAccessible>;
  annoncer(texte: string): Promise<void>;
  souris(point: Point): Promise<void>;
}

export async function cliquerEcran(point: Point, operations: OperationsClic): Promise<Record<string, unknown>> {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return { erreur: "Coordonnées de clic invalides." };
  await operations.pointer(point);
  const resultat = await operations.accessibilite(point);
  if (resultat.statut === "effectue") return { ok: true, mode: "accessibilite", action: resultat.action, curseur_reel_utilise: false };
  if (resultat.statut === "incertain") return { erreur: "Le résultat du clic n'a pas pu être confirmé. Je ne le répète pas pour éviter un double clic." };
  // Information automatique affichée avant le mouvement, aucune validation utilisateur.
  await operations.annoncer(ANNONCE_CURSEUR_REEL);
  await operations.souris(point);
  return { ok: true, mode: "souris", curseur_reel_utilise: true, information_affichee: true };
}
