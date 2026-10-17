// Génère le fichier latest.json lu par l'appli installée au démarrage pour
// savoir s'il existe une mise à jour OTA (sans réinstaller l'APK).
//
// Appelé par .github/workflows/ota.yml après la construction du bundle.
// Tout passe par des variables d'environnement, rien n'est écrit en dur :
//   OTA_VERSION      identifiant unique du bundle (ex. ota-42-ab12cd3)
//   OTA_SHA256       empreinte sha256 du fichier zip, pour vérifier son intégrité
//   OTA_URL_ZIP      adresse de téléchargement du zip
//   OTA_HEURE_BUILD  heure de construction en millisecondes, la même valeur que
//                    NEXT_PUBLIC_BUILD_TIME injectée dans le bundle lui-même
// Le numéro d'APK minimum vient de ota.config.json (à relever dès qu'un
// changement natif rend les anciens APK incompatibles avec le nouveau JS).
//
// Usage : node scripts/generer-latest-ota.mjs chemin/vers/latest.json

import { readFileSync, writeFileSync } from "node:fs";

function exiger(nom) {
  const valeur = process.env[nom];
  if (!valeur) {
    console.error(`Variable d'environnement manquante : ${nom}`);
    process.exit(1);
  }
  return valeur;
}

const cheminSortie = process.argv[2];
if (!cheminSortie) {
  console.error("Chemin de sortie manquant.");
  process.exit(1);
}

const version = exiger("OTA_VERSION");
const sha256 = exiger("OTA_SHA256");
const url = exiger("OTA_URL_ZIP");
const heureBuild = Number(exiger("OTA_HEURE_BUILD"));

if (!/^[a-f0-9]{64}$/.test(sha256)) {
  console.error("L'empreinte sha256 n'a pas le bon format.");
  process.exit(1);
}
if (!url.startsWith("https://")) {
  console.error("L'adresse du zip doit commencer par https://");
  process.exit(1);
}
if (!Number.isFinite(heureBuild) || heureBuild <= 0) {
  console.error("L'heure de construction est invalide.");
  process.exit(1);
}

const config = JSON.parse(readFileSync(new URL("../ota.config.json", import.meta.url), "utf8"));
const versionNativeMin = config.versionNativeMin;
if (!Number.isInteger(versionNativeMin) || versionNativeMin < 1) {
  console.error("ota.config.json : versionNativeMin doit être un entier positif.");
  process.exit(1);
}

const contenu = { version, url, sha256, versionNativeMin, heureBuild };
writeFileSync(cheminSortie, JSON.stringify(contenu, null, 2) + "\n");
console.log(`latest.json écrit : ${version}`);
