"use client";

import { useEffect, useMemo, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { FolderOpen, MessageCircle, Maximize2, Minimize2, Play, Save, Square } from "lucide-react";
import { EXTENSION_PAR_LANGAGE, LANGAGES_PYTHON } from "@/components/chat/BlocCode";
import { FormulaireValeursPrealables, SortieExecutionCode } from "@/components/chat/SortieExecutionCode";
import { PleinEcranApercu } from "@/components/chat/PleinEcranApercu";
import { SelectPersonnalise } from "@/components/SelectPersonnalise";
import { useExecutionPython } from "@/lib/useExecutionPython";
import { useTheme } from "@/lib/useTheme";
import { useNouvelleConversationPleinEcran, useOuvrirConversationPleinEcran } from "@/lib/contexteChat";
import { detecterLangage, extensionsLangage, LANGAGES_EDITEUR } from "@/lib/langagesEditeur";
import { extensionsAgentEditeur } from "@/lib/operationsEditeurAgent";
import { usePontEditeurAgent } from "@/lib/usePontEditeurAgent";
import type { FichierBibliothequePersonnelle } from "@/lib/api";
import { DialogueOuvrirEditeur } from "./DialogueOuvrirEditeur";
import { DialogueEnregistrerEditeur } from "./DialogueEnregistrerEditeur";
import { DialogueRetourChat } from "./DialogueRetourChat";

// 26-27/09/2026, chantier "éditeur de code du Bureau" (demande Bourama :
// un éditeur type Thonny, dont la bibliothèque privée joue le rôle
// d'explorateur de fichiers -- pas de panneau explorateur intégré,
// exactement comme Thonny lui-même n'en a pas). Chantiers A (cette page)
// et B (pont chat <-> éditeur, BlocCode.tsx + lib/contexteChat.tsx)
// réunis ici -- seul C (traduction des messages d'erreur,
// SortieExecutionCode.tsx) reste indépendant.
// Contrat sessionStorage avec le pont chat -> éditeur (BlocCode.tsx,
// chantier B) : la clé "classinus:editeur:payload" contient { code,
// langage, origineConversationId? } -- lue une seule fois au montage
// puis vidée. Sans cette clé (éditeur ouvert directement depuis Bureau),
// comportement inchangé : éditeur vide, pas d'origine.
const CLE_SESSION_PAYLOAD = "classinus:editeur:payload";

type PayloadEditeur = { code: string; langage: string; origineConversationId: string | null };

function lirePayloadSession(): PayloadEditeur | null {
  if (typeof window === "undefined") return null;
  try {
    const brut = window.sessionStorage.getItem(CLE_SESSION_PAYLOAD);
    if (!brut) return null;
    // 27/09/2026, retour de test Bourama : le code s'affichait puis
    // disparaissait (l'éditeur est remonté une seconde fois après le
    // premier rendu, et la clé avait déjà été supprimée à la première
    // lecture). Lecture désormais NON destructive et idempotente : un
    // remontage retrouve le même code. Un horodatage évite de réappliquer
    // un vieux payload lors d'une visite ultérieure (ignoré au-delà de 30 s).
    const payload = JSON.parse(brut) as Partial<PayloadEditeur> & { horodatage?: number };
    if (typeof payload.horodatage !== "number" || Date.now() - payload.horodatage > 30000) {
      window.sessionStorage.removeItem(CLE_SESSION_PAYLOAD);
      return null;
    }
    if (typeof payload.code !== "string") return null;
    return {
      code: payload.code,
      langage: typeof payload.langage === "string" ? payload.langage : "python",
      origineConversationId: typeof payload.origineConversationId === "string" ? payload.origineConversationId : null,
    };
  } catch {
    return null;
  }
}

export function EditeurCode() {
  const [code, setCode] = useState("");
  const [langage, setLangage] = useState("python");
  const [nomFichierOuvert, setNomFichierOuvert] = useState<string | null>(null);
  const [origineConversationId, setOrigineConversationId] = useState<string | null>(null);
  const [dialogueOuvrirVisible, setDialogueOuvrirVisible] = useState(false);
  const [dialogueEnregistrerVisible, setDialogueEnregistrerVisible] = useState(false);
  const [dialogueRetourVisible, setDialogueRetourVisible] = useState(false);
  const [messageEnregistre, setMessageEnregistre] = useState<string | null>(null);
  const [pleinEcran, setPleinEcran] = useState(false);
  const { resolu } = useTheme();
  const ouvrirConversationPleinEcran = useOuvrirConversationPleinEcran();
  const nouvelleConversationPleinEcran = useNouvelleConversationPleinEcran();

  useEffect(() => {
    const payload = lirePayloadSession();
    if (payload) {
      setCode(payload.code);
      setLangage(payload.langage);
      setOrigineConversationId(payload.origineConversationId);
    }
  }, []);

  useEffect(() => {
    if (!messageEnregistre) return;
    const delai = setTimeout(() => setMessageEnregistre(null), 2500);
    return () => clearTimeout(delai);
  }, [messageEnregistre]);

  const executable = LANGAGES_PYTHON.has(langage);
  const execution = useExecutionPython(code);
  const extensionsCodeMirror = useMemo(() => [...extensionsLangage(langage), ...extensionsAgentEditeur], [langage]);
  // 28/09/2026 : l'IA lit, montre et écrit dans l'éditeur via le canal en direct.
  const surCreationEditeur = usePontEditeurAgent({
    langage,
    nomFichier: nomFichierOuvert,
    pleinEcran,
    lignesSortie: execution.lignes,
    erreurExecution: execution.erreur,
  });

  function ouvrirFichier(fichier: FichierBibliothequePersonnelle, contenu: string) {
    setCode(contenu);
    setLangage(detecterLangage(fichier.nom_fichier));
    const sansExtension = fichier.nom_fichier.replace(/\.[^./]+$/, "");
    setNomFichierOuvert(sansExtension);
    setDialogueOuvrirVisible(false);
  }

  function importerFichierLocal(nomFichier: string, contenu: string) {
    setCode(contenu);
    setLangage(detecterLangage(nomFichier));
    setNomFichierOuvert(nomFichier.replace(/\.[^./]+$/, ""));
    setDialogueOuvrirVisible(false);
  }

  function apresEnregistrement(fichier: FichierBibliothequePersonnelle) {
    const sansExtension = fichier.nom_fichier.replace(/\.[^./]+$/, "");
    setNomFichierOuvert(sansExtension);
    setDialogueEnregistrerVisible(false);
    setMessageEnregistre(`Enregistré dans la bibliothèque sous « ${fichier.nom_fichier} ».`);
  }

  // 27/09/2026, chantier "pont retour éditeur -> chat" (demande Bourama) :
  // choix seulement si une conversation d'origine existe (code ouvert
  // depuis un bloc du chat) -- sinon (écrit direct dans l'éditeur, ou
  // ouvert depuis la bibliothèque) toujours une nouvelle conversation,
  // sans demander.
  const codeEnBlocMarkdown = `\`\`\`${langage}\n${code}\n\`\`\``;

  function versLeChat() {
    if (origineConversationId) setDialogueRetourVisible(true);
    else nouvelleConversationPleinEcran(codeEnBlocMarkdown);
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

  // 27/09/2026, demande Bourama (retour de test) : un bouton pour mettre
  // l'éditeur lui-même en plein écran (au-delà du plein écran d'un bloc
  // de code isolé côté chat, voir BlocCode.tsx) -- réutilise le même
  // composant PleinEcranApercu que le reste du dépôt plutôt qu'une
  // implémentation maison.
  const boutonsBarre = (
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
      <button
        onClick={versLeChat}
        className="flex items-center gap-1.5 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        <MessageCircle size={13} /> Vers le chat
      </button>
      <button
        onClick={() => setPleinEcran((v) => !v)}
        aria-label={pleinEcran ? "Rétrécir" : "Agrandir l'éditeur"}
        className="flex items-center gap-1.5 rounded-lg border border-dj-bordure bg-dj-surface-haute px-2.5 py-1.5 text-xs text-dj-texte-muet transition-colors hover:text-dj-texte"
      >
        {pleinEcran ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
      </button>
    </div>
  );

  const barreOutils = (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dj-bordure bg-dj-surface px-3 py-2">
      <div className="w-36">
        <SelectPersonnalise
          options={LANGAGES_EDITEUR.map((l) => ({ id: l.valeur, label: l.libelle }))}
          valeur={langage}
          onChange={setLangage}
        />
      </div>
      {boutonsBarre}
    </div>
  );

  const zoneEditeur = (
    <>
      {!pleinEcran && barreOutils}

      {messageEnregistre && (
        <p className="animate-dj-fade-in-rapide rounded-lg bg-dj-accent-1-conteneur px-3 py-1.5 text-xs text-dj-accent-1-texte">
          {messageEnregistre}
        </p>
      )}

      <div
        className={`overflow-hidden rounded-xl border border-dj-bordure ${
          pleinEcran ? "min-h-[12rem] flex-1" : ""
        }`}
      >
        <CodeMirror
          value={code}
          onChange={setCode}
          extensions={extensionsCodeMirror}
          onCreateEditor={surCreationEditeur}
          theme={resolu === "sombre" ? vscodeDark : vscodeLight}
          basicSetup={{ foldGutter: true, autocompletion: true }}
          className={pleinEcran ? "h-full text-[13px]" : "text-[13px]"}
          height={pleinEcran ? "100%" : undefined}
          minHeight={pleinEcran ? undefined : "45vh"}
        />
      </div>

      {pleinEcran ? (
        <div className="max-h-[45%] flex-shrink-0 overflow-auto">{sortieExecution}</div>
      ) : (
        sortieExecution
      )}
    </>
  );

  const dialogues = (
    <>
      {dialogueOuvrirVisible && (
        <DialogueOuvrirEditeur
          onChoisir={ouvrirFichier}
          onImporterLocal={importerFichierLocal}
          onFermer={() => setDialogueOuvrirVisible(false)}
        />
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
      {dialogueRetourVisible && (
        <DialogueRetourChat
          onOrigine={() => ouvrirConversationPleinEcran(origineConversationId, codeEnBlocMarkdown)}
          onNouvelle={() => nouvelleConversationPleinEcran(codeEnBlocMarkdown)}
          onFermer={() => setDialogueRetourVisible(false)}
        />
      )}
    </>
  );

  if (pleinEcran) {
    return (
      <PleinEcranApercu
        titre="Éditeur de code"
        onFerme={() => setPleinEcran(false)}
        entete={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="w-36">
              <SelectPersonnalise
                options={LANGAGES_EDITEUR.map((l) => ({ id: l.valeur, label: l.libelle }))}
                valeur={langage}
                onChange={setLangage}
              />
            </div>
            {boutonsBarre}
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">{zoneEditeur}</div>
        {dialogues}
      </PleinEcranApercu>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {zoneEditeur}
      {dialogues}
    </div>
  );
}
