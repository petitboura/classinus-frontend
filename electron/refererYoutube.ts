import { session } from 'electron';

// Lecteur YouTube dans l'appli PC (17/10/2026, demande de Bourama : la video ne se lisait pas).
// L'appli est servie par le protocole capacitor-electron://, un protocole maison : le navigateur
// n'envoie alors aucune adresse d'origine (en-tete Referer) a YouTube. Or YouTube exige que tout
// lecteur integre s'identifie par cet en-tete (documentation "YouTube API Services, Required
// Minimum Functionality", section "Set the Referer") et affiche sinon l'erreur 153.
// Pour une appli de bureau, la regle est de l'ajouter soi meme : une adresse https dont le nom de
// domaine est l'identifiant de l'appli (appId de electron-builder.config.js).
export const REFERER_YOUTUBE = 'https://com.classinus.app/';

const ADRESSES_LECTEUR_YOUTUBE = ['https://www.youtube.com/embed/*', 'https://www.youtube-nocookie.com/embed/*'];

export function ajouterRefererYoutube(requestHeaders: Record<string, string>): Record<string, string> {
  const entetes: Record<string, string> = {};
  for (const [nom, valeur] of Object.entries(requestHeaders)) {
    if (nom.toLowerCase() !== 'referer') entetes[nom] = valeur;
  }
  entetes.Referer = REFERER_YOUTUBE;
  return entetes;
}

export function installerRefererYoutube(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ADRESSES_LECTEUR_YOUTUBE }, (details, callback) => {
    callback({ requestHeaders: ajouterRefererYoutube(details.requestHeaders) });
  });
}
