import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const cheminSource = new URL("../lib/erreurs.ts", import.meta.url);
const source = await readFile(cheminSource, "utf8");
const compile = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
});
const moduleErreur = await import(
  `data:text/javascript;base64,${Buffer.from(compile.outputText).toString("base64")}`
);
const {
  ErreurApi,
  messageErreur,
  messageErreurVoix,
  messageErreurAuthentification,
  messageErreurFichierNatif,
  estErreurReseau,
  MESSAGES,
  LOCALE_ACTIVE,
} = moduleErreur;
const sourceReinitialisationUtilitaire = await readFile(new URL("../lib/reinitialisationMotDePasse.ts", import.meta.url), "utf8");
assert.match(sourceReinitialisationUtilitaire, /catch \(e\)[\s\S]*messageErreurAuthentification\(e, "reinitialisation"\)/);
assert.match(sourceReinitialisationUtilitaire, /estErreurReseau\(message\)[\s\S]*MESSAGES\[LOCALE_ACTIVE\]\.ERREUR_RESEAU/);


const cas = [
  {
    nom: "une panne réseau est expliquée sans message brut du navigateur",
    erreur: new TypeError("Failed to fetch"),
    attendu: /connexion Internet/i,
  },
  {
    nom: "une panne réseau alternative est reconnue",
    erreur: new Error("Network request failed"),
    attendu: /connexion Internet/i,
  },
  {
    nom: "une coupure Internet du navigateur est reconnue",
    erreur: new Error("ERR_INTERNET_DISCONNECTED"),
    attendu: /connexion Internet/i,
  },
  {
    nom: "une réinitialisation réseau Node est traduite sans afficher le code brut",
    erreur: new Error("ECONNRESET"),
    attendu: /connexion Internet/i,
  },
  {
    nom: "un délai réseau Node est traduit sans afficher le code brut",
    erreur: new Error("ETIMEDOUT"),
    attendu: /connexion Internet/i,
  },
  {
    nom: "une erreur React technique est masquée",
    erreur: new Error("Minified React error #418"),
    attendu: /^Une erreur est survenue/i,
  },
  {
    nom: "un statut HTTP Axios sans objet ErreurApi est masqué",
    erreur: new Error("Request failed with status code 500"),
    attendu: /^Une erreur est survenue/i,
  },
  {
    nom: "une erreur technique de pont natif ne révèle pas son message anglais",
    erreur: new Error("Unable to initialize native bridge"),
    attendu: /^Une erreur est survenue/i,
  },
  {
    nom: "un code d'erreur natif inconnu est masqué",
    erreur: new Error("ERR_UNKNOWN_DEVICE"),
    attendu: /^Une erreur est survenue/i,
  },
  {
    nom: "une erreur JSON technique est masquée",
    erreur: new SyntaxError("Unexpected token '<', HTML is not valid JSON"),
    attendu: /^Une erreur est survenue/i,
  },
  {
    nom: "une erreur serveur générique n'affiche pas Internal Server Error",
    erreur: new ErreurApi(500, "Internal Server Error"),
    attendu: /problème du service/i,
  },
  {
    nom: "un détail interne de base de données n'est pas affiché",
    erreur: new ErreurApi(500, "psycopg2.OperationalError: connection refused", "ERREUR_BASE_INDISPONIBLE"),
    attendu: /problème du service/i,
  },
  {
    nom: "un diagnostic de passerelle n'est pas affiché en clair",
    erreur: new ErreurApi(502, "upstream connect error: connection timeout", "PASSERELLE_ECHEC"),
    attendu: /problème du service/i,
  },
  {
    nom: "une page HTML de proxy n'est pas exposée",
    erreur: new ErreurApi(502, "<html>Bad Gateway</html>"),
    attendu: /problème du service/i,
  },
  {
    nom: "un diagnostic SQL ne sort pas dans une erreur de permission",
    erreur: new ErreurApi(403, "psycopg2.OperationalError: SQLSTATE[08006]: connection refused", "ERREUR_BDD"),
    attendu: /pas l’autorisation/i,
  },
  {
    nom: "une erreur 404 générique donne une action compréhensible",
    erreur: new ErreurApi(404, "Internal Server Error"),
    attendu: /introuvable ou n’est plus disponible/i,
  },
  {
    nom: "une session expirée indique la reconnexion",
    erreur: new ErreurApi(401, "détail technique", "SESSION_EXPIREE"),
    attendu: /session a expiré.*reconnecte-toi/i,
  },
  {
    nom: "un visiteur doit se connecter ou se reconnecter sans accusation technique",
    erreur: new ErreurApi(401, "Missing authentication token", "CONNEXION_REQUISE"),
    attendu: /Connecte-toi ou reconnecte-toi/i,
  },
  {
    nom: "un message métier précis reste conservé",
    erreur: new ErreurApi(404, "Ce code de partage est introuvable.", "CODE_INTROUVABLE"),
    attendu: /^Ce code de partage est introuvable\.$/,
  },
  {
    nom: "un message utile provenant d'une fonctionnalité reste conservé",
    erreur: new Error("Le fichier est vide. Choisis un fichier qui contient du texte."),
    attendu: /^Le fichier est vide\./,
  },
  {
    nom: "une valeur inconnue donne le message de secours",
    erreur: { detail: "erreur technique" },
    attendu: /^Une erreur est survenue/i,
  },
  {
    nom: "une erreur HTTP préfixée ne révèle pas le statut brut",
    erreur: new ErreurApi(500, "HTTP 500: Internal Server Error", "ERREUR_INCONNUE_BACKEND"),
    attendu: /problème du service/i,
  },
  {
    nom: "un token absent sans code métier demande de se reconnecter",
    erreur: new ErreurApi(401, "Missing authentication token"),
    attendu: /Connecte-toi ou reconnecte-toi/i,
  },
  {
    nom: "une phrase serveur française générique est normalisée",
    erreur: new ErreurApi(500, "Une erreur est survenue (500), réessaie dans un instant.", "ERREUR_SERVEUR_INCONNUE"),
    attendu: /problème du service/i,
  },
  {
    nom: "une taille de fichier refusée donne une explication utile",
    erreur: new ErreurApi(413, "Payload Too Large"),
    attendu: /fichier est trop volumineux/i,
  },
  {
    nom: "une limite de taille générique est reconnue même sans code standard",
    erreur: new ErreurApi(413, "Request Entity Too Large"),
    attendu: /fichier est trop volumineux/i,
  },
  {
    nom: "une limite de débit en anglais est traduite",
    erreur: new ErreurApi(429, "Rate limit exceeded"),
    attendu: /Trop de demandes/i,
  },
  {
    nom: "la locale anglaise conserve un message de service anglais",
    erreur: new ErreurApi(500, "Internal Server Error"),
    locale: "en",
    attendu: /service problem/i,
  },
  {
    nom: "un 503 avec un code déclaré par le backend garde son message précis",
    erreur: new ErreurApi(503, "La génération 3D n'est pas encore activée.", "GENERATION_3D_INDISPONIBLE"),
    attendu: /génération 3D/i,
  },
  {
    nom: "un 500 avec un code déclaré par le backend garde son message précis",
    erreur: new ErreurApi(500, "Impossible de charger les commentaires pour le moment.", "IMPOSSIBLE_DE_CHARGER_LES_COMMENTAIRES_POUR"),
    attendu: /commentaires/i,
  },
  {
    nom: "un code serveur 5xx déclaré par le backend est aussi traduit en anglais",
    erreur: new ErreurApi(503, "La génération 3D n'est pas encore activée.", "GENERATION_3D_INDISPONIBLE"),
    locale: "en",
    attendu: /3D generation is not available yet/i,
  },
  {
    nom: "un 500 avec un code jamais déclaré et un corps technique reste masqué",
    erreur: new ErreurApi(500, "psycopg2.OperationalError: connection refused", "ERREUR_BASE_INTERNE"),
    attendu: /problème du service/i,
  },
  {
    nom: "un 503 sans code reste générique même si le corps est lisible",
    erreur: new ErreurApi(503, "Le serveur interne a planté sur la table utilisateurs."),
    attendu: /problème du service/i,
  },
  {
    nom: "le mot offline dans un message métier n'est pas pris pour une panne réseau",
    erreur: new ErreurApi(400, "Le mode offline n'est pas disponible pour ce fichier.", "MODE_OFFLINE_INDISPONIBLE"),
    attendu: /mode offline/i,
  },
  {
    nom: "une vraie perte de connexion en anglais reste reconnue",
    erreur: new Error("You are offline"),
    attendu: /connexion Internet/i,
  },
];

