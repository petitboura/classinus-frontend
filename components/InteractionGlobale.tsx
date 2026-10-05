"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useSelectedLayoutSegments } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ContexteChat, useFournirContexteChat } from "@/lib/contexteChat";
import { ContexteRetour, useFournirContexteRetour } from "@/lib/contexteRetour";
import { ContexteCurseurVirtuel, enregistrerDeplacementCurseur, useFournirCurseurVirtuel } from "@/lib/contexteCurseurVirtuel";
import { ContexteCanalEnDirect, enregistrerCanalEnDirect, useFournirCanalEnDirect } from "@/lib/contexteCanalEnDirect";
import { ContexteVoixDirecte, useFournirVoixDirecte } from "@/lib/contexteVoixDirecte";
import { CurseurVirtuelAgent } from "@/components/CurseurVirtuelAgent";
import { BulleDialogueAgent } from "@/components/BulleDialogueAgent";
import { VoixDirecteSuperposition } from "@/components/voix/VoixDirecteSuperposition";
import { CanalEnDirectFlottant } from "@/components/CanalEnDirectFlottant";
import { PontMessageCanalVersChat } from "@/components/PontMessageCanalVersChat";
import { useEmetteurSuperposition, surElectron } from "@/lib/superpositionElectron";

// Une seule session, sous le layout racine : ouvrir /decouvrir ne démonte
// plus le canal, la voix ou leurs contextes. La navigation propre à
// l'application reste dans AppShell.
//
// Exception : la fenêtre de superposition Electron (app/agent-superposition,
// canal en direct sur PC) ne monte JAMAIS ces vraies sessions. Elle fournit
// elle-même un miroir d'état alimenté par la fenêtre principale (voir
// app/agent-superposition/page.tsx) : y monter aussi les vraies valeurs ferait
// émettre à la superposition un état vide vers elle-même.
export function InteractionGlobale({ children }: { children: ReactNode }) {
  const segments = useSelectedLayoutSegments();
  if (segments[0] === "agent-superposition") return <>{children}</>;
  return <InteractionGlobaleSession>{children}</InteractionGlobaleSession>;
}

function InteractionGlobaleSession({ children }: { children: ReactNode }) {
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
  // Sur Electron (canal en direct sur PC, 28/09/2026), le curseur, la bulle et le
  // bouton du canal ne se montent JAMAIS ici : c'est la fenetre de superposition
  // (app/agent-superposition/page.tsx, voir electron/main.ts) qui les affiche, en
  // une seule instance, par dessus l'appli ET le reste du bureau, seulement quand
  // le canal est actif. Les monter aussi ici les aurait dupliques. Detection
  // differee (la plateforme n'est connue que cote client, un state initial a false
  // evite un decalage serveur/navigateur a l'hydratation).
  const [surElectronClient, setSurElectronClient] = useState(false);

  useEffect(() => {
    setMonte(true);
    setSurElectronClient(surElectron());
  }, []);
  useEffect(() => { enregistrerCanalEnDirect(canal); }, [canal]);
  useEffect(() => {
    enregistrerDeplacementCurseur(curseur.deplacerVers);
  }, [curseur.deplacerVers]);
  const { afficher, masquer } = curseur;
  useEffect(() => {
    if (canal.actif) afficher();
    else masquer();
  }, [canal.actif, afficher, masquer]);
  // Lot R (27/09/2026, voir plan-canal-en-direct-pc.md) : pousse l'etat du curseur,
  // du canal et de la voix vers la fenetre de superposition Electron (ne fait rien
  // ailleurs que sur la plateforme "electron", voir lib/superpositionElectron.ts).
  useEmetteurSuperposition(curseur, canal, voix);

  // Changement de compte (déconnexion sans rechargement de page, connexion,
  // changement d'utilisateur) : la session de voix et le canal en cours
  // appartiennent à l'ancien compte, on les coupe. Avant ce niveau racine,
  // quitter l'application démontait tout et produisait le même résultat.
  // Un simple rafraîchissement de jeton ne change pas l'identifiant et ne
  // coupe donc rien.
  const coupureRef = useRef({ fermerVoix: voix.fermer, desactiverCanal: canal.desactiver });
  coupureRef.current = { fermerVoix: voix.fermer, desactiverCanal: canal.desactiver };
  useEffect(() => {
    let annule = false;
    let uidCourant: string | null | undefined;
    const surSession = (uid: string | null) => {
      if (annule) return;
      if (uidCourant === undefined) {
        uidCourant = uid;
        return;
      }
      if (uid === uidCourant) return;
      uidCourant = uid;
      coupureRef.current.fermerVoix();
      coupureRef.current.desactiverCanal();
    };
    supabase.auth
      .getSession()
      .then(({ data }) => surSession(data.session?.user.id ?? null))
      .catch(() => {});
    const { data: abonnement } = supabase.auth.onAuthStateChange((_evenement, session) => {
      surSession(session?.user.id ?? null);
    });
    return () => {
      annule = true;
      abonnement.subscription.unsubscribe();
    };
  }, []);

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
                  {!surElectronClient && <CurseurVirtuelAgent />}
                  {!surElectronClient && <BulleDialogueAgent />}
                  <VoixDirecteSuperposition />
                  {!surElectronClient && afficherCommandes && <CanalEnDirectFlottant />}
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
