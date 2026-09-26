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

// Prépare input() pour une exécution donnée (24/09/2026, demande Bourama :
// pouvoir répondre pendant l'exécution, comme dans Thonny).
//
// interactif=true (téléphone compatible JSPI, voir jspiDisponible côté
// lib/executionPython.ts) : chaque input() suspend vraiment le code Python
// en cours -- pas de nouveau thread, la pause se passe entièrement dans
// cette exécution -- et n'envoie sa réponse qu'au réveil.
//
// interactif=false : les réponses ont déjà été demandées à l'étudiant AVANT
// de lancer le code (voir useExecutionPython.ts) ; input() les distribue
// dans l'ordre depuis cette liste.
const PREPARER_ENTREE_INTERACTIVE = `
import builtins
from pyodide.ffi import run_sync

async def _entree_coro(invite):
    return await _demander_entree_js(invite)

def _entree_interactive(invite=""):
    return run_sync(_entree_coro(invite))

builtins.input = _entree_interactive
`;

const PREPARER_ENTREE_PREALABLE = `
import builtins
_file_entrees_prealables = list(_valeurs_entrees_js)

def _entree_prealable(invite=""):
    if _file_entrees_prealables:
        return _file_entrees_prealables.pop(0)
    raise EOFError("Il n'y a plus de valeur disponible pour input().")

builtins.input = _entree_prealable
`;

// sys.argv (26/09/2026, bug remonté par Bourama) : ce worker n'est jamais
// lancé depuis une vraie ligne de commande, donc sys.argv est vide par
// défaut -- un script qui lit sys.argv[1] plante avec IndexError avant
// même d'afficher quoi que ce soit. _valeurs_argv_js contient les
// valeurs demandées d'avance à l'étudiant (voir detecterArgv côté
// useExecutionPython.ts) ; argv[0] reste un nom de script arbitraire,
// comme une vraie ligne de commande.
const PREPARER_ARGV = `
import sys
sys.argv = ["script.py"] + list(_valeurs_argv_js)
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
  const donnees = evenement.data;

  // Réponse à une demande de saisie interactive en cours (voir
  // _demanderEntreeJs plus bas) : ne fait que débloquer la promesse en
  // attente, ne relance pas d'exécution.
  if (donnees.type === "reponse_entree") {
    const resoudre = self._enAttenteEntree?.get(donnees.id);
    if (resoudre) {
      self._enAttenteEntree.delete(donnees.id);
      resoudre(donnees.valeur);
    }
    return;
  }

  const { id, code, interactif, entreesPrealables, argv } = donnees;
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
    globals.set("_valeurs_argv_js", argv || []);
    pyodide.runPython(PREPARER_ARGV, { globals });

    if (interactif) {
      if (!self._enAttenteEntree) self._enAttenteEntree = new Map();
      self._demanderEntreeJs = (invite) =>
        new Promise((resoudre) => {
          self._enAttenteEntree.set(id, resoudre);
          envoyer("entree_demandee", { invite });
        });
      globals.set("_demander_entree_js", self._demanderEntreeJs);
      pyodide.runPython(PREPARER_ENTREE_INTERACTIVE, { globals });
    } else {
      globals.set("_valeurs_entrees_js", entreesPrealables || []);
      pyodide.runPython(PREPARER_ENTREE_PREALABLE, { globals });
    }

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
    // runPythonAsync (et non runPython) : nécessaire pour que run_sync
    // (input() interactif, voir PREPARER_ENTREE_INTERACTIVE) puisse
    // suspendre le code en cours d'exécution.
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
    self._enAttenteEntree?.delete(id);
    globals.destroy();
  }
};