for (const test of cas) {
  const obtenu = messageErreur(test.erreur, test.locale);
  assert.match(obtenu, test.attendu, test.nom + " (message obtenu : " + obtenu + ")");
  console.log("OK — " + test.nom);
}

for (const message of ["Failed to fetch", "Network request failed", "ECONNREFUSED", "You are offline", "device is offline"]) {
  assert.equal(estErreurReseau(message), true, "panne réseau attendue : " + message);
}
for (const message of ["Le mode offline n'est pas disponible", "offline", "Fichier introuvable"]) {
  assert.equal(estErreurReseau(message), false, "pas une panne réseau : " + message);
}
assert.ok(MESSAGES[LOCALE_ACTIVE].ERREUR_RESEAU, "le message réseau du locale actif existe");

// Codes 5xx déclarés par le backend (core/erreurs.py) : présents en français ET en anglais.
const codesServeur5xx = [
  "AGENT_MODIFICATION_ERREUR_TECHNIQUE", "AGENT_MODIFICATION_INDISPONIBLE", "ECHEC_DE_L_ENVOI_POUR_SIGNATURE",
  "ECHEC_GENERATION_ARCHIVE", "ECHEC_GENERATION_IMAGE", "ECHEC_LANCEMENT_GENERATION_3D",
  "ECHEC_LANCEMENT_GENERATION_VIDEO", "ECHEC_LECTURE_USAGE", "ECHEC_SYNCHRONISATION_USAGE",
  "ETABLISSEMENT_DEJA_DECLARE", "GENERATION_3D_INDISPONIBLE", "GENERATION_VIDEO_INDISPONIBLE",
  "IMPOSSIBLE_DE_CHARGER_LES_ADMINISTRATEURS", "IMPOSSIBLE_DE_CHARGER_LES_COMMENTAIRES_POUR",
  "IMPOSSIBLE_D_AJOUTER_L_ADMINISTRATEUR", "IMPOSSIBLE_D_ENREGISTRER_LE_COMMENTAIRE_POUR",
  "LE_COMMENTAIRE_N_A_PAS_PU", "NOTIFICATIONS_LECTURE_ECHEC", "NOTIFICATIONS_MAJ_ECHEC",
  "PROFIL_FERMETURE_PARTIELLE", "RELAIS_EXTERNE_INDISPONIBLE", "SIGNATURE_INDISPONIBLE",
];
for (const code of codesServeur5xx) {
  assert.ok(MESSAGES.fr[code], "code serveur absent en français : " + code);
  assert.ok(MESSAGES.en[code], "code serveur absent en anglais : " + code);
}
console.log("OK — " + codesServeur5xx.length + " codes serveur 5xx présents en français et en anglais");

