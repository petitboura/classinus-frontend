"use client";

import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { FolderOpen, Play, Save, Square } from "lucide-react";
import { EXTENSION_PAR_LANGAGE, LANGAGES_PYTHON } from "@/components/chat/BlocCode";
import { FormulaireValeursPrealables, SortieExecutionCode } from "@/components/chat/SortieExecutionCode";
import { useExecutionPython } from "@/lib/useExecutionPython";
import { useTheme } from "@/lib/useTheme";
import { detecterLangage, extensionsLangage, LANGAGES_EDITEUR } from "@/lib/langagesEditeur";
import type { FichierBibliothequePersonnelle } from "@/lib/api";
import { DialogueOuvrirEditeur } from "./DialogueOuvrirEditeur";
import { DialogueEnregistrerEditeur } from "./DialogueEnregistrerEditeur";

// 26/09/2026, chantier "éditeur de code du Bureau" (demande Bourama :
// un éditeur type Thonny, dont la bibliothèque privée joue le rôle
// d'explorateur de fichiers -- pas de panneau explorateur intégré,
// exactement comme Thonny lui-même n'en a pas). Étape A du découpage en
// 3 chantiers parallèles (voir /areas/bibliotheque-code-clovis.md côté
// mémoire) : cette page ne dépend d'aucune des deux autres (ponts chat,
// traduction des erreurs) pour fonctionner seule.
//
// Contrat sessionStorage avec le futur pont chat -> éditeur (chantier B,
// pas encore construit) : la clé "classinus:editeur:payload" contient
// { code, langage, origineConversationId?, origineMessageId?,
// origineFichierId? } -- lue une seule fois au montage puis vidée. Tant
// que B n'existe pas, cette clé n'est jamais écrite : le comportement par
// défaut (éditeur vide) est inchangé.
const CLE_SESSION_PAYLOAD = "classinus:editeur:payload";

type PayloadEditeur = { code: string; langage: string };

function lirePayloadSession(): PayloadEditeur | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = window.sessionStorage.getItem(CLE_SESSION_PAYLOAD);
    if (!brut) return null;
    window.sessionStorage.removeItem(CLE_SESSION_PAYLOAD);
    const payload = JSON.parse(brut) as Partial<PayloadEditeur>;
    if (typeof payload.code !== "string") return null;
    return { code: payload.code, langage: typeof payload.langage === "string" ? payload.langage : "python" };
  } catch {
    return null;
  }
}

export function EditeurCode() {
  const [code, setCode] = useState("");
  const [langage, setLangage] = useState("python");
  const [nomFichierOuvert, setNomFichierOuvert] = useState<string | null>(null);
  const [dialogueOuvrirVisible, setDialogueOuvrirVisible] = useState(false);
  const [dialogueEnregistrerVisible, setDialogueEnregistrerVisible] = useState(false);
  const [messageEnregistre, setMessageEnregistre] = useState<string | null>(null);
  const { resolu } = useTheme();

  useEffect(() => {
    const payload = lirePayloadSession();
    if (payload) {
      setCode(payload.code);
      setLangage(payload.langage);
    }
  }, []);

  useEffect(() => {
    if (!messageEnregistre) return;
    const delai = setTimeout(() => setMessageEnregistre(null), 2500);
    return () => clearTimeout(delai);
  }, [messageEnregistre]);

  const executable = LANGAGES_PYTHON.has(langage);
  const execution = useExecutionPython(code);
  const extensionsCodeMirror = useMemo(() => extensionsLangage(langage), [langage]);

  function ouvrirFichier(fichier: FichierBibliothequePersonnelle, contenu: string) {
    setCode(contenu);
    setLangage(detecterLangage(fichier.nom_fichier));
    const sansExtension = fichier.nom_fichier.replace(/\.[^./]+$/, "");
    setNomFichierOuvert(sansExtension);
    setDialogueOuvrirVisible(false);
  }

  function apresEnregistrement(fichier: FichierBibliothequePersonnelle) {
    const sansExtension = fichier.nom_fichier.replace(/\.[^./]+$/, "");
    setNomFichierOuvert(sansExtension);
    setDialogueEnregistrerVisible(false);
    setMessageEnregistre(`Enregistré dans la bibliothèque sous « ${fichier.nom_fichier} ».`);
  }

  const sortieExecution = executable ? (
    execution.invitesPrealables ? (
      <FormulaireValeursPrealables
        invites={execution.invitesPrealables}
        onValider={execution.lancerAvecValeursPrealables}
        onAnnuler={execution.annulerValeursPrealables}
      />
    ) : (
      <SortieExecutionCode
        etat={execution.etat}
        lignes={execution.lignes}
        images={execution.images}
        erreur={execution.erreur}
        inviteSaisie={execution.inviteSaisie}
        enCours={execution.enCours}
        onRepondreSaisie={execution.repondreSaisie}
        onEffacer={execution.effacer}
      />
    )
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2">
        <select
          value={langage}
          onChange={(e) => setLangage(e.target.value)}
          className="rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs text-dj-texte"
        >
          {LANGAGES_EDITEUR.map((l) => (
            <option key={l.valeur} value={l.valeur}>
              {l.libelle}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          {executable && (
            <button
              onClick={execution.enCours ? execution.arreter : execution.executer}
              className="flex items-center gap-1.5 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs font-medium text-dj-accent-1-texte transition-colors hover:opacity-80"
            >
              {execution.enCours ? <Square size={13} /> : <Play size={13} />}
              {execution.enCours ? "Arrêter" : "Exécuter"}
            </button>
          )}
          <button
            onClick={() => setDialogueOuvrirVisible(true)}
            className="flex items-center gap-1.5 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <FolderOpen size={13} /> Ouvrir
          </button>
          <button
            onClick={() => setDialogueEnregistrerVisible(true)}
            className="flex items-center gap-1.5 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
          >
            <Save size={13} /> Enregistrer
          </button>
        </div>
      </div>

      {messageEnregistre && (
        <p className="animate-dj-fade-in-rapide rounded-lg bg-dj-accent-1-conteneur px-3 py-1.5 text-xs text-dj-accent-1-texte">
          {messageEnregistre}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-dj-bordure">
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={extensionsCodeMirror}
          theme={resolu === "sombre" ? vscodeDark : vscodeLight}
          basicSetup={{ foldGutter: true, autocompletion: true }}
          className="text-[13px]"
          minHeight="45vh"
        />
      </div>

      {sortieExecution}

      {dialogueOuvrirVisible && (
        <DialogueOuvrirEditeur onChoisir={ouvrirFichier} onFermer={() => setDialogueOuvrirVisible(false)} />
      )}
      {dialogueEnregistrerVisible && (
        <DialogueEnregistrerEditeur
          nomParDefaut={nomFichierOuvert || "code"}
          extension={EXTENSION_PAR_LANGAGE[langage] || "txt"}
          contenu={code}
          onEnregistre={apresEnregistrement}
          onFermer={() => setDialogueEnregistrerVisible(false)}
        />
      )}
    </div>
  );
}
