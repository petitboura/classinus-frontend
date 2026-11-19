// Liste d'attente des modèles Bientôt (16/11/2026, demande de Bourama) : types, appels au serveur
// (routes /api/liste-attente, voir api/liste_attente.py côté backend) et petites fonctions partagées
// par le formulaire. Une fausse porte mesure la demande réelle ; aucun paiement n'est pris.
// Les paliers et tous les textes viennent du serveur (Supabase), jamais écrits ici.
import { appelerApi } from "@/lib/api";
import { obtenirOrigineAppareil } from "@/lib/origineAppareil";

export type Profil = "etudiant" | "administration" | "dev";
export type Etape = "selecteur_ouvert" | "modele_grise_clique" | "formulaire_ouvert";

export type PalierListeAttente = { prix_usd: number; credit_usd: number; ordre: number };
// Une seule liste d'attente par personne (17/11/2026) : modele_id est le modele cliqué à l'inscription.
export type InscriptionListeAttente = { modele_id: string; palier_prix: number; profil: Profil | null; statut: string };

// Un modèle montré sur la page des abonnements : son nom et, pour les modèles les plus puissants, un
// badge par langue (ex. "Max"). Groupés par entreprise, du plus puissant au moins puissant.
export type ModelePageAbonnements = { label: string; groupe: number | null; badge: Record<string, string> };
export type EntrepriseModeles = { distributeur: string; nom: string; modeles: ModelePageAbonnements[] };

export type ConfigListeAttente = {
  paliers: PalierListeAttente[];
  // Par langue puis par clé : { fr: { attente_titre: "..." }, en: { ... } }.
  textes: Record<string, Record<string, string>>;
  // L'inscription active de la personne, ou null si elle n'est pas encore sur la liste.
  inscription: InscriptionListeAttente | null;
  profils: Profil[];
  // Les modèles de la page (même source que le sélecteur du chat). Absent ou vide : pas de tableau.
  modeles?: EntrepriseModeles[];
  // Identifiants des moyens de paiement proposés après le clic sur Payer (19/11/2026) ; le nom affiché est
  // le texte attente_moyen_<id>. Absent ou vide : l'étape est sautée.
  moyens_paiement?: string[];
};

export type PayloadInscription = {
  modele_id: string;
  palier_prix: number;
  // Facultatif depuis le parcours de paiement (19/11/2026) : la page ne le demande plus.
  profil?: Profil | null;
  consentement: boolean;
  pays?: string | null;
  whatsapp?: string | null;
  langue: string;
  source: string | null;
  moyen_paiement?: string | null;
};

/** Valeur envoyée quand la page /abonnements est ouverte sans passer par un modèle grisé (adresse directe). */
export const MODELE_PAGE_DIRECTE = "page_abonnements";

/** Adresse de la page des abonnements pour un modèle grisé cliqué dans le sélecteur. */
export function urlPageAbonnements(modeleId: string, modeleLabel: string): string {
  const params = new URLSearchParams({ modele: modeleId, nom: modeleLabel });
  return `/abonnements?${params.toString()}`;
}

/** Source annoncée au serveur : web, android, ios ou pc (jamais devinée côté serveur). */
export function sourceListeAttente(): string | null {
  const origine = obtenirOrigineAppareil();
  if (!origine) return null;
  if (origine === "pc_appli") return "pc";
  if (origine === "telephone_appli") {
    const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
    return capacitor?.getPlatform?.() === "ios" ? "ios" : "android";
  }
  return "web";
}

export function lireConfigListeAttente(): Promise<ConfigListeAttente> {
  return appelerApi("/api/liste-attente/config");
}

export function sInscrireListeAttente(payload: PayloadInscription): Promise<{ modele_id: string; statut: string }> {
  return appelerApi("/api/liste-attente", { method: "POST", body: JSON.stringify(payload) });
}

export function seDesinscrireListeAttente(): Promise<{ statut: string }> {
  return appelerApi("/api/liste-attente/desinscription", { method: "POST" });
}

/**
 * Note une étape de l'entonnoir (sélecteur ouvert, modèle grisé cliqué, formulaire ouvert). Ne gêne
 * jamais l'utilisateur : une erreur, ou l'absence de compte, est ignorée en silence.
 */
export function noterEtapeListeAttente(etape: Etape, modeleId: string | null, langue: string): void {
  void appelerApi("/api/liste-attente/evenement", {
    method: "POST",
    body: JSON.stringify({ etape, modele_id: modeleId, langue, source: sourceListeAttente() }),
  }).catch(() => {});
}

/** Remplace {modele}, {nom} ou {prix} dans un texte du serveur. */
export function remplirTexte(texte: string, valeurs: Record<string, string | number>): string {
  return texte.replace(/\{(\w+)\}/g, (reste, cle: string) => (cle in valeurs ? String(valeurs[cle]) : reste));
}

// Les pays proposés et leurs indicatifs sont dans lib/paysTelephone.ts. Le nom affiché vient d'Intl.DisplayNames,
// dans la langue de l'interface, donc il n'y a aucun texte à traduire à la main.
export function nomDuPays(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