// Textes d'erreur affichés à l'étudiant : jamais écrits en dur dans un seul
// langage, toujours lus dans le dictionnaire (français ET anglais).
const clesTextesAffiches = [
  "AFFICHAGE_CARTE_INVALIDE", "AFFICHAGE_FICHE_INVALIDE", "AFFICHAGE_GRAPHIQUE_INVALIDE",
  "AFFICHAGE_DIAGRAMME_INVALIDE", "AFFICHAGE_QCM_INVALIDE", "AFFICHAGE_QUESTION_INVALIDE",
  "AFFICHAGE_SCHEMA_INVALIDE", "CONNEXION_GOOGLE_PREPARATION_ECHEC", "PLUGIN_ERREUR_GENERIQUE",
  "PLUGIN_PERMISSION_REFUSEE", "PLUGIN_INDISPONIBLE", "PLUGIN_EXECUTION_ECHEC",
];
for (const cle of clesTextesAffiches) {
  assert.ok(MESSAGES.fr[cle], "texte absent en français : " + cle);
  assert.ok(MESSAGES.en[cle], "texte absent en anglais : " + cle);
}
for (const chemin of [
  "components/chat/CarteMessage.tsx", "components/chat/FicheRevision.tsx", "components/chat/GraphiqueDonnees.tsx",
  "components/chat/Mermaid.tsx", "components/chat/QCMInteractif.tsx", "components/chat/QuestionInteractive.tsx",
  "components/chat/SchemaGeometrique.tsx", "components/BoutonGoogle.tsx",
]) {
  const source = await readFile(new URL("../" + chemin, import.meta.url), "utf8");
  assert.doesNotMatch(source, /setErreur\(\s*["`][^"`]/, chemin + " : message d'erreur écrit en dur");
}
const sourcePluginNatif = await readFile(new URL("../lib/usePluginNatif.ts", import.meta.url), "utf8");
assert.doesNotMatch(sourcePluginNatif, /return "[^"]*(?:Classinus|autorisation|fonction)/i, "usePluginNatif : message écrit en dur");
for (const chemin of ["app/error.tsx", "app/global-error.tsx"]) {
  const source = await readFile(new URL("../" + chemin, import.meta.url), "utf8");
  assert.match(source, /textesPagesErreur\(\)/, chemin + " doit lire ses textes dans textesPagesErreur");
  assert.doesNotMatch(source, /Réessayer|n’a pas pu|Vérifie l’état/, chemin + " : texte écrit en dur");
}
console.log("OK — textes d'erreur affichés lus dans le dictionnaire (français et anglais)");
console.log("OK — détection réseau (cas positifs et négatifs)");

assert.match(messageErreur(new ErreurApi(429, "Erreur API")), /Trop de demandes/i);
assert.match(messageErreur(new ErreurApi(408, "Request failed")), /trop de temps/i);
assert.match(messageErreur(new ErreurApi(403, "Internal Server Error")), /pas l’autorisation/i);
assert.match(messageErreur(new ErreurApi(400, "Bad Request")), /informations envoyées ne sont pas valides/i);
assert.match(messageErreur(new ErreurApi(409, "Conflict")), /informations ont changé/i);
assert.match(messageErreur(new ErreurApi(504, "Gateway Timeout")), /trop de temps/i);
console.log("OK — statuts HTTP 400, 403, 408, 409, 429 et 504");

assert.match(messageErreurVoix({ name: "NotAllowedError", message: "Permission denied" }), /accès au microphone a été refusé/i);
assert.match(messageErreurVoix({ name: "NotFoundError", message: "Requested device not found" }), /Aucun microphone compatible/i);
assert.match(messageErreurVoix({ name: "NotReadableError", message: "Could not start audio source" }), /microphone ne peut pas être utilisé/i);
assert.match(messageErreurVoix(new Error("Minified React error #418")), /Impossible d’ouvrir le canal vocal/i);
console.log("OK — erreurs de permissions, périphérique audio absent et microphone occupé");

assert.match(messageErreurAuthentification(new Error("Invalid login credentials"), "connexion"), /incorrect/i);
const messageCompteExistant = messageErreurAuthentification(new Error("User already registered"), "inscription");
assert.match(messageCompteExistant, /Si tu as déjà un compte/i);
assert.doesNotMatch(messageCompteExistant, /compte existe déjà/i, "Le formulaire ne doit pas confirmer explicitement qu’un compte existe.");
assert.match(messageErreurAuthentification(new Error("email rate limit exceeded"), "inscription"), /Trop de demandes/i);
assert.match(messageErreurAuthentification(new Error("Erreur système inattendue"), "autorisation"), /demande d’autorisation/i);
assert.match(messageErreurAuthentification(new Error("Token has expired"), "connexion"), /lien de vérification a expiré/i);
assert.match(messageErreurAuthentification(new Error("ERR_INTERNET_DISCONNECTED"), "connexion"), /connexion Internet/i);
assert.match(messageErreurAuthentification({ code: "weak_password" }, "inscription"), /critères requis/i);
assert.match(messageErreurAuthentification({ code: "email_address_invalid" }, "inscription"), /adresse e-mail n’est pas valide/i);
assert.match(messageErreurAuthentification({ code: "over_email_send_rate_limit" }, "inscription"), /Trop de demandes/i);
assert.match(messageErreurAuthentification(new Error("email_not_confirmed"), "connexion"), /Si tu viens de créer un compte/i);
assert.match(messageErreurAuthentification(new Error("access_denied"), "autorisation"), /connexion a été annulée/i);
assert.match(messageErreurAuthentification(new Error("Unable to reset password"), "reinitialisation"), /réinitialisation du mot de passe/i);
assert.match(messageErreurAuthentification(new Error("OAuth redirect_uri is not allowed"), "autorisation"), /pas configurée pour cette adresse/i);
console.log("OK — erreurs de connexion, inscription, OAuth et réinitialisation normalisées");

assert.match(messageErreurFichierNatif(new Error("Permission denied"), "lire"), /autorisations de l’application/i);
assert.match(messageErreurFichierNatif(Object.assign(new Error("No space left on device"), { code: "ENOSPC" }), "lire"), /espace de stockage.*insuffisant/i);
assert.match(messageErreurFichierNatif(Object.assign(new Error("No such file or directory"), { code: "ENOENT" }), "lire"), /n’est plus disponible/i);
assert.match(messageErreurFichierNatif(new Error("native internal failure"), "rechercher"), /Impossible de terminer la recherche/i);
console.log("OK — erreurs d’accès aux fichiers natifs normalisées");

// Les résultats renvoyés au modèle par le canal applicatif peuvent être
// reformulés par celui-ci : ils ne doivent donc pas contenir directement
// les messages bruts des exceptions natives ou JavaScript.
const sourceCanal = await readFile(new URL("../lib/canalAgentApplicatif.ts", import.meta.url), "utf8");
assert.doesNotMatch(
  sourceCanal,
  /envoyerReponse\(id, \{ erreur: e instanceof Error \? e\.message/,
  "Le canal applicatif ne doit pas transmettre directement les erreurs techniques."
);
assert.doesNotMatch(
  sourceCanal,
  /\.catch\(e => envoyerReponse\(id, \{ erreur: e instanceof Error \? e\.message/,
  "Les erreurs des actions natives doivent être normalisées."
);
console.log("OK — les erreurs des actions du canal ne divulguent pas de messages techniques bruts");

const sourceGemini = await readFile(new URL("../lib/geminiLive.ts", import.meta.url), "utf8");
assert.doesNotMatch(
  sourceGemini,
  /functionResponses\.push\(reponseOutil\(appel, \{ error: e instanceof Error \? e\.message/,
  "Les erreurs renvoyées au modèle vocal ne doivent pas contenir les exceptions brutes."
);
assert.match(sourceGemini, /functionResponses\.push\(reponseOutil\(appel, \{ error: messageErreur\(e\) \}\)\)/);
console.log("OK — les erreurs du canal vocal passent par le gestionnaire central");

const sourcePluginElectron = await readFile(
  new URL("../packages/capacitor-pont-natif-electron/electron/src/plugin.mts", import.meta.url),
  "utf8"
);
assert.doesNotMatch(
  sourcePluginElectron,
  /return \{ erreur: e instanceof Error \? e\.message : String\(e\) \}/,
  "Le pont Electron ne doit jamais renvoyer directement le message brut d'une exception."
);
assert.match(sourcePluginElectron, /Échec inattendu d’une action système Electron/);
assert.match(sourcePluginElectron, /Classinus n’a pas pu terminer cette action sur l’ordinateur/);
console.log("OK — les erreurs imprévues du pont Electron sont remplacées par un message utile");

assert.match(
  sourceCanal,
  /messageErreurPlugin\(new Error\(objet\.erreur\)\)/,
  "Le renderer doit normaliser aussi les erreurs renvoyées comme résultat résolu."
);
console.log("OK — les erreurs renvoyées par le pont natif ne contournent pas le gestionnaire");

const sourceCanalTempsReel = await readFile(new URL("../lib/canalTempsReel.ts", import.meta.url), "utf8");
assert.doesNotMatch(
  sourceCanalTempsReel,
  /envoyerReponse\(id, \{ erreur: e instanceof Error \? e\.message/,
  "Les exceptions natives du canal temps réel ne doivent pas être transmises telles quelles."
);
console.log("OK — les erreurs de l’exploration de fichiers ne divulguent pas les messages natifs bruts");

const sourceCrayon = await readFile(new URL("../lib/lectureEntoureCrayon.ts", import.meta.url), "utf8");
assert.doesNotMatch(sourceCrayon, /detail:\s*(?:resultat\.erreur|e instanceof Error \? e\.message)/);
console.log("OK — les diagnostics du pont crayon restent dans la console, pas dans les données transmises");

const pagesAuth = [
  "../app/connexion/page.tsx",
  "../app/inscription/page.tsx",
  "../app/oauth/consent/page.tsx",
];
for (const page of pagesAuth) {
  const source = await readFile(new URL(page, import.meta.url), "utf8");
  assert.doesNotMatch(source, /setErreur\(error\??\.message\)/, page + " ne doit pas afficher directement le message Supabase.");
}
console.log("OK — les erreurs Supabase des écrans de connexion sont normalisées");

const sourceGoogle = await readFile(new URL("../components/BoutonGoogle.tsx", import.meta.url), "utf8");
assert.match(sourceGoogle, /try\s*\{[\s\S]*signInWithOAuth[\s\S]*catch \(e\)[\s\S]*finally\s*\{[\s\S]*setEnCours\(false\)/);
assert.doesNotMatch(sourceGoogle, /setErreur\(resultat\.erreur\)/);
console.log("OK — erreurs Google affichées proprement et fin de chargement garantie");

const sourceMotDePasseOublie = await readFile(new URL("../app/mot-de-passe-oublie/page.tsx", import.meta.url), "utf8");
assert.match(sourceMotDePasseOublie, /try\s*\{[\s\S]*demanderLienReinitialisation[\s\S]*catch \(e\)[\s\S]*finally\s*\{\s*setEnCours\(false\)/);
const sourceReinitialisation = await readFile(new URL("../app/reinitialiser-mot-de-passe/page.tsx", import.meta.url), "utf8");
assert.match(sourceReinitialisation, /catch \(e\)[\s\S]*setEtat\("erreur_verification"\)/);
assert.match(sourceReinitialisation, /error: erreurSession,[\s\S]*if \(erreurSession\) throw erreurSession/);
assert.match(sourceReinitialisation, /try\s*\{[\s\S]*updateUser\([\s\S]*catch \(e\)[\s\S]*finally\s*\{\s*setEnCours\(false\)/);
console.log("OK — vérification et réinitialisation du mot de passe ne restent pas bloquées");

const sourceErreurGlobale = await readFile(new URL("../app/global-error.tsx", import.meta.url), "utf8");
assert.match(sourceErreurGlobale, /import ["']\.\/globals\.css["']/);
assert.match(sourceErreurGlobale, /var\(--dj-fond,/);
console.log("OK — l’écran de secours global charge la charte clair/sombre de Classinus");

const sourceConnexion = await readFile(new URL("../app/connexion/page.tsx", import.meta.url), "utf8");
assert.match(sourceConnexion, /try\s*\{[\s\S]*await connecter\([\s\S]*catch \(erreurConnexion\)[\s\S]*finally\s*\{\s*setEnCours\(false\)/);
const sourceInscription = await readFile(new URL("../app/inscription/page.tsx", import.meta.url), "utf8");
assert.match(sourceInscription, /try\s*\{[\s\S]*await inscrireOuConnecter\([\s\S]*catch \(e\)[\s\S]*erreurInscription = e/);
const sourceOAuth = await readFile(new URL("../app/oauth/consent/page.tsx", import.meta.url), "utf8");
assert.match(sourceOAuth, /async function charger\(\)\s*\{\s*try\s*\{[\s\S]*catch \(e\)[\s\S]*setChargement\(false\)/);
assert.match(sourceOAuth, /async function repondre\([\s\S]*?try\s*\{[\s\S]*?catch \(e\)/);
console.log("OK — les refus et rejets réseau des formulaires sont gérés sans laisser le chargement bloqué");
