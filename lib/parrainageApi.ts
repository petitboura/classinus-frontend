import { appelerApi } from "./api";

/** Ce que le serveur renvoie pour le compte connecté (GET /api/parrainage/moi). */
export type ResumeParrainage = {
  code: string;
  /** Crédits d'images restants. */
  solde: number;
  filleuls_valides: number;
  filleuls_en_attente: number;
};

/**
 * Résultat d'un enregistrement de parrain (POST /api/parrainage/enregistrer).
 * Le serveur ne donne jamais le motif d'un refus : seul le statut compte ici.
 * "en_attente" veut dire que l'email n'est pas encore confirmé, un nouvel appel le ré-évalue.
 */
export type StatutParrainage = "valide" | "en_attente" | "refuse" | "ignore";

export async function lireMonParrainage(): Promise<ResumeParrainage> {
  return (await appelerApi("/api/parrainage/moi")) as ResumeParrainage;
}

export async function enregistrerParrainage(code: string): Promise<{ statut: StatutParrainage }> {
  return (await appelerApi("/api/parrainage/enregistrer", {
    method: "POST",
    body: JSON.stringify({ code }),
  })) as { statut: StatutParrainage };
}
