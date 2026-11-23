// Parcours d'inscription vocal de la page bambara (22/11/2026) : vérifie les règles de Bourama, sans réseau.
// Rien en dur (les phrases viennent de Supabase), aucun texte lisible à l'écran, les trois étapes, le nom réécouté
// par la voix de Classinus, et les codes d'erreur en français et en anglais.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), "utf8");
const crochet = lire("lib/useParcoursBambara.ts");
const api = lire("lib/parcoursBambara.ts");
const ecran = lire("components/bambara/ParcoursInscriptionBambara.tsx");
const panneau = lire("components/bambara/PanneauProfilBambara.tsx");
const barre = lire("components/bambara/BarreHautBambara.tsx");
const erreurs = lire("lib/erreurs.ts");

// Les phrases lues par la voix viennent de Supabase, jamais du code.
assert.match(api, /\/api\/bambara\/parcours\/textes/, "les phrases viennent du serveur");
assert.match(crochet, /listerTextesParcoursBambara/, "le parcours charge les phrases");
assert.doesNotMatch(crochet, /lire\(\[\s*["'`]/, "aucune phrase écrite en dur dans la lecture");
for (const cle of ["nom_demande", "nom_reecoute", "genre_demande", "presentation_demande", "fin"]) {
  assert.match(api, new RegExp(cle), `clé ${cle}`);
  assert.match(crochet, new RegExp(cle), `clé ${cle} utilisée`);
}

// Étape du nom : transcrit, puis la voix de Classinus dit ce nom (synthèse), la personne réécoute les deux.
assert.match(crochet, /transcrireVoixBambara/, "le nom est transcrit");
assert.match(crochet, /synthetiserVoixBambara\(nomPropre\)/, "la voix de Classinus dit le nom");
assert.match(ecran, /parcours-moi/);
assert.match(ecran, /parcours-classinus/);

// Étape du genre : deux choix visuels. Étape de la présentation : facultative, on peut passer.
assert.match(ecran, /\["femme", "homme"\]/, "choix femme ou homme");
assert.match(ecran, /terminer\(false\)/, "la présentation se passe");

// Aucun texte lisible : le nom transcrit n'est jamais écrit à l'écran, seulement des libellés d'accessibilité.
assert.doesNotMatch(ecran, /\{p\.nom\}|\{p\.presentation\}/, "le nom et la présentation ne sont pas affichés");
assert.match(ecran, /fr: \{[\s\S]*en: \{/, "libellés d'accessibilité en français et en anglais");

// Le panneau profil n'a plus de champs écrits : un bouton lance le parcours.
assert.doesNotMatch(panneau, /<input/, "plus de champ écrit");
assert.match(panneau, /surNouveauParcours/);
assert.match(barre, /ParcoursInscriptionBambara/);

// Codes d'erreur dans les deux langues.
for (const code of ["BAMBARA_NOM_PARLE_INVALIDE", "BAMBARA_PROFIL_GENRE_INVALIDE", "BAMBARA_PRESENTATION_INVALIDE"]) {
  assert.equal(erreurs.split(code).length - 1, 2, `${code} en français et en anglais`);
}
assert.doesNotMatch(crochet + api + ecran + panneau, / -- /, "pas de double tiret");

console.log("parcours bambara : ok");

// Le système suit les changements : phrases jamais mises en cache, relues à chaque réécoute de la consigne,
// et la voix du nom passe par la même synthèse que le reste de la page (si la voix change, elle change ici aussi).
{
  const api2 = readFileSync(new URL("../lib/parcoursBambara.ts", import.meta.url), "utf8");
  const crochet2 = readFileSync(new URL("../lib/useParcoursBambara.ts", import.meta.url), "utf8");
  assert.match(api2, /cache: "no-store"/, "phrases jamais gardées en cache");
  assert.match(crochet2, /textesRef\.current = listerTextesParcoursBambara\(\)/, "phrases relues à la réécoute");
  assert.match(crochet2, /import \{ synthetiserVoixBambara, transcrireVoixBambara \} from "\.\/voixBambaraApi"/, "même synthèse que la page");
  console.log("parcours bambara : suivi des changements ok");
}
