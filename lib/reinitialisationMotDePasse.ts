// Réinitialisation du mot de passe (21/10/2026, demande de Bourama).
//
// Tout passe par Supabase Auth, directement depuis le frontend : le backend ne
// gère jamais de mot de passe. Le parcours :
// 1. /mot-de-passe-oublie : l'utilisateur donne son email, Supabase envoie un
//    lien.
// 2. Le lien ramène sur /reinitialiser-mot-de-passe avec une session de
//    récupération, où l'utilisateur choisit son nouveau mot de passe.
//
// Cette adresse de retour doit être autorisée dans Supabase (Authentication,
// URL Configuration, Redirect URLs), sinon Supabase refuse d'envoyer le lien.
import type { AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export const ROUTE_MOT_DE_PASSE_OUBLIE = "/mot-de-passe-oublie";
export const ROUTE_REINITIALISATION = "/reinitialiser-mot-de-passe";

/** Même longueur minimale que le changement de mot de passe des paramètres. */
export const LONGUEUR_MINI_MOT_DE_PASSE = 6;

/** Délai avant de pouvoir demander un nouveau lien, pour éviter les envois en rafale. */
export const DELAI_RENVOI_LIEN_SECONDES = 60;

/**
 * Adresse publique du site, celle que le lien de l'email doit ouvrir.
 *
 * Sur le web, c'est l'adresse de la page en cours (marche aussi en test et en
 * local). Dans l'appli installée (Android, iOS, PC), l'adresse de la page est
 * interne à l'appli et n'existe pas pour un email : on prend alors
 * NEXT_PUBLIC_APP_URL, déjà fournie aux constructions de l'appli.
 */
function adresseDuSite(): string | null {
  if (typeof window === "undefined") return null;

  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const plateforme = capacitor?.getPlatform?.() ?? "web";
  const { protocol, origin } = window.location;

  if (plateforme === "web" && (protocol === "http:" || protocol === "https:")) return origin;

  const publique = process.env.NEXT_PUBLIC_APP_URL;
  return publique ? publique.replace(/\/+$/, "") : null;
}

/** Message en français pour une erreur Supabase Auth, jamais le texte anglais brut. */
export function traduireErreurAuth(erreur: AuthError | { code?: string; message?: string }): string {
  switch (erreur.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Trop de demandes pour le moment. Attends un peu avant de réessayer.";
    case "email_address_invalid":
      return "Cette adresse email n'est pas valide.";
    case "same_password":
      return "Choisis un mot de passe différent de l'ancien.";
    case "weak_password":
      return "Ce mot de passe est trop faible. Choisis en un plus long ou plus varié.";
    case "session_not_found":
    case "session_expired":
    case "refresh_token_not_found":
      return "Ce lien a expiré. Demande un nouveau lien.";
    default:
      return "Une erreur est survenue, réessaie.";
  }
}

/**
 * Demande l'envoi du lien de réinitialisation.
 *
 * Supabase répond sans erreur que l'email existe ou non (anti-énumération) :
 * l'appelant doit donc afficher le même message de confirmation dans les deux
 * cas, jamais "aucun compte avec cet email".
 */
export async function demanderLienReinitialisation(email: string): Promise<{ erreur: string | null }> {
  const site = adresseDuSite();
  if (!site) {
    return { erreur: "Impossible de préparer le lien depuis cet appareil. Réessaie depuis un navigateur." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${site}${ROUTE_REINITIALISATION}`,
  });

  if (error) return { erreur: traduireErreurAuth(error) };
  return { erreur: null };
}

/**
 * Vrai si l'adresse affichée porte une erreur renvoyée par Supabase (lien
 * expiré ou déjà utilisé). Supabase la met après le # ou dans la requête.
 */
export function lienPorteUneErreur(): boolean {
  if (typeof window === "undefined") return false;
  const parametres = [
    new URLSearchParams(window.location.hash.replace(/^#/, "")),
    new URLSearchParams(window.location.search),
  ];
  return parametres.some((p) => p.has("error") || p.has("error_code"));
}
