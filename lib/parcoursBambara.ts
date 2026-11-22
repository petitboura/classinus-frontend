"use client";

// Page bambara (22/11/2026, demande de Bourama) : appels du parcours d'inscription vocal vers le serveur
// (api/bambara_profils.py). Les phrases que la voix de Classinus lit à chaque étape ne sont écrites nulle part
// dans le code : elles viennent de la table Supabase bambara_parcours_textes, que l'équipe remplit.
// Une phrase absente n'empêche rien : l'étape se joue sans consigne vocale.

import { appelerApi } from "./api";
import type { ProfilBambara } from "./bambaraEspace";

/** Les clés des phrases du parcours (identifiants, pas des phrases). Les mêmes que dans la migration. */
export type CleTexteParcours = "nom_demande" | "nom_reecoute" | "genre_demande" | "presentation_demande" | "fin";
export type TextesParcours = Partial<Record<CleTexteParcours, string>>;
export type GenreProfil = "femme" | "homme";

const CLES: readonly CleTexteParcours[] = ["nom_demande", "nom_reecoute", "genre_demande", "presentation_demande", "fin"];

/** Les phrases du parcours en bambara. Toute erreur donne aucune phrase : le parcours continue sans consigne vocale. */
export async function listerTextesParcoursBambara(): Promise<TextesParcours> {
  const reponse = await appelerApi("/api/bambara/parcours/textes?langue=bm");
  const brut = reponse?.textes;
  const textes: TextesParcours = {};
  if (brut && typeof brut === "object") {
    for (const cle of CLES) {
      const valeur = (brut as Record<string, unknown>)[cle];
      if (typeof valeur === "string" && valeur.trim()) textes[cle] = valeur.trim();
    }
  }
  return textes;
}

/** Crée le profil du parcours : le nom dit à voix haute (transcrit), le genre choisi et la présentation facultative. */
export async function creerProfilParcoursBambara(nom: string, genre: GenreProfil, presentation: string | null): Promise<ProfilBambara> {
  return appelerApi("/api/bambara/profils/parcours", {
    method: "POST",
    body: JSON.stringify({ nom, genre, presentation: presentation && presentation.trim() ? presentation.trim() : null }),
  });
}
