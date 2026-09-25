// Worker d'exécution Python pour le bouton Exécuter des blocs de code du chat.
// Python (Pyodide) tourne entièrement dans l'appareil de l'étudiant : rien
// n'est envoyé à un serveur et aucun code inconnu ne s'exécute sur le
// serveur de l'app. Le worker vit dans un fichier à part pour ne jamais
// bloquer l'interface pendant un calcul long, et pour pouvoir être coupé net
// (terminate) si le code tourne trop longtemps.
//
// Pyodide 314 exige un worker de type module. La version est fixée : une
// adresse non versionnée de la CDN ne doit jamais servir en production.
const VERSION_PYODIDE = "314.0.7";
const URL_PYODIDE = `https://cdn.jsdelivr.net/pyodide/v${VERSION_PYODIDE}/full/`;

// Exécuté une seule fois après le chargement de Pyodide.
const PRELUDE_PYTHON = `
import builtins, os, json, sys, io, base64

# Sans écran, matplotlib doit dessiner en mémoire. Les figures sont
# récupérées après l'exécution et envoyées comme images.
os.environ["MPLBACKEND"] = "Agg"

def _input_indisponible(*args, **kwargs):
    raise RuntimeError("input() n'est pas disponible ici : écris la valeur directement dans le code.")

builtins.input = _input_indisponible

def _figures_png():
    if "matplotlib.pyplot" not in sys.modules:
        return "[]"
    plt = sys.modules["matplotlib.pyplot"]
    images = []
    for numero in plt.get_fignums():
        tampon = io.BytesIO()
        plt.figure(numero).savefig(tampon, format="png", dpi=110, bbox_inches="tight")
        images.append(base64.b64encode(tampon.getvalue()).decode())
    plt.close("all")
    return json.dumps(images)
`;

let promessePyodide = null;

function chargerPyodide() {
  if (!promessePyodide) {
    promessePyodide = import(`${URL_PYODIDE}pyodide.mjs`)
      .then(({ loadPyodide }) => loadPyodide({ indexURL: URL_PYODIDE }))
      .then((pyodide) => {
        pyodide.runPython(PRELUDE_PYTHON);
        return pyodide;
      })
      .catch((erreur) => {
        // Permet de réessayer au prochain clic (connexion revenue).
        promessePyodide = null;
        throw erreur;
      });
  }
  return promessePyodide;
}

// Garde uniquement les lignes utiles à l'étudiant : le traceback complet de
// Pyodide contient des lignes internes qui n'ont aucun sens pour lui.
function nettoyerTraceback(message) {
  const lignes = String(message).split("\n");
  const debut = lignes.findIndex((ligne) => ligne.includes('File "<exec>"'));
  if (debut <= 0) return lignes.join("\n").trim();
  return ["Traceback (most recent call last):", ...lignes.slice(debut)].join("\n").trim();
}

self.onmessage = async (evenement) => {
  const { id, code } = evenement.data;
  const envoyer = (type, extra) => self.postMessage({ id, type, ...extra });

  let pyodide;
  try {
    envoyer("statut", { etat: "chargement" });
    pyodide = await chargerPyodide();
  } catch (erreur) {
    envoyer("erreur_chargement", {
      texte: "Impossible de charger Python. Vérifie ta connexion internet puis réessaie.",
    });
    return;
  }

  pyodide.setStdout({ batched: (texte) => envoyer("sortie", { flux: "stdout", texte }) });
  pyodide.setStderr({ batched: (texte) => envoyer("sortie", { flux: "stderr", texte }) });

  const globals = pyodide.globals.get("dict")();
  // Sans ça, le classique if __name__ == "__main__": ne s'exécuterait jamais.
  globals.set("__name__", "__main__");
  try {
    envoyer("statut", { etat: "paquets" });
    // Télécharge seulement les bibliothèques réellement importées par le code
    // (numpy, sympy, matplotlib...). Les erreurs de résolution sont ignorées ici :
    // un import impossible ressortira comme une vraie erreur Python à l'exécution.
    try {
      await pyodide.loadPackagesFromImports(code, {
        messageCallback: () => {},
        errorCallback: () => {},
      });
    } catch (e) {
      // Import non résolu : signalé par Python lui même à l'exécution.
    }

    envoyer("statut", { etat: "execution" });
    await pyodide.runPythonAsync(code, { globals });
    pyodide.runPython("sys.stdout.flush(); sys.stderr.flush()");

    const figures = JSON.parse(pyodide.runPython("_figures_png()", { globals: pyodide.globals }));
    figures.forEach((base64) => envoyer("image", { base64 }));
    envoyer("fin", {});
  } catch (erreur) {
    try {
      pyodide.runPython("sys.stdout.flush(); sys.stderr.flush()");
    } catch (e) {
      // Rien de plus à récupérer.
    }
    envoyer("erreur", { texte: nettoyerTraceback(erreur && erreur.message ? erreur.message : erreur) });
  } finally {
    globals.destroy();
  }
};
