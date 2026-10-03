"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSelectedLayoutSegments } from "next/navigation";
import { ContexteChat, useFournirContexteChat } from "@/lib/contexteChat";
import { ContexteRetour, useFournirContexteRetour } from "@/lib/contexteRetour";
import { ContexteCurseurVirtuel, enregistrerDeplacementCurseur, useFournirCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";
import { ContexteCanalEnDirect, enregistrerCanalEnDirect, useFournirCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteVoixDirecte, useFournirVoixDirecte } from "@/lib/contexteVoixDirecte";
import { CurseurVirtuelAgent } from "@/components/CurseurVirtuelAgent";
import { BulleDialogueAgent } from "@/components/BulleDialogueAgent";
import { VoixDirecteSuperposition } from "@/components/voix/VoixDirecteSuperposition";
import { BoutonJournalAgent } from "@/components/BoutonJournalAgent";
import { CanalEnDirectFlottant } from "@/components/CanalEnDirectFlottant";
import { PontMessageCanalVersChat } from "@/components/PontMessageCanalVersChat";

// Une seule session, sous le layout racine : ouvrir /decouvrir ne démonte
// plus le canal, la voix ou leurs contextes. La navigation propre à
// l'application reste dans AppShell.
export function InteractionGlobale({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  const retour = useFournirContexteRetour();
  const chat = useFournirContexteChat();
  const curseur = useFournirCurseurVirtuel();
  const canal = useFournirCanalEnDirect();
  const voix = useFournirVoixDirecte({
    chatPretPourVoix: chat.chatPretPourVoix,
    deposerDemandeVoix: chat.deposerDemandeVoix,
  });
  const [monte, setMonte] = useState(false);

  useEffect(() => { setMonte(true); }, []);
  useEffect(() => { enregistrerCanalEnDirect(canal); }, [canal]);
  useEffect(() => {
    enregistrerDeplacementCurseur(curseur.deplacerVers);
  }, [curseur.deplacerVers]);
  const { afficher, masquer } = curseur;
  useEffect(() => {
    if (canal.actif) afficher();
    else masquer();
  }, [canal.actif, afficher, masquer]);

  const afficherCommandes = segments.includes("(app)") || segments[0] === "decouvrir" || canal.actif;

  return (
    <ContexteRetour.Provider value={retour}>
      <ContexteChat.Provider value={chat}>
        <ContexteCurseurVirtuel.Provider value={curseur}>
          <ContexteCanalEnDirect.Provider value={canal}>
            <ContexteVoixDirecte.Provider value={voix}>
              {children}
              <PontMessageCanalVersChat />
              {monte && createPortal(
                <>
                  <CurseurVirtuelAgent />
                  <BulleDialogueAgent />
                  <VoixDirecteSuperposition />
                  {afficherCommandes && <BoutonJournalAgent />}
                  {afficherCommandes && <CanalEnDirectFlottant />}
                </>,
                document.body,
              )}
            </ContexteVoixDirecte.Provider>
          </ContexteCanalEnDirect.Provider>
        </ContexteCurseurVirtuel.Provider>
      </ContexteChat.Provider>
    </ContexteRetour.Provider>
  );
}
