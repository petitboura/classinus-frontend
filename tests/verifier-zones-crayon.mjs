// Test du crayon, lot 3 : rectangle de chaque trait, conversion des zones vers les pixels
// d'écran (échelle de l'écran, zoom, origine de la fenêtre) et choix des éléments entourés.
// Modules purs : tourne sur n'importe quel système, sans Electron.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-zones-'));
try {
  async function charger(entree, nom) {
    const sortie = join(dossier, nom);
    await build({ entryPoints: [resolve(import.meta.dirname, entree)], outfile: sortie, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
    return import(pathToFileURL(sortie).href);
  }
  const { zonesDesTraits, MARGE_ZONE_CRAYON_PX } = await charger('../lib/zonesCrayon.ts', 'page.mjs');
  const { convertirZonesPageEnEcran, elementsDansZones } = await charger('../packages/capacitor-pont-natif-electron/electron/src/zonesCrayon.mts', 'ecran.mjs');

  // 1. Rectangle d'un trait : bornes des points plus la marge.
  const m = MARGE_ZONE_CRAYON_PX;
  let zones = zonesDesTraits([{ id: 1, points: [{ x: 100, y: 50 }, { x: 300, y: 80 }, { x: 150, y: 20 }] }]);
  assert.deepEqual(zones, [{ gauche: 100 - m, haut: 20 - m, droite: 300 + m, bas: 80 + m }]);

  // 2. Un trait réduit à un point (simple clic) a quand même une zone ; un trait vide est ignoré.
  zones = zonesDesTraits([{ id: 1, points: [{ x: 10, y: 10 }] }, { id: 2, points: [] }]);
  assert.equal(zones.length, 1);
  assert.deepEqual(zones[0], { gauche: 10 - m, haut: 10 - m, droite: 10 + m, bas: 10 + m });

  // 3. Plusieurs traits : une zone chacun, dans l'ordre.
  zones = zonesDesTraits([{ id: 1, points: [{ x: 0, y: 0 }] }, { id: 2, points: [{ x: 500, y: 500 }] }]);
  assert.equal(zones.length, 2);
  assert.ok(zones[1].gauche > zones[0].droite);

  // 4. Conversion : écran à 150 %, fenêtre de superposition à l'origine, zoom 1.
  const echelle150 = (p) => ({ x: Math.round(p.x * 1.5), y: Math.round(p.y * 1.5) });
  let ecran = convertirZonesPageEnEcran([{ gauche: 100, haut: 200, droite: 300, bas: 400 }], { x: 0, y: 0 }, 1, echelle150);
  assert.deepEqual(ecran, [{ gauche: 150, haut: 300, droite: 450, bas: 600 }]);

  // 5. Origine décalée (second écran) et zoom de la page.
  ecran = convertirZonesPageEnEcran([{ gauche: 10, haut: 10, droite: 20, bas: 20 }], { x: 1000, y: 100 }, 2, (p) => p);
  assert.deepEqual(ecran, [{ gauche: 1020, haut: 120, droite: 1040, bas: 140 }]);

  // 6. Une conversion qui inverse les coins donne quand même une zone bien ordonnée.
  ecran = convertirZonesPageEnEcran([{ gauche: 0, haut: 0, droite: 10, bas: 10 }], { x: 0, y: 0 }, 1, (p) => ({ x: 100 - p.x, y: 100 - p.y }));
  assert.deepEqual(ecran, [{ gauche: 90, haut: 90, droite: 100, bas: 100 }]);

  // 7. Zones invalides et paramètres invalides : rien de produit, aucune erreur levée.
  assert.deepEqual(convertirZonesPageEnEcran([null, {}, { gauche: 'a', haut: 0, droite: 1, bas: 1 }, { gauche: NaN, haut: 0, droite: 1, bas: 1 }], { x: 0, y: 0 }, 1, (p) => p), []);
  assert.deepEqual(convertirZonesPageEnEcran([{ gauche: 0, haut: 0, droite: 1, bas: 1 }], { x: 0, y: 0 }, 0, (p) => p), []);
  assert.deepEqual(convertirZonesPageEnEcran([{ gauche: 0, haut: 0, droite: 1, bas: 1 }], { x: NaN, y: 0 }, 1, (p) => p), []);

  // 8. Éléments : gardés si leur position tombe dans une zone (bords compris), sinon écartés.
  const el = (nom, x, y) => ({ nom, x, y });
  const liste = [el('Valider', 120, 220), el('Annuler', 500, 220), el('Bord', 300, 400), el('Dehors', 301, 400)];
  const gardes = elementsDansZones(liste, [{ gauche: 100, haut: 200, droite: 300, bas: 400 }]);
  assert.deepEqual(gardes.map((e) => e.nom), ['Valider', 'Bord']);

  // 9. Deux zones : un élément dans l'une ou l'autre est gardé, l'ordre de lecture est conservé.
  const deux = elementsDansZones(liste, [{ gauche: 450, haut: 200, droite: 550, bas: 300 }, { gauche: 100, haut: 200, droite: 200, bas: 300 }]);
  assert.deepEqual(deux.map((e) => e.nom), ['Valider', 'Annuler']);

  // 10. Aucune zone ou aucun élément : liste vide.
  assert.deepEqual(elementsDansZones(liste, []), []);
  assert.deepEqual(elementsDansZones([], [{ gauche: 0, haut: 0, droite: 10, bas: 10 }]), []);

  console.log('zones du crayon : 10 verifications ok');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
