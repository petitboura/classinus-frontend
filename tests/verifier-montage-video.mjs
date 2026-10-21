import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (chemin) => readFileSync(new URL(`../${chemin}`, import.meta.url), "utf8");

const editeur = lire("components/chat/EditeurVideoContextuel.tsx");
const barre = lire("components/chat/BarreDeSaisie.tsx");
const chat = lire("components/chat/ChatIA.tsx");
const api = lire("lib/api.ts");
const types = lire("lib/videoMontage.ts");
const apercus = lire("components/chat/LigneApercuPieces.tsx");

// Le bouton contextuel ne s'affiche qu'après la sélection d'un passage ou d'une zone.
assert.match(editeur, /const selectionFaite = intervalleActif \|\| zone !== null/);
assert.match(editeur, /\{selectionFaite && \(/);
assert.match(editeur, /Demander à Clovis/);
assert.match(editeur, /aria-label="Début de la sélection"/);
assert.match(editeur, /aria-label="Fin de la sélection"/);
assert.match(editeur, /function demarrerZone/);
assert.match(editeur, /function terminerZone/);
assert.match(editeur, /video_id: source\.video_id/);
assert.match(editeur, /\.\.\.\(intervalleActif \? \{ debut, fin \} : \{\}\)/);
assert.match(editeur, /\.\.\.\(zone \? \{ zone \} : \{\}\)/);
assert.doesNotMatch(editeur, /React\.PointerEvent|setDeplacement|deplacement/);

// Une vignette vidéo du chat ouvre l'éditeur contextuel sans modifier le lecteur audio.
assert.match(apercus, /onClick=\{\(\) => onOuvrir\(carre\)\}/);
assert.match(barre, /import \{ EditeurVideoContextuel \} from "\.\/EditeurVideoContextuel"/);
assert.match(barre, /else if \(piece\.genre === "video"\)/);
assert.match(barre, /<EditeurVideoContextuel/);
assert.match(barre, /onEnvoyer\(demande, longueur, \[\], null, \[\], false, sansEnseignant, \[\], false, contexteVideo\)/);

// L'upload de montage est distinct de l'ancien upload avec transcription automatique.
assert.match(api, /export async function uploaderVideoEspace/);
assert.match(api, /\/api\/uploads\/video-workspace/);
assert.match(chat, /contexte_video: contexteVideo \?\? null/);
assert.match(chat, /ContexteVideoMontage/);
assert.match(types, /export type ContexteVideoMontage/);
assert.match(types, /export type ZoneSelectionVideo/);

console.log("Video editor wiring checks passed.");
