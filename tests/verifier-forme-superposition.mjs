// Test de la forme de la fenetre de superposition PC (18/10/2026) : la fenetre est decoupee a
// la forme de ce que la page affiche (BrowserWindow.setShape).
// Partie 1 : module pur du processus principal (forme.mts), sans Electron.
// Partie 2 : mesure de la page (lib/formeSuperposition.ts) dans un vrai Chromium, avec des
// pages qui reproduisent les cas de la superposition (bouton fixe, menu qui depasse, bulle qui
// defile, element masque, marques, traits). Partie 2 ignoree si Chromium n'est pas disponible.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const dossier = await mkdtemp(join(tmpdir(), 'classinus-forme-'));
try {
  // ---------- Partie 1 : forme.mts ----------
  const sortieForme = join(dossier, 'forme.mjs');
  await build({ entryPoints: [resolve(import.meta.dirname, '../packages/capacitor-superposition-electron/electron/src/forme.mts')], outfile: sortieForme, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { construireForme, creerGestionnaireForme, FORME_VIDE, NB_MAX_RECTS_FORME } = await import(pathToFileURL(sortieForme).href);

  // 1. Conversion : zoom 1, bornes a la fenetre, arrondi vers l'exterieur.
  assert.deepEqual(construireForme([{ x: 10.4, y: 20.6, largeur: 100.2, hauteur: 50 }], 1, 1920, 1080), [{ x: 10, y: 20, width: 101, height: 51 }]);
  // 2. Zoom de la page : les pixels de la page sont multiplies.
  assert.deepEqual(construireForme([{ x: 10, y: 10, largeur: 100, hauteur: 100 }], 1.5, 1920, 1080), [{ x: 15, y: 15, width: 150, height: 150 }]);
  // 3. Zone qui deborde de la fenetre : bornee, zone entierement dehors : ecartee.
  assert.deepEqual(construireForme([{ x: -50, y: -50, largeur: 100, hauteur: 100 }], 1, 1920, 1080), [{ x: 0, y: 0, width: 50, height: 50 }]);
  assert.deepEqual(construireForme([{ x: 1900, y: 1000, largeur: 100, hauteur: 200 }], 1, 1920, 1080), [{ x: 1900, y: 1000, width: 20, height: 80 }]);
  assert.deepEqual(construireForme([{ x: 3000, y: 0, largeur: 10, hauteur: 10 }, { x: -200, y: 0, largeur: 100, hauteur: 10 }], 1, 1920, 1080), []);
  // 4. Zones invalides ignorees sans erreur ; entree qui n'est pas une liste : vide.
  assert.deepEqual(construireForme([null, 3, {}, { x: 'a', y: 0, largeur: 1, hauteur: 1 }, { x: NaN, y: 0, largeur: 1, hauteur: 1 }, { x: 0, y: 0, largeur: 0, hauteur: 5 }, { x: 0, y: 0, largeur: -4, hauteur: 5 }], 1, 100, 100), []);
  assert.deepEqual(construireForme('nimporte quoi', 1, 100, 100), []);
  assert.deepEqual(construireForme(undefined, 1, 100, 100), []);
  // 5. Parametres de fenetre invalides : rien de produit.
  assert.deepEqual(construireForme([{ x: 0, y: 0, largeur: 10, hauteur: 10 }], 0, 100, 100), []);
  assert.deepEqual(construireForme([{ x: 0, y: 0, largeur: 10, hauteur: 10 }], 1, 0, 100), []);
  assert.deepEqual(construireForme([{ x: 0, y: 0, largeur: 10, hauteur: 10 }], 1, NaN, 100), []);
  // 6. Trop de zones : un seul rectangle englobant.
  const beaucoup = Array.from({ length: NB_MAX_RECTS_FORME + 5 }, (_, i) => ({ x: i * 10, y: i * 5, largeur: 5, hauteur: 5 }));
  const englobant = construireForme(beaucoup, 1, 5000, 5000);
  assert.equal(englobant.length, 1);
  assert.equal(englobant[0].x, 0);
  assert.equal(englobant[0].width, (NB_MAX_RECTS_FORME + 4) * 10 + 5);

  // Fausse fenetre pour le gestionnaire.
  function creer({ supportee = true, fenetre = { largeur: 1920, hauteur: 1080, zoom: 1 }, lever = false } = {}) {
    const etat = { appels: [], resets: 0, erreurs: [], fenetre };
    const g = creerGestionnaireForme({
      plateformeSupportee: supportee,
      fenetre: () => etat.fenetre,
      appliquer: (rects) => { if (lever) throw new Error('setShape absent'); etat.appels.push(rects); },
      reinitialiser: () => { etat.resets++; },
      surErreur: (e) => etat.erreurs.push(e),
    });
    return { g, etat };
  }
  const bouton = [{ x: 0, y: 0, largeur: 50, hauteur: 50 }];

  // 7. Rien mesure : la fenetre garde sa taille entiere (aucun appel).
  let { g, etat } = creer();
  g.reposer();
  assert.equal(etat.appels.length, 0);
  // 8. Premiere mesure : forme appliquee ; meme mesure : pas de second appel.
  g.definirRects(bouton);
  assert.deepEqual(etat.appels, [[{ x: 0, y: 0, width: 50, height: 50 }]]);
  g.definirRects(bouton);
  assert.equal(etat.appels.length, 1);
  // 9. Mesure vide : jamais une liste vide (elle remettrait la fenetre entiere), un point de 1 pixel.
  g.definirRects([]);
  assert.deepEqual(etat.appels.at(-1), FORME_VIDE);
  assert.ok(etat.appels.every((r) => r.length > 0));
  // 10. Crayon sorti : fenetre entiere ; crayon range : retour a la derniere mesure.
  g.definirRects(bouton);
  g.definirPleinEcran(true);
  assert.deepEqual(etat.appels.at(-1), [{ x: 0, y: 0, width: 1920, height: 1080 }]);
  g.definirRects([{ x: 5, y: 5, largeur: 10, hauteur: 10 }]);
  assert.deepEqual(etat.appels.at(-1), [{ x: 0, y: 0, width: 1920, height: 1080 }], 'une mesure pendant le crayon ne reduit pas la forme');
  g.definirPleinEcran(false);
  assert.deepEqual(etat.appels.at(-1), [{ x: 5, y: 5, width: 10, height: 10 }]);
  // 11. Fenetre fermee : rien d'applique, pas d'erreur.
  ({ g, etat } = creer({ fenetre: null }));
  g.definirRects(bouton);
  assert.equal(etat.appels.length, 0);
  // 12. Plateforme sans setShape (macOS) : jamais d'appel.
  ({ g, etat } = creer({ supportee: false }));
  g.definirRects(bouton);
  g.definirPleinEcran(true);
  assert.equal(etat.appels.length, 0);
  // 13. setShape echoue : la fenetre est remise entiere, une seule fois, et on n'insiste plus.
  ({ g, etat } = creer({ lever: true }));
  g.definirRects(bouton);
  g.definirRects([{ x: 9, y: 9, largeur: 9, hauteur: 9 }]);
  assert.equal(etat.resets, 1);
  assert.equal(etat.erreurs.length, 1);
  assert.equal(g.estIndisponible(), true);
  // 13b. Zone d'affichage seul sous le pointeur : retiree (le clic traverse), sauf si une zone
  // interactive est aussi dessous. estActif : faux avant la premiere mesure, vrai ensuite.
  ({ g, etat } = creer());
  assert.equal(g.estActif(), false);
  g.definirRects([{ x: 0, y: 0, largeur: 50, hauteur: 50, interactif: true }, { x: 100, y: 100, largeur: 50, hauteur: 50, interactif: false }]);
  assert.equal(g.estActif(), true);
  assert.equal(etat.appels.at(-1).length, 2);
  g.definirPointeur({ x: 120, y: 120 });
  assert.deepEqual(etat.appels.at(-1), [{ x: 0, y: 0, width: 50, height: 50 }]);
  g.definirPointeur({ x: 10, y: 10 });
  assert.equal(etat.appels.at(-1).length, 2);
  g.definirRects([{ x: 0, y: 0, largeur: 50, hauteur: 50, interactif: true }, { x: 0, y: 0, largeur: 90, hauteur: 90, interactif: false }]);
  assert.equal(etat.appels.at(-1).length, 2, 'interactif dessous : rien n est retire');
  ({ g, etat } = creer({ supportee: false }));
  g.definirRects(bouton);
  assert.equal(g.estActif(), false);
  // 14. Fenetre redimensionnee ou recreee : reposer() reapplique la forme.
  ({ g, etat } = creer());
  g.definirRects(bouton);
  etat.fenetre = { largeur: 1280, hauteur: 720, zoom: 2 };
  g.reposer();
  assert.deepEqual(etat.appels.at(-1), [{ x: 0, y: 0, width: 100, height: 100 }]);
  console.log('Partie 1 (forme.mts) : ok');

  // ---------- Partie 2 : mesure de la page dans Chromium ----------
  const sortiePage = join(dossier, 'forme-page.js');
  await build({
    entryPoints: [resolve(import.meta.dirname, '../lib/formeSuperposition.ts')], outfile: sortiePage, bundle: true, platform: 'browser', format: 'iife', globalName: 'FormePage', logLevel: 'silent',
    alias: { '@/lib/superpositionElectron': resolve(import.meta.dirname, 'fausse-superposition-electron.mjs') },
  });

  let chromium;
  try { ({ chromium } = await import('playwright')); } catch { chromium = null; }
  const candidats = [undefined, '/opt/pw-browsers/chromium'].filter((c) => c === undefined || existsSync(c));
  let navigateur = null;
  if (chromium) {
    for (const executablePath of candidats) {
      try { navigateur = await chromium.launch(executablePath ? { executablePath } : {}); break; } catch { /* essai suivant */ }
    }
  }
  if (!navigateur) {
    console.log('Partie 2 (mesure de la page) : ignoree, Chromium indisponible');
  } else {
    try {
      const page = await navigateur.newPage({ viewport: { width: 1200, height: 800 } });
      const html = `<!doctype html><html><head><style>
        html,body{margin:0;background:transparent}
        .fixe{position:fixed}
        #groupe{left:20px;bottom:20px;width:60px;height:60px}
        #menu{position:absolute;bottom:100%;left:0;width:200px;height:150px}
        #menu.ferme{opacity:0}
        #bulle{left:400px;top:100px;width:300px;height:200px;overflow-y:auto}
        #bulle .long{height:5000px;width:280px}
        #cache{left:900px;top:10px;width:50px;height:50px;visibility:hidden}
        #nondisplay{left:900px;top:100px;width:50px;height:50px;display:none}
        #couche{left:0;top:0;width:100%;height:100%}
      </style></head><body>
        <div id="groupe" class="fixe"><div id="menu" class="ferme"></div></div>
        <div id="bulle" class="fixe"><div class="long"></div></div>
        <div id="cache" class="fixe"></div><div id="nondisplay" class="fixe"></div>
        <svg id="couche" class="fixe" data-agent-forme="exclure">
          <g id="trait" data-agent-forme="inclure"><path d="M 600 500 L 700 500" stroke="red" stroke-width="4"/></g>
          <g id="vide" data-agent-forme="inclure"></g>
        </svg>
      </body></html>`;
      await page.setContent(html);
      await page.addScriptTag({ path: sortiePage });
      const mesurer = () => page.evaluate(() => window.FormePage.calculerRectsForme(document));
      const M = 40; // MARGE_FORME_PX
      const contient = (rects, x, y, l, h) => rects.some((r) => r.x <= x - M + 1 && r.y <= y - M + 1 && r.x + r.largeur >= x + l + M - 1 && r.y + r.hauteur >= y + h + M - 1);

      let rects = await mesurer();
      // 15. Bouton fixe en bas a gauche (20,720 60x60) : mesure avec sa marge.
      assert.ok(contient(rects, 20, 720, 60, 60), 'le bouton fixe est dans la forme');
      // 16. Menu ferme (opacite 0) : pas dans la forme.
      const hautSansMenu = Math.min(...rects.filter((r) => r.x < 300).map((r) => r.y));
      assert.ok(hautSansMenu >= 720 - M - 1, `menu ferme exclu (haut ${hautSansMenu})`);
      // 17. Menu ouvert : ce qui depasse du bouton (absolute au dessus) est dans la forme.
      await page.evaluate(() => document.getElementById('menu').classList.remove('ferme'));
      rects = await mesurer();
      assert.ok(contient(rects, 20, 570, 200, 150), 'le menu ouvert qui depasse du bouton est dans la forme');
      // 18. Bulle qui defile : sa boite seulement, pas les 5000 px de son contenu.
      assert.ok(contient(rects, 400, 100, 300, 200), 'la bulle est dans la forme');
      assert.ok(!rects.some((r) => r.x + r.largeur > 700 + M - 1 && r.x < 700 && r.y + r.hauteur > 1500), 'le contenu qui defile ne grandit pas la forme');
      assert.ok(Math.max(...rects.map((r) => r.y + r.hauteur)) < 900, 'aucune zone ne depasse la page');
      // 19. Elements masques (visibility hidden, display none) : absents.
      assert.ok(!rects.some((r) => r.x > 850 && r.x < 1000), 'elements masques exclus');
      // 20. Couche plein ecran exclue, trait inclus (trait horizontal : hauteur nulle, quand meme mesure), conteneur vide ignore.
      assert.ok(!rects.some((r) => r.largeur >= 1200 && r.hauteur >= 800), 'la couche plein ecran est exclue');
      assert.ok(rects.some((r) => r.x <= 600 - M + 1 && r.x + r.largeur >= 700 + M - 1 && r.y <= 500 - M + 1 && r.y + r.hauteur >= 500 + M - 1), 'le trait est dans la forme');
      assert.ok(!rects.some((r) => r.x <= 0 && r.y <= 0 && r.largeur < 200 && r.hauteur < 200), 'le conteneur vide du crayon n ajoute rien');
      // 21. Plus de zone contenue dans une autre.
      for (const a of rects) for (const b of rects) if (a !== b) assert.ok(!(a.x <= b.x && a.y <= b.y && a.x + a.largeur >= b.x + b.largeur && a.y + a.hauteur >= b.y + b.hauteur), 'pas de zone contenue dans une autre');
      // 22. Element en transition d'apparition (opacite 0 mais animation en cours) : compte deja.
      await page.evaluate(() => {
        const e = document.createElement('div');
        e.id = 'apparait'; e.className = 'fixe'; e.style.cssText = 'left:900px;top:300px;width:80px;height:80px;opacity:0;transition:opacity 5s';
        document.body.appendChild(e);
        void e.offsetWidth; e.style.opacity = '1';
      });
      rects = await mesurer();
      assert.ok(contient(rects, 900, 300, 80, 80), 'un element qui apparait est deja dans la forme');
      // 23. Page vide : liste vide.
      await page.setContent('<!doctype html><html><body></body></html>');
      await page.addScriptTag({ path: sortiePage });
      assert.deepEqual(await mesurer(), []);
      // 24. reduireRects : contenu retire, plafond respecte.
      const reduit = await page.evaluate(() => {
        const { reduireRects, NB_MAX_RECTS_FORME } = window.FormePage;
        const a = reduireRects([{ x: 0, y: 0, largeur: 100, hauteur: 100 }, { x: 10, y: 10, largeur: 20, hauteur: 20 }, { x: 200, y: 0, largeur: 10, hauteur: 10 }]);
        const b = reduireRects(Array.from({ length: NB_MAX_RECTS_FORME + 3 }, (_, i) => ({ x: i * 100, y: 0, largeur: 10, hauteur: 10 })));
        return { a, b, max: NB_MAX_RECTS_FORME };
      });
      assert.equal(reduit.a.length, 2);
      assert.equal(reduit.b.length, 1);
      // 25. Suivi : un seul envoi tant que rien ne bouge, un nouvel envoi quand un element bouge.
      await page.setContent('<!doctype html><html><body><div id="b" style="position:fixed;left:10px;top:10px;width:30px;height:30px"></div></body></html>');
      await page.addScriptTag({ path: sortiePage });
      const envois = await page.evaluate(async () => {
        const recus = [];
        window.FormePage.demarrerSuiviForme(document, (r) => recus.push(r));
        const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
        await attendre(200);
        const avant = recus.length;
        await attendre(600);
        const stable = recus.length;
        document.getElementById('b').style.left = '300px';
        await attendre(200);
        return { avant, stable, apres: recus.length };
      });
      assert.equal(envois.avant, 1, 'premiere mesure envoyee');
      assert.equal(envois.stable, 1, 'rien ne bouge, rien n est renvoye');
      assert.equal(envois.apres, 2, 'un element bouge, nouvelle forme envoyee');
      console.log('Partie 2 (mesure de la page) : ok');
    } finally {
      await navigateur.close();
    }
  }
  console.log('Forme de la superposition : tout est bon.');
} finally {
  await rm(dossier, { recursive: true, force: true });
}
