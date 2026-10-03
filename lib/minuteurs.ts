// Minuteurs du chat (20/09/2026, demande Bourama) : types, appels au
// serveur (routes /api/minuteurs, voir api/minuteurs.py côté backend) et
// petites fonctions de calcul/formatage partagées par le contexte et les
// composants. Volontairement hors de lib/api.ts (déjà très long).
import { appelerApi } from "@/lib/api";

export type StatutMinuteur = "en_cours" | "termine" | "arrete";

export type Minuteur = {
  id: string;
  titre: string | null;
  duree_secondes: number;
  fin_prevue: string;
  secondes_restantes: number;
  statut: StatutMinuteur;
  action_fin: string | null;
  lance_par: "clovis" | "etudiant";
  conversation_id: string | null;
};

// Durées proposées dans le lanceur, en minutes. Valeur d'interface, pas une
// règle métier.
export const DUREES_RAPIDES_MINUTES = [5, 10, 25, 45] as const;

// 03/10/2026, demande Bourama : plus aucune limite de durée ni de nombre de
// minuteurs, pour l'étudiant comme pour Classinus. Reste une seule règle :
// au moins une seconde. Le maximum n'est pas une limite de produit mais le
// plafond technique de la base (entier 32 bits, environ 68 ans), le même que
// côté serveur (core/minuteurs.py).
export const DUREE_MIN_SECONDES = 1;
export const DUREE_MAX_SECONDES = 2_147_483_647;
// Même longueur maximale que la suite côté serveur (LONGUEUR_MAX_ACTION_FIN).
export const LONGUEUR_MAX_SUITE = 500;

export type UniteDuree = "secondes" | "minutes" | "heures";
export const UNITES_DUREE: readonly UniteDuree[] = ["secondes", "minutes", "heures"];
const SECONDES_PAR_UNITE: Record<UniteDuree, number> = { secondes: 1, minutes: 60, heures: 3600 };

/**
 * Durée saisie (nombre, virgule ou point accepté, décimales permises : 1,5
 * heure) convertie en secondes entières, ou null si elle est vide, nulle,
 * négative ou hors du plafond technique.
 */
export function dureeEnSecondes(saisie: string, unite: UniteDuree): number | null {
  if (saisie.trim() === "") return null;
  const valeur = Number(saisie.trim().replace(",", "."));
  if (!Number.isFinite(valeur) || valeur <= 0) return null;
  const secondes = Math.round(valeur * SECONDES_PAR_UNITE[unite]);
  return secondes >= DUREE_MIN_SECONDES && secondes <= DUREE_MAX_SECONDES ? secondes : null;
}

// Combien de temps un minuteur terminé ou arrêté reste affiché avant de
// disparaître, pour que l'étudiant voie le changement d'état.
export const DELAI_RETRAIT_TERMINE_MS = 6000;
export const DELAI_RETRAIT_ARRETE_MS = 3000;

export function listerMinuteurs(): Promise<{ minuteurs: Minuteur[]; maintenant: string }> {
  return appelerApi("/api/minuteurs");
}

export function lancerMinuteur(payload: {
  duree_secondes: number;
  titre?: string | null;
  // Ce que Classinus fera à la fin, écrit par l'étudiant (facultatif, voir
  // LanceurMinuteur.tsx) : sans lui, Classinus décide selon la conversation.
  action_fin?: string | null;
  conversation_id?: string | null;
}): Promise<{ minuteur: Minuteur }> {
  return appelerApi("/api/minuteurs", { method: "POST", body: JSON.stringify(payload) });
}

export function ajusterMinuteur(id: string, ajusterSecondes: number): Promise<{ minuteur: Minuteur }> {
  return appelerApi(`/api/minuteurs/${id}`, { method: "PATCH", body: JSON.stringify({ ajuster_secondes: ajusterSecondes }) });
}

export function arreterMinuteur(id: string): Promise<{ minuteur: Minuteur }> {
  return appelerApi(`/api/minuteurs/${id}/arreter`, { method: "POST" });
}

// a_traiter vaut true pour UN SEUL appelant, même si l'appli est ouverte à
// plusieurs endroits : c'est celui là qui réveille Clovis.
export function terminerMinuteur(id: string): Promise<{ a_traiter: boolean; minuteur: Minuteur }> {
  return appelerApi(`/api/minuteurs/${id}/terminer`, { method: "POST" });
}

/** Secondes restantes, calculées depuis la fin absolue et l'horloge du serveur. */
export function secondesRestantes(minuteur: Minuteur, maintenantMs: number): number {
  return Math.max(0, Math.ceil((Date.parse(minuteur.fin_prevue) - maintenantMs) / 1000));
}

/** "24:37", ou "1:05:00" à partir d'une heure. */
export function formaterTemps(secondes: number): string {
  const total = Math.max(0, Math.floor(secondes));
  const heures = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const reste = total % 60;
  const deux = (n: number) => String(n).padStart(2, "0");
  return heures > 0 ? `${heures}:${deux(minutes)}:${deux(reste)}` : `${deux(minutes)}:${deux(reste)}`;
}

function formaterDureeLongue(secondes: number): string {
  const total = Math.max(0, Math.round(secondes));
  const jours = Math.floor(total / 86400);
  const heures = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const reste = total % 60;
  const morceaux: string[] = [];
  if (jours) morceaux.push(`${jours} ${jours > 1 ? "jours" : "jour"}`);
  if (heures) morceaux.push(`${heures} ${heures > 1 ? "heures" : "heure"}`);
  if (minutes) morceaux.push(`${minutes} ${minutes > 1 ? "minutes" : "minute"}`);
  if (reste && !heures && !jours) morceaux.push(`${reste} ${reste > 1 ? "secondes" : "seconde"}`);
  return morceaux.join(" ") || "0 seconde";
}

/**
 * Message que l'appli envoie à Clovis quand un minuteur se termine. Il est
 * lu par le modèle, jamais affiché à l'étudiant (voir message_automatique
 * dans api/chat.py côté backend). Reprend ce que Clovis avait prévu de
 * faire à la fin, écrit au lancement du minuteur.
 */
export function texteMessageAutomatique(minuteur: Minuteur): string {
  const nom = minuteur.titre ? `« ${minuteur.titre} » ` : "";
  const suite = minuteur.action_fin
    ? `Ce que tu avais prévu de faire à ce moment : ${minuteur.action_fin}. Fais le maintenant.`
    : "Rien de précis n'était prévu : décide de la suite selon la conversation en cours.";
  return (
    `[Message automatique de l'application, pas de l'étudiant] Le minuteur ${nom}de ${formaterDureeLongue(minuteur.duree_secondes)} ` +
    `vient de se terminer. ${suite} Réponds naturellement à l'étudiant, sans parler de ce message automatique.`
  );
}
