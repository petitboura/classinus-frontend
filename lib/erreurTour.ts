import { ErreurApi } from "@/lib/erreurs";

// Sorte d'erreur qui a coupé une réponse du chat. Les trois premières viennent du serveur
// (événement "erreur_tour", voir classinus-backend core/erreur_tour.py), les autres sont
// décidées ici quand l'appel au serveur lui-même échoue.
export type CodeErreurTour = "delai" | "forte_demande" | "serveur" | "reseau" | "session" | "connexion" | "requete";

const CODES: CodeErreurTour[] = ["delai", "forte_demande", "serveur", "reseau", "session", "connexion", "requete"];

/** Code reçu du serveur, "serveur" si le code est inconnu. */
export function codeErreurValide(code: unknown): CodeErreurTour {
  return CODES.includes(code as CodeErreurTour) ? (code as CodeErreurTour) : "serveur";
}

/** Code de l'erreur levée par l'appel au chat (connexion coupée, réponse HTTP en échec). */
export function codeDepuisException(e: unknown): CodeErreurTour {
  if (e instanceof ErreurApi) {
    if (e.statusCode === 401) return e.code === "CONNEXION_REQUISE" ? "connexion" : "session";
    if (e.statusCode === 400 || e.statusCode === 413 || e.statusCode === 422) return "requete";
    if (e.statusCode === 429 || e.statusCode === 503) return "forte_demande";
    return "serveur";
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "reseau";
  if (e instanceof DOMException && e.name === "TimeoutError") return "delai";
  if (e instanceof TypeError) return "reseau";
  return "serveur";
}
