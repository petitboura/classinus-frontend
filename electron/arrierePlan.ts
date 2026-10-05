import { app, BrowserWindow, Menu, Tray, nativeImage } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Créé le 01/10/2026, demande Bourama : fermer la fenêtre de Classinus ne
// doit plus arrêter l'appli. La fenêtre principale garde la vraie connexion
// du canal en direct (voir lib/canalAgentApplicatif.ts), donc la détruire
// couperait le canal. On la cache à la place, et une icône près de l'horloge
// permet de la rouvrir ou de quitter vraiment.

// L'objet Tray est ramassé par le ramasse-miettes s'il n'est plus référencé :
// il reste donc en variable de module.
let iconeZoneNotification: Tray | null = null;
let quitterVraiment = false;

// Icône de l'appli, copiée par le build depuis public/ (voir app/ dans
// electron-builder.config.js).
const CHEMIN_ICONE = ['app', 'icone-48.png'];
const TAILLE_ICONE = 32;

function afficherFenetre(fenetre: BrowserWindow): void {
  if (fenetre.isDestroyed()) return;
  if (fenetre.isMinimized()) fenetre.restore();
  fenetre.show();
  fenetre.focus();
}

function creerIconeZoneNotification(fenetre: BrowserWindow): Tray | null {
  try {
    const chemin = join(app.getAppPath(), ...CHEMIN_ICONE);
    if (!existsSync(chemin)) return null;
    const image = nativeImage.createFromPath(chemin);
    if (image.isEmpty()) return null;
    const icone = new Tray(image.resize({ width: TAILLE_ICONE, height: TAILLE_ICONE, quality: 'best' }));
    icone.setToolTip('Classinus');
    icone.setContextMenu(
      Menu.buildFromTemplate([
        { label: 'Ouvrir Classinus', click: () => afficherFenetre(fenetre) },
        { type: 'separator' },
        {
          label: 'Quitter Classinus',
          click: () => {
            quitterVraiment = true;
            app.quit();
          },
        },
      ])
    );
    icone.on('click', () => afficherFenetre(fenetre));
    return icone;
  } catch {
    return null;
  }
}

/**
 * Appelé une seule fois avec la fenêtre principale déjà créée.
 * Sans icône près de l'horloge, il n'y aurait plus aucun moyen de rouvrir ni
 * de quitter : dans ce cas fermer la fenêtre quitte l'appli, comme avant.
 */
export function installerArrierePlan(fenetre: BrowserWindow): void {
  app.on('before-quit', () => {
    quitterVraiment = true;
  });
  // Windows n'émet pas before-quit à l'arrêt ou à la fermeture de session : sans
  // ce drapeau, cacher la fenêtre empêcherait l'arrêt du PC.
  fenetre.on('session-end', () => {
    quitterVraiment = true;
  });

  iconeZoneNotification = creerIconeZoneNotification(fenetre);
  if (!iconeZoneNotification) {
    fenetre.on('closed', () => app.quit());
    return;
  }

  fenetre.on('close', (evenement) => {
    if (quitterVraiment) return;
    evenement.preventDefault();
    fenetre.hide();
  });
}
