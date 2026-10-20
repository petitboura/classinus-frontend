// Origine de l'appareil (20/10/2026, demande de Bourama).
//
// L'appli annonce elle-même, avec chaque message envoyé au chat, d'où il vient. Le serveur ne la
// devine jamais d'après la connexion. Quatre origines possibles :
// - telephone_appli : l'appli installée sur téléphone (Android ou iOS)
// - telephone_navigateur : le site dans le navigateur d'un téléphone ou d'une tablette
// - pc_navigateur : le site dans le navigateur d'un PC
// - pc_appli : l'appli installée sur PC (Electron)
//
// Une seule source de vérité : toute autre partie de l'appli qui a besoin de l'origine l'appelle ici.
// Elle est ajoutée à chaque envoi vers /api/chat dans lib/api.ts, jamais recopiée à la main.

export type OrigineAppareil =
  | "telephone_appli"
  | "telephone_navigateur"
  | "pc_navigateur"
  | "pc_appli";

type NavigateurAvecDonneesAgent = Navigator & { userAgentData?: { mobile?: boolean } };

function navigateurDeTelephone(): boolean {
  const nav = navigator as NavigateurAvecDonneesAgent;
  if (typeof nav.userAgentData?.mobile === "boolean") return nav.userAgentData.mobile;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)) return true;
  // iPad récent : se présente comme un Mac mais possède un écran tactile.
  return /Macintosh/i.test(nav.userAgent) && nav.maxTouchPoints > 1;
}

/** Origine de l'appareil, ou undefined côté serveur (aucune fenêtre) : rien n'est alors envoyé. */
export function obtenirOrigineAppareil(): OrigineAppareil | undefined {
  if (typeof window === "undefined" || typeof navigator === "undefined") return undefined;
  const capacitor = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const plateforme = capacitor?.getPlatform?.();
  if (plateforme === "electron") return "pc_appli";
  if (plateforme === "android" || plateforme === "ios") return "telephone_appli";
  return navigateurDeTelephone() ? "telephone_navigateur" : "pc_navigateur";
}
