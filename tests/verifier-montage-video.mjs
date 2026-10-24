import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), "utf8");

const editeur = lire("components/chat/EditeurVideoContextuel.tsx");
const barre = lire("components/chat/BarreDeSaisie.tsx");
const chat = lire("components/chat/ChatIA.tsx");
const api = lire("lib/api.ts");
const types = lire("lib/videoMontage.ts");
const apercus = lire("components/chat/LigneApercuPieces.tsx");
const textes = lire("lib/textesEditeurVideo.ts");

assert.match(editeur, /const selectionFaite = intervalleActif \|\| \(zone !== null && origineRef\.current === null\)/);
assert.match(editeur, /\{selectionFaite && \(/);
assert.match(editeur, /\{t\.demander\}/);
assert.match(textes, /demander: "Demander à Clovis"/);
assert.match(editeur, /aria-label=\{t\.ariaDebut\}/);
assert.match(textes, /ariaDebut: "Début de la sélection"/);
assert.match(editeur, /aria-label=\{t\.ariaFin\}/);
assert.match(textes, /ariaFin: "Fin de la sélection"/);
assert.match(editeur, /function demarrerZone/);
assert.match(editeur, /function terminerZone/);
assert.match(editeur, /video_id: source\.video_id/);
assert.match(editeur, /\.\.\.\(intervalleActif \? \{ debut, fin \} : \{\}\)/);
assert.match(editeur, /\.\.\.\(zone \? \{ zone \} : \{\}\)/);
assert.doesNotMatch(editeur, /React\.PointerEvent|setDeplacement|deplacement/);

assert.match(apercus, /onClick=\{\(e\) => onOuvrir\(carre, e\.currentTarget\)\}/);
assert.match(barre, /import \{ EditeurVideoContextuel \} from "\.\/EditeurVideoContextuel"/);
assert.match(barre, /else if \(piece\.genre === "video"\)/);
assert.match(barre, /<EditeurVideoContextuel/);
assert.match(barre, /onEnvoyer\(demande, longueur, \[\], null, \[\], false, sansEnseignant, \[\], false, contexteVideo\)/);

assert.match(api, /export async function uploaderVideoEspace/);
assert.match(api, /\/api\/uploads\/video-workspace/);
assert.match(chat, /contexte_video: contexteVideo \?\? null/);
assert.match(chat, /ContexteVideoMontage/);
assert.match(types, /export type ContexteVideoMontage/);
assert.match(types, /export type ZoneSelectionVideo/);

// Correctifs du 22/10/2026
// 1. L'envoi ne vide que ce qui est réellement transmis avec la demande.
const blocEnvoi = barre.slice(barre.indexOf("onEnvoyer={(demande, contexteVideo)"), barre.indexOf("{imageAgrandieId &&"));
assert.doesNotMatch(blocEnvoi, /setTextesColles\(\[\]\)/);
assert.doesNotMatch(blocEnvoi, /setLocalisation\(null\)/);
assert.doesNotMatch(blocEnvoi, /setRechercheForcee\(false\)/);
// 2. L'éditeur se ferme avec une animation et n'est plus démonté d'un coup à l'envoi.
assert.match(editeur, /useFermetureAnimee\(\)/);
assert.match(editeur, /demarrerFermeture\(onClose\)/);
assert.match(editeur, /animate-cgpt-sortie-modal/);
assert.doesNotMatch(blocEnvoi.slice(blocEnvoi.indexOf("onEnvoyer={")), /setVideoPourEdition\(null\)/);
assert.match(barre, /videoEnvoyeeRef/);
// 3. Textes par langue : plus de français en dur dans l'éditeur ni dans l'envoi de la vidéo.
assert.match(textes, /TEXTES_EN/);
assert.match(api, /textesEditeurVideo\(\)/);
assert.match(api, /"Accept-Language": obtenirLocale\(\) \},\n    body: corps/);
assert.doesNotMatch(editeur, /Impossible de préparer cette vidéo/);
// 4. Clic sur une vidéo jointe : menu aperçu ou éditeur, via FlottantAncre.
const menuVideo = lire("components/chat/MenuChoixVideoJointe.tsx");
assert.match(menuVideo, /FlottantAncre/);
assert.match(menuVideo, /t\.menuApercu/);
assert.match(menuVideo, /t\.menuModifier/);
assert.match(apercus, /onOuvrir\(carre, e\.currentTarget\)/);
assert.match(barre, /<MenuChoixVideoJointe/);
assert.match(barre, /onApercu=\{\(\) => setMediaOuvertId\(fichierChoixVideo\.id\)\}/);
assert.match(textes, /menuApercu: "Aperçu"/);
assert.match(textes, /menuModifier: "Modifier avec Clovis"/);

console.log("Video editor wiring checks passed.");
