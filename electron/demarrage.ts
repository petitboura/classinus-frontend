import { app } from 'electron';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ARGUMENT_LANCEMENT_SESSION } from './lancementSession';

// Créé le 01/10/2026, demande Bourama : démarrage automatique de Classinus avec
// Windows (voir lancementSession.ts pour l'argument de lancement).

function fichierInitialisation(): string {
  return join(app.getPath('userData'), 'demarrage-automatique-initialise');
}

/**
 * Premier lancement de l'appli installée : le démarrage automatique est
 * activé par défaut (décision Bourama, 01/10/2026). Fait une seule fois : le
 * marqueur est écrit AVANT l'activation, pour qu'un échec d'écriture ne
 * réactive jamais un réglage que l'étudiant a coupé depuis les Paramètres.
 * Jamais en développement (cela enregistrerait l'exécutable Electron nu).
 */
export function initialiserDemarrageAutomatique(): void {
  if (!app.isPackaged) return;
  try {
    const marqueur = fichierInitialisation();
    if (existsSync(marqueur)) return;
    writeFileSync(marqueur, '1', 'utf8');
    app.setLoginItemSettings({ openAtLogin: true, args: [ARGUMENT_LANCEMENT_SESSION] });
  } catch {
    // Impossible d'initialiser : le réglage reste tel quel, jamais de plantage pour ça.
  }
}
