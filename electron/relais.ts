import { app } from 'electron';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Créé le 28/10/2026, demande Bourama : relais téléphone EMBARQUÉ dans
// l'appli PC (proposition A de l'enquête, décision D31). Un seul
// téléchargement : l'installeur contient Relais-Class-Tech.exe, construit
// pendant le workflow publier-pc.yml depuis le dépôt class-tech, et copié
// ici dans le dossier de données de l'appli.
//
// Deux dossiers différents, volontairement :
// - le dossier EMBARQUÉ (dans l'installeur, lecture seule, remplacé à
//   chaque mise à jour) : l'exe neuf et les réglages par défaut ;
// - le dossier de DONNÉES (userData/relais, survit aux mises à jour) :
//   l'exe recopié à chaque lancement (donc toujours à jour) et le fichier
//   reglages.json de l'étudiant, recopié depuis les défauts UNIQUEMENT s'il
//   n'existe pas encore (ses réglages survivent aux mises à jour).
//
// L'exe cherche reglages.json à côté de lui en priorité (voir
// relais_config.py, chemin_fichier_reglages, dans class-tech) : posé dans
// le dossier de données à côté de l'exe recopié, il est bien pris en
// compte. En développement (appli non installée), le dossier embarqué est
// electron/relais-dist : copier l'exe et reglages.json dedans pour tester
// (dossier ignoré par git, voir electron/.gitignore).
//
// Ces constantes sont DUPLIQUÉES dans le plugin
// packages/capacitor-relais-pc-electron/electron/src/plugin.mts (les deux
// projets sont compilés séparément, un import entre eux serait fragile, même
// principe que SCHEMA_LIEN_APPLI). Le test tests/verifier-relais-pc.mjs
// vérifie que les deux copies restent identiques.

export const NOM_EXE_RELAIS = 'Relais-Class-Tech.exe';
export const NOM_REGLAGES_RELAIS = 'reglages.json';
export const NOM_DOSSIER_RELAIS = 'relais';
export const HOTE_RELAIS_DEFAUT = '127.0.0.1';
export const PORT_RELAIS_DEFAUT = 8765;

/** Dossier embarqué : installeur (process.resourcesPath/relais), ou electron/relais-dist en développement. */
export function dossierRelaisEmbarque(): string {
  if (app.isPackaged) return join(process.resourcesPath, NOM_DOSSIER_RELAIS);
  return join(app.getAppPath(), 'relais-dist');
}

/** Dossier de données : userData/relais, survit aux mises à jour. */
export function dossierRelaisDonnees(): string {
  return join(app.getPath('userData'), NOM_DOSSIER_RELAIS);
}

/** Exe utilisé : celui du dossier de données, recopié à chaque lancement. */
export function cheminExeRelais(): string {
  return join(dossierRelaisDonnees(), NOM_EXE_RELAIS);
}

/** Réglages de l'étudiant : dossier de données, jamais écrasés. */
export function cheminReglagesRelais(): string {
  return join(dossierRelaisDonnees(), NOM_REGLAGES_RELAIS);
}

/** Vrai quand l'exe est prêt à être lancé (présent dans le dossier de données). */
export function relaisDisponible(): boolean {
  try {
    return existsSync(cheminExeRelais());
  } catch {
    return false;
  }
}

/** Adresse de base du relais (hôte et port lus dans les réglages, défauts sinon). */
export function adresseBaseRelais(): string {
  let hote = HOTE_RELAIS_DEFAUT;
  let port = PORT_RELAIS_DEFAUT;
  try {
    const donnees = JSON.parse(readFileSync(cheminReglagesRelais(), 'utf8')) as Partial<{
      hote: unknown;
      port: unknown;
    }>;
    if (typeof donnees.hote === 'string' && donnees.hote.trim()) hote = donnees.hote.trim();
    const portLu = Number(donnees.port);
    if (Number.isInteger(portLu) && portLu >= 1 && portLu <= 65535) port = portLu;
  } catch {
    // Réglages absents ou illisibles : les défauts.
  }
  return `http://${hote}:${port}`;
}

/**
 * Prépare le relais au lancement de l'appli : crée le dossier de données,
 * y recopie l'exe embarqué (toujours le plus récent après une mise à jour),
 * et y pose les réglages par défaut seulement s'il n'y en a pas encore.
 * Ne lance jamais rien et ne plante jamais l'appli.
 */
export function preparerRelais(): void {
  try {
    const donnees = dossierRelaisDonnees();
    if (!existsSync(donnees)) mkdirSync(donnees, { recursive: true });
    const embarque = dossierRelaisEmbarque();
    const exeEmbarque = join(embarque, NOM_EXE_RELAIS);
    if (existsSync(exeEmbarque)) copyFileSync(exeEmbarque, cheminExeRelais());
    const reglagesDonnees = cheminReglagesRelais();
    if (!existsSync(reglagesDonnees)) {
      const reglagesEmbarques = join(embarque, NOM_REGLAGES_RELAIS);
      if (existsSync(reglagesEmbarques)) copyFileSync(reglagesEmbarques, reglagesDonnees);
    }
  } catch {
    // Relais inutilisable : la carte Paramètres le dira, l'appli continue sans lui.
  }
}
