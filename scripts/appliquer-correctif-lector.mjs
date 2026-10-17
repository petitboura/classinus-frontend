// Correctif de @anaralabs/lector 3.7.1 (voir components/VisionneurPdf.tsx, PageALaDemande).
// Lancé après chaque "npm install" (postinstall). Remplace patch-package, qui échouait
// sur Vercel quand le cache de la build précédente contenait déjà une ancienne version
// du correctif. Ce script peut être relancé autant de fois qu'on veut : chaque
// remplacement est ignoré s'il est déjà fait, et le script s'arrête avec une erreur
// claire si le texte attendu n'est trouvé ni avant ni après (bibliothèque changée).
//
// 1. À l'ouverture, ne lire que la page 1 (au lieu des dimensions de toutes les pages),
//    les autres pages ayant par défaut la taille de la page 1.
// 2. Second dessin haute définition : refait 200 ms après l'arrêt du défilement (au
//    lieu de 20 ms) et plafonné à l'échelle 3.
import fs from "node:fs";

const dossier = process.argv[2] || "node_modules/@anaralabs/lector";
const fichier = dossier + "/dist/index.js";
const VERSION_ATTENDUE = "3.7.1";

if (!fs.existsSync(fichier)) {
  console.log("correctif lector : bibliotheque absente, rien a faire.");
  process.exit(0);
}
const version = JSON.parse(fs.readFileSync(dossier + "/package.json", "utf8")).version;
if (version !== VERSION_ATTENDUE) {
  console.error("correctif lector : version " + version + " installee, " + VERSION_ATTENDUE + " attendue. Le correctif doit etre refait pour cette version.");
  process.exit(1);
}

const remplacements = [
  { nom: "pages chargees au defilement", ancien: "    const generateViewports = async (pdf) => {\n      const pageProxies = [];\n      const rotations = [];\n      const viewports = await Promise.all(\n        Array.from({ length: pdf.numPages }, async (_2, index) => {\n          const page = await pdf.getPage(index + 1);\n          const deltaRotate = page.rotate || 0;\n          const viewport = page.getViewport({\n            scale: 1,\n            rotation: rotation + deltaRotate\n          });\n          pageProxies.push(page);\n          rotations.push(page.rotate);\n          return viewport;\n        })\n      );\n      const sortedPageProxies = pageProxies.sort((a, b) => {\n        return a.pageNumber - b.pageNumber;\n      });\n      setInitialState((prev) => ({\n        ...prev,\n        isZoomFitWidth,\n        viewports,\n        pageProxies: sortedPageProxies,\n        pdfDocumentProxy: pdf,\n        zoom,\n        zoomOptions\n      }));\n    };\n", nouveau: "    const generateViewports = async (pdf) => {\n      const premierePage = await pdf.getPage(1);\n      const premierViewport = premierePage.getViewport({\n        scale: 1,\n        rotation: rotation + (premierePage.rotate || 0)\n      });\n      const pageProxies = new Array(pdf.numPages);\n      pageProxies[0] = premierePage;\n      const viewports = Array.from({ length: pdf.numPages }, () => premierViewport);\n      setInitialState((prev) => ({\n        ...prev,\n        isZoomFitWidth,\n        viewports,\n        pageProxies,\n        pdfDocumentProxy: pdf,\n        zoom,\n        zoomOptions\n      }));\n    };\n" },
  { nom: "second dessin differe", ancien: "useDebounce(scrollTick, 20);", nouveau: "useDebounce(scrollTick, 200);" },
  { nom: "second dessin plafonne", ancien: "const targetDetailScale = dpr * zoom * 1.3;", nouveau: "const targetDetailScale = Math.min(dpr * zoom * 1.3, 3);" },
];

let texte = fs.readFileSync(fichier, "utf8");
let modifie = false;
for (const r of remplacements) {
  if (texte.includes(r.nouveau)) {
    console.log("correctif lector : " + r.nom + " : deja fait.");
  } else if (texte.includes(r.ancien)) {
    texte = texte.replace(r.ancien, () => r.nouveau);
    modifie = true;
    console.log("correctif lector : " + r.nom + " : applique.");
  } else {
    console.error("correctif lector : " + r.nom + " : texte attendu introuvable, la bibliotheque a change.");
    process.exit(1);
  }
}
if (modifie) fs.writeFileSync(fichier, texte);
