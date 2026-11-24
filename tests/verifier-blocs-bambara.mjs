// Page bambara (23/11/2026) : la réponse est découpée en blocs (textes, séries d'images, séries de vidéos) et chaque bloc de
// texte est lu à part. Exécute le découpage et la lecture par bloc, et vérifie leur branchement dans la page.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const lire = (chemin) => readFile(new URL(chemin, import.meta.url), "utf8");
// Les fichiers sont assemblés en un seul module (sans leurs imports) : le test n'a pas de bundler.
const sansImports = (source) => source.replace(/^import[\s\S]*?from\s+"[^"]+";\s*$/gm, "").replace(/^"use client";\s*$/gm, "");
const sources = await Promise.all(["voixBambaraTexte", "voixBambaraFlux", "pageBambaraVisuels", "blocsBambara", "lectureBlocsBambara"].map((n) => lire(`../lib/${n}.ts`)));
const assemble = "const messageDepuisTampons = (t) => (t.length ? { tampons: t.length } : null);\n" + sources.map(sansImports).join("\n");
const js = ts.transpileModule(assemble, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const m = await import("data:text/javascript;base64," + Buffer.from(js).toString("base64"));

// Découpage : l'ordre du modèle est gardé, des textes entre des images, des images entre des vidéos.
const reponse = [
  "Bonjour.",
  "",
  "Voici une vidéo",
  "https://youtu.be/dQw4w9WgXcQ",
  "![chat](https://x.org/chat.png)",
  "![chien](https://x.org/chien.png)",
  "",
  "Fin.",
].join("\n");
const blocs = m.blocsDeReponse(reponse, true);
assert.deepEqual(blocs.map((b) => b.genre + (b.sorte ? ":" + b.sorte : "")), ["texte", "texte", "visuels:video", "visuels:image", "texte"]);
assert.deepEqual(blocs.filter((b) => b.genre === "texte").map((b) => [b.rang, b.texte]), [[0, "Bonjour."], [1, "Voici une vidéo"], [2, "Fin."]]);
assert.equal(blocs[3].visuels.length, 2, "deux images à la suite forment une seule série");
assert.deepEqual(blocs.map((b) => b.id), ["b0", "b1", "b2", "b3", "b4"]);

// Du texte entre deux images les sépare.
const separees = m.blocsDeReponse("![a](https://x.org/a.png)\n\nUn mot.\n\n![b](https://x.org/b.png)", true);
assert.deepEqual(separees.map((b) => b.genre), ["visuels", "texte", "visuels"]);

// Pendant l'écriture : seul ce qui est complet est rendu, et ce qui est rendu ne change plus.
const enCours = m.blocsDeReponse("Un.\n\nDeux.\n\nTro", false);
assert.deepEqual(enCours.map((b) => b.texte), ["Un.", "Deux."], "le paragraphe encore ouvert attend");
assert.equal(m.blocsDeReponse("Une seule phrase sans retour", false).length, 0, "rien avant la fin d'une ligne");
assert.equal(m.blocsDeReponse("Une seule phrase sans retour", true).length, 1);
const final = m.blocsDeReponse("Un.\n\nDeux.\n\nTrois.", true);
assert.deepEqual(final.slice(0, 2), enCours, "les blocs déjà rendus sont les mêmes à la fin");
assert.equal(m.blocsDeReponse("![x](https://x.org/x.pn", false).length, 0, "un lien coupé n'est jamais rendu");

// Un même lien ne s'affiche qu'une fois, les repères de fichiers générés du serveur ne sont ni du texte ni un choix du modèle.
assert.equal(m.blocsDeReponse("![a](https://x.org/a.png)\n![a](https://x.org/a.png)", true)[0].visuels.length, 1);
assert.equal(m.blocsDeReponse("\n\n[Image jointe : https://x.org/gen.png]", true).length, 0);
assert.equal(m.blocsDeReponse("", true).length, 0);
assert.equal(m.idBlocTexte("t1", 2), "t1:b2");

// Lecture : un bloc de texte après l'autre, dès qu'il est complet, chacun avec son vocal.
function fauxLecteur(surLire) {
  const lus = [];
  let coupures = 0;
  return {
    lus,
    lecteur: {
      lire: async (morceaux, surTampon) => { lus.push(morceaux.join(" ")); surTampon?.({}); surLire?.(() => { coupures += 1; }); },
      // Faux flux : chaque phrase ajoutée est « lue » à son tour, après le feu vert avantJouer du premier son.
      flux: ({ surTampon, avantJouer } = {}) => {
        const morceaux = [];
        let termine = false;
        let arrete = false;
        let reveil = null;
        const fini = (async () => {
          let premier = true;
          for (let rang = 0; ; rang += 1) {
            while (rang >= morceaux.length) {
              if (termine || arrete) return;
              await new Promise((r) => { reveil = r; });
            }
            if (arrete) return;
            if (premier) { await avantJouer?.(); premier = false; if (arrete) return; }
            lus.push(morceaux[rang]);
            surTampon?.({});
            surLire?.(() => { coupures += 1; });
          }
        })();
        return {
          ajouter: (n) => { morceaux.push(...n); reveil?.(); },
          terminer: () => { termine = true; reveil?.(); },
          annuler: () => { arrete = true; reveil?.(); },
          fini,
        };
      },
      interrompre: () => { coupures += 1; },
      arreter: () => { coupures += 1; },
      interruptions: () => coupures,
      niveau: () => 0,
    },
  };
}
{
  const { lus, lecteur } = fauxLecteur();
  const audios = [];
  const avant = [];
  const lecture = m.creerLectureBlocs({
    lecteur, texteMax: 500,
    avantBloc: async (rang) => { avant.push(rang); return rang !== 1; },
    surAudioBloc: (rang, message) => audios.push([rang, message.tampons]),
  });
  lecture.suivre("Un.\n\n", false);
  lecture.suivre("Un.\n\nDeux.\n\nTro", false);
  lecture.suivre("Un.\n\nDeux.\n\nTrois.", true);
  await lecture.terminer();
  assert.deepEqual(avant, [0, 1, 2], "chaque bloc attend son feu vert avant d'être lu");
  assert.deepEqual(lus, ["Un.", "Trois."], "un bloc refusé (pas visible, abandonné) n'est pas lu");
  assert.deepEqual(audios.map((a) => a[0]), [0, 2], "un vocal par bloc lu, rattaché à son rang");
}
{
  // Une coupure de la voix pendant un bloc abandonne le reste de la réponse.
  let coupe = true;
  const { lus, lecteur } = fauxLecteur((couper) => { if (coupe) { coupe = false; couper(); } });
  const audios = [];
  const lecture = m.creerLectureBlocs({ lecteur, texteMax: 500, avantBloc: async () => true, surAudioBloc: (rang) => audios.push(rang) });
  lecture.suivre("Un.\n\nDeux.\n\nTrois.", true);
  await lecture.terminer();
  assert.deepEqual(lus, ["Un."], "après une coupure, les blocs suivants ne sont plus lus");
  assert.deepEqual(audios, [0], "la partie déjà lue reste réécoutable");
}
{
  const { lus, lecteur } = fauxLecteur();
  const lecture = m.creerLectureBlocs({ lecteur, texteMax: 500, avantBloc: async () => true, surAudioBloc: () => {} });
  lecture.suivre("Un.\n\n", false);
  lecture.annuler();
  lecture.suivre("Un.\n\nDeux.", true);
  await lecture.terminer();
  assert.ok(lus.length <= 1, "annulée, la lecture ne lit plus rien de nouveau");
}

{
  // Au fil de l'eau : la première phrase d'un bloc encore en train de s'écrire part à la voix avant la fin du bloc.
  const { lus, lecteur } = fauxLecteur();
  const audios = [];
  const lecture = m.creerLectureBlocs({ lecteur, texteMax: 500, avantBloc: async () => true, surAudioBloc: (rang) => audios.push(rang) });
  lecture.suivre("Bonjour a tous. Comment", false);
  for (let i = 0; i < 10; i += 1) await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(lus, ["Bonjour a tous."], "la phrase terminée est lue sans attendre la fin du bloc");
  lecture.suivre("Bonjour a tous. Comment vas-tu ?\n\nDeux.", true);
  await lecture.terminer();
  assert.deepEqual(lus, ["Bonjour a tous.", "Comment vas-tu ?", "Deux."], "chaque phrase est lue une seule fois, dans l'ordre");
  assert.deepEqual(audios, [0, 1], "un vocal par bloc, même lu phrase par phrase");
}

// Branchement : la page découpe la réponse, chaque bloc dit quand il est visible, la voix attend ce signal, et la
// réponse de chaque tour garde un vocal par bloc.
const [page, bloc, voix, ecriture, espace] = await Promise.all([
  lire("../components/bambara/PageBambaraClient.tsx"),
  lire("../components/bambara/BlocTexteBambara.tsx"),
  lire("../lib/voixBambara.ts"),
  lire("../lib/useEcritureBambara.ts"),
  lire("../lib/bambaraEspace.ts"),
]);
assert.match(page, /blocsDeReponse\(tour\.brut, tour\.fini\)/, "le rendu suit les blocs");
assert.match(page, /attendreBlocVisible\(idBlocTexte\(idTour, rang\)\)/, "la voix attend que le bloc soit à l'écran");
assert.match(page, /avantBloc: \(rang\) => avantBlocTexte\(tourVocalRef\.current, rang\)/, "la voix du micro attend aussi");
assert.match(page, /lecture\.suivre\(cumule, false\)/, "les blocs sont lus pendant que la réponse arrive");
assert.match(page, /enregistrerAudioMessageBambara\(\{ conversationId: ids\.conversationId, messageId, sens, bloc, audio \}\)/, "un vocal gardé par bloc");
assert.match(page, /audiosEnvoyesRef\.current\.add\(`\$\{reconstruits\[rang\]\.id\}:\$\{audio\.sens\}:\$\{audio\.bloc \?\? 0\}`\)/, "l'historique ne renvoie pas les vocaux déjà gardés");
assert.match(page, /\[audio\.bloc \?\? 0\]: message/, "à la réouverture, chaque vocal retrouve son bloc");
assert.match(bloc, /IntersectionObserver/, "le bloc surveille sa visibilité");
assert.match(voix, /creerLectureBlocs/);
assert.match(ecriture, /creerLectureBlocs/);
assert.match(espace, /bloc: params\.bloc \?\? 0/, "le rang du bloc part au serveur");
assert.doesNotMatch(sources.join("\n") + page + bloc, / -- /, "pas de double tiret");
console.log("blocs bambara : ok");
