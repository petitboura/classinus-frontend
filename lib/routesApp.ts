// 30/09/2026, demande Bourama : le chat prend l'adresse de départ de
// l'app ("/"), pour qu'on arrive directement dedans à l'ouverture et
// qu'on ne voie plus classinus.com/chat. L'ancien écran d'accueil, qui
// vivait sur "/", devient le tableau de bord (il n'est plus l'accueil).
//
// Ce fichier est la seule source de ces deux adresses : aucune page ni
// aucun composant ne doit plus écrire "/" ou "/chat" en dur pour parler
// du chat ou du tableau de bord.
export const ROUTES_APP = {
  chat: "/",
  tableauDeBord: "/tableau-de-bord",
} as const;

/** Ancienne adresse du chat, gardée seulement pour la redirection (next.config.mjs). */
export const ANCIENNE_ROUTE_CHAT = "/chat";

/** Vrai quand la page affichée est le chat plein écran. */
export function estPageChat(pathname: string | null | undefined): boolean {
  return pathname === ROUTES_APP.chat;
}

/**
 * Vrai quand `pathname` est la route `route` ou l'une de ses pages filles.
 * Cas particulier : la route du chat est la racine "/", dont TOUS les
 * chemins "commencent par" (un simple startsWith la ferait correspondre
 * partout). Elle ne correspond donc qu'à elle même.
 */
export function correspondARoute(pathname: string, route: string): boolean {
  if (route === ROUTES_APP.chat) return pathname === route;
  return pathname === route || pathname.startsWith(route + "/");
}
