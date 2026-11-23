"use client";

// Page bambara (23/11/2026, demande de Bourama) : un bloc de texte de la réponse. Il a sa propre bulle audio (le vocal de
// ce bloc, réécoutable au clic) et, selon le réglage des paramètres, son texte replié. Le bloc dit à la page quand il
// entre dans la zone visible au défilement : c'est à ce moment que sa voix commence à lire (voir PageBambaraClient).

import { useEffect, useRef } from "react";
import type { MessageAudioBambara } from "@/lib/audioMessageBambara";
import { BulleAudioBambara } from "./BulleAudioBambara";
import { TexteReplieBambara } from "./TexteReplieBambara";

type Props = {
  /** Identifiant du bloc (lib/blocsBambara.ts, idBlocTexte) : celui de la bulle, de la lecture et de la visibilité. */
  id: string;
  texte: string;
  afficherTexte: boolean;
  /** Le vocal de ce bloc, null tant qu'il n'est pas prêt. */
  message: MessageAudioBambara | null;
  /** La bulle audio est montrée (le vocal existe, ou la voix prépare ce bloc en ce moment). */
  afficherBulle: boolean;
  direct: "attente" | "lecture";
  surArreterDirect: () => void;
  idEnLecture: string | null;
  surChangerLecture: (id: string | null) => void;
  libelleEcouter: string;
  libelleMettreEnPause: string;
  libelleDeplier: string;
  libelleReplier: string;
  surVisibilite: (id: string, visible: boolean) => void;
};

// La zone qui compte comme « à l'écran » : sans la barre du haut ni les commandes du bas, qui recouvrent la page.
const MARGES_VISIBLES = "-72px 0px -140px 0px";

export function BlocTexteBambara({
  id,
  texte,
  afficherTexte,
  message,
  afficherBulle,
  direct,
  surArreterDirect,
  idEnLecture,
  surChangerLecture,
  libelleEcouter,
  libelleMettreEnPause,
  libelleDeplier,
  libelleReplier,
  surVisibilite,
}: Props) {
  const racineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = racineRef.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      // Sans observateur (très vieux navigateur) : le bloc compte comme visible, la lecture ne reste pas bloquée.
      surVisibilite(id, true);
      return () => surVisibilite(id, false);
    }
    const observateur = new IntersectionObserver(([entree]) => surVisibilite(id, entree.isIntersecting), {
      rootMargin: MARGES_VISIBLES,
      threshold: 0.01,
    });
    observateur.observe(element);
    return () => {
      observateur.disconnect();
      surVisibilite(id, false);
    };
  }, [id, surVisibilite]);

  if (!afficherBulle && !afficherTexte) return null;
  return (
    <div ref={racineRef} className="flex w-full flex-col gap-3">
      {afficherBulle && (
        <BulleAudioBambara
          id={id}
          message={message}
          cote="gauche"
          idEnLecture={idEnLecture}
          surChangerLecture={surChangerLecture}
          libelleEcouter={libelleEcouter}
          libelleMettreEnPause={libelleMettreEnPause}
          direct={direct}
          surArreterDirect={surArreterDirect}
        />
      )}
      {afficherTexte && <TexteReplieBambara texte={texte} libelleDeplier={libelleDeplier} libelleReplier={libelleReplier} />}
    </div>
  );
}
